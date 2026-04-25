// Sync TikTok metrics for posted slideshows via Apify.
// Input: { posted_slideshow_id?: string } | { user_id?: string, sync_all_pending?: boolean }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const j = (b: any, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

interface Body {
  posted_slideshow_id?: string;
  user_id?: string;
  sync_all_pending?: boolean;
}

const APIFY_ACTOR = 'clockworks~free-tiktok-scraper';

async function fetchTikTokViaApify(apifyKey: string, opts: { postUrl?: string; handle: string }) {
  const input: any = opts.postUrl
    ? { postURLs: [opts.postUrl], resultsPerPage: 1 }
    : { profiles: [opts.handle], resultsPerPage: 20 };

  const startRes = await fetch(`https://api.apify.com/v2/acts/${APIFY_ACTOR}/runs?token=${apifyKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!startRes.ok) throw new Error(`Apify start failed: ${startRes.status}`);
  const startData = await startRes.json();
  const runId = startData.data?.id;
  if (!runId) throw new Error('No run id from Apify');

  // Poll
  for (let attempts = 0; attempts < 30; attempts++) {
    await new Promise((r) => setTimeout(r, 3000));
    const sRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apifyKey}`);
    const s = await sRes.json();
    const st = s.data?.status;
    if (st === 'SUCCEEDED') {
      const dRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apifyKey}`);
      return await dRes.json();
    }
    if (st === 'FAILED' || st === 'ABORTED' || st === 'TIMED-OUT') {
      throw new Error(`Apify run ${st}`);
    }
  }
  throw new Error('Apify timeout');
}

function calcEngagement(views: number, likes: number, comments: number, shares: number): number {
  if (!views) return 0;
  return ((likes + comments + shares) / views) * 100;
}

function calcPerformanceScore(metrics: { views: number; engagement_rate: number }, averages: { avgViews: number; avgEng: number }): number {
  const viewScore = averages.avgViews > 0 ? Math.min((metrics.views / averages.avgViews) * 50, 100) : 50;
  const engScore = averages.avgEng > 0 ? Math.min((metrics.engagement_rate / averages.avgEng) * 50, 100) : 50;
  return viewScore * 0.4 + engScore * 0.6;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const apifyKey = Deno.env.get('APIFY_API_KEY');

    const admin = createClient(supabaseUrl, serviceKey);

    // Caller identity (cron uses service-role direct call without auth header)
    let callerUserId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader && !authHeader.includes(serviceKey)) {
      const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
      const { data: { user } } = await userClient.auth.getUser();
      callerUserId = user?.id || null;
    }

    const body = (await req.json().catch(() => ({}))) as Body;

    // Decide which posted_slideshows to sync
    let query = admin.from('posted_slideshows').select('*');
    if (body.posted_slideshow_id) {
      query = query.eq('id', body.posted_slideshow_id);
    } else if (body.sync_all_pending) {
      const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      query = query.or(`sync_status.eq.pending,last_synced_at.lt.${cutoff}`);
      if (callerUserId) query = query.eq('user_id', callerUserId);
      else if (body.user_id) query = query.eq('user_id', body.user_id);
    } else if (body.user_id) {
      query = query.eq('user_id', body.user_id);
    } else if (callerUserId) {
      query = query.eq('user_id', callerUserId).eq('sync_status', 'pending');
    } else {
      return j({ error: 'no_target' }, 400);
    }

    const { data: targets, error: tErr } = await query;
    if (tErr) throw tErr;
    if (!targets || targets.length === 0) return j({ synced: 0, message: 'nothing to sync' });

    if (!apifyKey) {
      // Mark all pending as failed-with-reason so UI can explain
      return j({ error: 'apify_key_missing', synced: 0, pending: targets.length });
    }

    // Authorize per row when called by user
    const filtered = callerUserId ? targets.filter((t: any) => t.user_id === callerUserId) : targets;

    let syncedCount = 0;
    const errors: any[] = [];

    // Group by handle to minimize Apify calls when no specific URL
    const byHandle: Record<string, any[]> = {};
    for (const t of filtered) {
      if (t.tiktok_post_url) {
        // direct URL
        try {
          const items = await fetchTikTokViaApify(apifyKey, { postUrl: t.tiktok_post_url, handle: t.tiktok_handle });
          await processItems(admin, t, items);
          syncedCount++;
        } catch (e: any) {
          await admin.from('posted_slideshows').update({ sync_status: 'failed', last_synced_at: new Date().toISOString() }).eq('id', t.id);
          errors.push({ id: t.id, err: e.message });
        }
      } else {
        const h = t.tiktok_handle;
        (byHandle[h] = byHandle[h] || []).push(t);
      }
    }

    for (const [handle, posts] of Object.entries(byHandle)) {
      try {
        const items = await fetchTikTokViaApify(apifyKey, { handle });
        for (const t of posts) {
          // Match the posted item to the closest post by date
          const postedTime = new Date(t.posted_at).getTime();
          let best: any = null;
          let bestDiff = Infinity;
          for (const it of (items || [])) {
            const ts = (it.createTimeISO ? new Date(it.createTimeISO).getTime() : (it.createTime ? it.createTime * 1000 : 0));
            if (!ts) continue;
            const diff = Math.abs(ts - postedTime);
            if (diff < bestDiff) { bestDiff = diff; best = it; }
          }
          if (!best) {
            await admin.from('posted_slideshows').update({ sync_status: 'insufficient_data', last_synced_at: new Date().toISOString() }).eq('id', t.id);
            continue;
          }
          await processItems(admin, t, [best]);
          syncedCount++;
        }
      } catch (e: any) {
        for (const t of posts) {
          await admin.from('posted_slideshows').update({ sync_status: 'failed', last_synced_at: new Date().toISOString() }).eq('id', t.id);
          errors.push({ id: t.id, err: e.message });
        }
      }
    }

    return j({ synced: syncedCount, errors });
  } catch (e: any) {
    console.error('sync-tiktok-metrics error', e);
    return j({ error: e.message || 'failed' }, 500);
  }
});

async function processItems(admin: any, posted: any, items: any[]) {
  const it = (items || [])[0];
  if (!it) {
    await admin.from('posted_slideshows').update({ sync_status: 'insufficient_data', last_synced_at: new Date().toISOString() }).eq('id', posted.id);
    return;
  }
  const stats = it.stats || it;
  const views = Number(stats.playCount ?? stats.views ?? it.playCount ?? 0);
  const likes = Number(stats.diggCount ?? stats.likes ?? it.diggCount ?? 0);
  const comments = Number(stats.commentCount ?? stats.comments ?? 0);
  const shares = Number(stats.shareCount ?? stats.shares ?? 0);
  const engagement_rate = calcEngagement(views, likes, comments, shares);

  // Compute per-user averages excluding this post
  const { data: userMetrics } = await admin.from('post_metrics').select('views, engagement_rate').eq('user_id', posted.user_id);
  const others = (userMetrics || []);
  const avgViews = others.length ? others.reduce((s: number, m: any) => s + Number(m.views || 0), 0) / others.length : views || 1;
  const avgEng = others.length ? others.reduce((s: number, m: any) => s + Number(m.engagement_rate || 0), 0) / others.length : engagement_rate || 1;
  const performance_score = calcPerformanceScore({ views, engagement_rate }, { avgViews, avgEng });

  // Upsert metrics
  const { data: existing } = await admin.from('post_metrics').select('id').eq('posted_slideshow_id', posted.id).maybeSingle();
  if (existing) {
    await admin.from('post_metrics').update({
      views, likes, comments, shares, engagement_rate, performance_score, fetched_at: new Date().toISOString(), raw_apify_data: it,
    }).eq('id', existing.id);
  } else {
    await admin.from('post_metrics').insert({
      posted_slideshow_id: posted.id, user_id: posted.user_id,
      views, likes, comments, shares, engagement_rate, performance_score, raw_apify_data: it,
    });
  }
  await admin.from('posted_slideshows').update({ sync_status: 'synced', last_synced_at: new Date().toISOString() }).eq('id', posted.id);
}
