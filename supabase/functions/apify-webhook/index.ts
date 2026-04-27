// Receives Apify webhook callbacks when a TikTok scrape run completes.
// Apify sends a payloadTemplate that includes our posted_slideshow_id so we
// can attribute results without polling.
//
// Expected body shape (from our payloadTemplate):
// {
//   "eventType": "ACTOR.RUN.SUCCEEDED" | "ACTOR.RUN.FAILED" | ...,
//   "runId": "abc123",
//   "datasetId": "xyz789",
//   "secret": "<APIFY_WEBHOOK_SECRET>",
//   "userData": { "posted_slideshow_id": "uuid", "match_mode": "url" | "handle", "posted_at": "iso" }
// }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const j = (b: any, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

function calcEngagement(views: number, likes: number, comments: number, shares: number): number {
  if (!views) return 0;
  return ((likes + comments + shares) / views) * 100;
}

function calcPerformanceScore(
  metrics: { views: number; engagement_rate: number },
  averages: { avgViews: number; avgEng: number },
): number {
  const viewScore = averages.avgViews > 0 ? Math.min((metrics.views / averages.avgViews) * 50, 100) : 50;
  const engScore = averages.avgEng > 0 ? Math.min((metrics.engagement_rate / averages.avgEng) * 50, 100) : 50;
  return viewScore * 0.4 + engScore * 0.6;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const apifyKey = Deno.env.get('APIFY_API_KEY');
    const webhookSecret = Deno.env.get('APIFY_WEBHOOK_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    console.log('apify-webhook received', JSON.stringify(body).slice(0, 500));

    // Verify the shared secret
    if (webhookSecret && body.secret !== webhookSecret) {
      console.warn('apify-webhook bad secret');
      return j({ error: 'unauthorized' }, 401);
    }

    const eventType: string = body.eventType || '';
    const runId: string | undefined = body.runId;
    const datasetId: string | undefined = body.datasetId;
    const userData = body.userData || {};
    const postedId: string | undefined = userData.posted_slideshow_id;
    const matchMode: 'url' | 'handle' = userData.match_mode === 'handle' ? 'handle' : 'url';

    if (!postedId) return j({ error: 'missing_posted_slideshow_id' }, 400);

    const { data: posted, error: pErr } = await admin
      .from('posted_slideshows')
      .select('*')
      .eq('id', postedId)
      .maybeSingle();
    if (pErr || !posted) return j({ error: 'posted_not_found' }, 404);

    if (eventType.endsWith('FAILED') || eventType.endsWith('ABORTED') || eventType.endsWith('TIMED-OUT')) {
      await admin
        .from('posted_slideshows')
        .update({ sync_status: 'failed', last_synced_at: new Date().toISOString() })
        .eq('id', postedId);
      return j({ ok: true, status: 'failed' });
    }

    if (!eventType.endsWith('SUCCEEDED')) {
      // Other lifecycle events — ignore but ack 200 so Apify doesn't retry
      return j({ ok: true, ignored: eventType });
    }

    if (!apifyKey || !datasetId) {
      await admin
        .from('posted_slideshows')
        .update({ sync_status: 'failed', last_synced_at: new Date().toISOString() })
        .eq('id', postedId);
      return j({ error: 'missing_dataset_or_key' }, 500);
    }

    // Fetch dataset items
    const dRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyKey}&clean=true`);
    if (!dRes.ok) {
      await admin
        .from('posted_slideshows')
        .update({ sync_status: 'failed', last_synced_at: new Date().toISOString() })
        .eq('id', postedId);
      return j({ error: 'dataset_fetch_failed', status: dRes.status }, 500);
    }
    const items: any[] = await dRes.json();

    let it: any = null;
    if (matchMode === 'url') {
      it = items[0];
    } else {
      // Pick the post nearest to posted_at
      const target = new Date(posted.posted_at).getTime();
      let best: any = null;
      let bestDiff = Infinity;
      for (const c of items) {
        const ts = c.createTimeISO
          ? new Date(c.createTimeISO).getTime()
          : c.createTime
            ? c.createTime * 1000
            : 0;
        if (!ts) continue;
        const diff = Math.abs(ts - target);
        if (diff < bestDiff) {
          bestDiff = diff;
          best = c;
        }
      }
      it = best;
    }

    if (!it) {
      await admin
        .from('posted_slideshows')
        .update({ sync_status: 'insufficient_data', last_synced_at: new Date().toISOString() })
        .eq('id', postedId);
      return j({ ok: true, status: 'insufficient_data' });
    }

    const stats = it.stats || it;
    const views = Number(stats.playCount ?? stats.views ?? it.playCount ?? 0);
    const likes = Number(stats.diggCount ?? stats.likes ?? it.diggCount ?? 0);
    const comments = Number(stats.commentCount ?? stats.comments ?? 0);
    const shares = Number(stats.shareCount ?? stats.shares ?? 0);
    const engagement_rate = calcEngagement(views, likes, comments, shares);

    const { data: userMetrics } = await admin
      .from('post_metrics')
      .select('views, engagement_rate')
      .eq('user_id', posted.user_id);
    const others = userMetrics || [];
    const avgViews = others.length
      ? others.reduce((s: number, m: any) => s + Number(m.views || 0), 0) / others.length
      : views || 1;
    const avgEng = others.length
      ? others.reduce((s: number, m: any) => s + Number(m.engagement_rate || 0), 0) / others.length
      : engagement_rate || 1;
    const performance_score = calcPerformanceScore({ views, engagement_rate }, { avgViews, avgEng });

    const { data: existing } = await admin
      .from('post_metrics')
      .select('id')
      .eq('posted_slideshow_id', postedId)
      .maybeSingle();
    if (existing) {
      await admin
        .from('post_metrics')
        .update({
          views,
          likes,
          comments,
          shares,
          engagement_rate,
          performance_score,
          fetched_at: new Date().toISOString(),
          raw_apify_data: it,
        })
        .eq('id', existing.id);
    } else {
      await admin.from('post_metrics').insert({
        posted_slideshow_id: postedId,
        user_id: posted.user_id,
        views,
        likes,
        comments,
        shares,
        engagement_rate,
        performance_score,
        raw_apify_data: it,
      });
    }

    await admin
      .from('posted_slideshows')
      .update({ sync_status: 'synced', last_synced_at: new Date().toISOString() })
      .eq('id', postedId);

    return j({ ok: true, status: 'synced', views, likes, comments, shares });
  } catch (e: any) {
    console.error('apify-webhook error', e);
    // Always 200 so Apify doesn't retry storms — log the error
    return j({ error: e.message || 'failed' }, 200);
  }
});
