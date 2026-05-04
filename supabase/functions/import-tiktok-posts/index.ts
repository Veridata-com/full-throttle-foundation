// Scrapes the user's TikTok profile via Apify, then upserts each video as
// an auto_imported posted_slideshows row + post_metrics row. Runs synchronously
// (no webhook) because we want immediate UI feedback. Uses Apify run-sync-get-dataset-items.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const j = (b: any, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const APIFY_ACTOR = 'clockworks~free-tiktok-scraper';

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const apifyKey = Deno.env.get('APIFY_API_KEY');

    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return j({ error: 'unauthorized' }, 401);
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    const userId = user?.id;
    if (!userId) return j({ error: 'unauthorized' }, 401);

    if (!apifyKey) return j({ error: 'apify_key_missing' }, 200);

    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Number(body?.limit ?? 30), 50);

    // Resolve handle from explicit param, tiktok_account_id, or fall back to profile
    let handle = (body?.handle || '').toString().trim().replace(/^@/, '');
    let accountId: string | null = body?.tiktok_account_id || null;
    if (accountId) {
      const { data: acc } = await admin.from('tiktok_accounts').select('handle, user_id').eq('id', accountId).maybeSingle();
      if (!acc || acc.user_id !== userId) return j({ error: 'account_not_found' }, 404);
      handle = acc.handle.trim().replace(/^@/, '');
    }
    if (!handle) {
      const { data: profile } = await admin.from('profiles').select('tiktok_handle').eq('id', userId).maybeSingle();
      handle = (profile?.tiktok_handle || '').trim().replace(/^@/, '');
    }
    if (!handle) return j({ error: 'no_handle' }, 400);

    // Apify run-sync — returns dataset items directly
    const url = `https://api.apify.com/v2/acts/${APIFY_ACTOR}/run-sync-get-dataset-items?token=${apifyKey}&timeout=120`;
    const input = { profiles: [handle], resultsPerPage: limit, shouldDownloadVideos: false, shouldDownloadCovers: false };

    console.log('import-tiktok-posts: starting Apify run for', handle);
    const apifyRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!apifyRes.ok) {
      const txt = await apifyRes.text().catch(() => '');
      console.error('Apify error', apifyRes.status, txt.slice(0, 400));
      return j({ error: 'apify_failed', status: apifyRes.status, detail: txt.slice(0, 200) }, 200);
    }
    const items: any[] = await apifyRes.json();
    console.log('import-tiktok-posts: got', items.length, 'items');

    if (!items.length) return j({ imported: 0, message: 'no_posts_found' });

    // Compute averages from existing metrics for performance score
    const { data: existing } = await admin
      .from('post_metrics').select('views, engagement_rate').eq('user_id', userId);
    const baseAvgViews = existing?.length
      ? existing.reduce((s, m: any) => s + Number(m.views || 0), 0) / existing.length : 0;
    const baseAvgEng = existing?.length
      ? existing.reduce((s, m: any) => s + Number(m.engagement_rate || 0), 0) / existing.length : 0;

    let imported = 0;
    let updated = 0;
    const errors: any[] = [];

    for (const it of items) {
      try {
        const postUrl: string | undefined =
          it.webVideoUrl || it.shareUrl || (it.id ? `https://www.tiktok.com/@${handle}/video/${it.id}` : undefined);
        if (!postUrl) continue;

        const stats = it.stats || it;
        const views = Number(stats.playCount ?? stats.views ?? 0);
        const likes = Number(stats.diggCount ?? stats.likes ?? 0);
        const comments = Number(stats.commentCount ?? stats.comments ?? 0);
        const shares = Number(stats.shareCount ?? stats.shares ?? 0);
        const engagement_rate = calcEngagement(views, likes, comments, shares);

        const avgViews = baseAvgViews > 0 ? baseAvgViews : views || 1;
        const avgEng = baseAvgEng > 0 ? baseAvgEng : engagement_rate || 1;
        const performance_score = calcPerformanceScore({ views, engagement_rate }, { avgViews, avgEng });

        const postedAt = it.createTimeISO
          ? new Date(it.createTimeISO).toISOString()
          : it.createTime
            ? new Date(Number(it.createTime) * 1000).toISOString()
            : new Date().toISOString();

        const caption: string = (it.text || it.desc || '').toString();
        const hookText = caption.slice(0, 120) || 'Imported TikTok post';
        const thumbnail = it.videoMeta?.coverUrl || it.covers?.default || it.cover || null;
        const isSlideshow = Array.isArray(it.images) && it.images.length > 0;
        const slideCount = isSlideshow ? it.images.length : 1;

        // Upsert posted_slideshows by (user_id, tiktok_post_url)
        const { data: existingPost } = await admin
          .from('posted_slideshows')
          .select('id')
          .eq('user_id', userId)
          .eq('tiktok_post_url', postUrl)
          .maybeSingle();

        let postedId: string;
        if (existingPost) {
          postedId = existingPost.id;
          await admin.from('posted_slideshows').update({
            sync_status: 'synced',
            last_synced_at: new Date().toISOString(),
            caption,
            thumbnail_url: thumbnail,
          }).eq('id', postedId);
          updated++;
        } else {
          const { data: ins, error: insErr } = await admin.from('posted_slideshows').insert({
            user_id: userId,
            slideshow_id: null,
            tiktok_handle: handle,
            tiktok_post_url: postUrl,
            hook_text: hookText,
            slide_count: slideCount,
            style: isSlideshow ? 'storytelling' : 'video',
            topic: '',
            all_slide_texts: [],
            image_ids: [],
            posted_at: postedAt,
            sync_status: 'synced',
            last_synced_at: new Date().toISOString(),
            auto_imported: true,
            caption,
            thumbnail_url: thumbnail,
          }).select('id').single();
          if (insErr) { errors.push({ url: postUrl, err: insErr.message }); continue; }
          postedId = ins.id;
          imported++;
        }

        // Upsert metrics
        const { data: existingMetric } = await admin
          .from('post_metrics').select('id').eq('posted_slideshow_id', postedId).maybeSingle();
        if (existingMetric) {
          await admin.from('post_metrics').update({
            views, likes, comments, shares, engagement_rate, performance_score,
            fetched_at: new Date().toISOString(), raw_apify_data: it,
          }).eq('id', existingMetric.id);
        } else {
          await admin.from('post_metrics').insert({
            posted_slideshow_id: postedId,
            user_id: userId,
            views, likes, comments, shares, engagement_rate, performance_score,
            raw_apify_data: it,
          });
        }
      } catch (e: any) {
        errors.push({ err: e.message });
      }
    }

    return j({ imported, updated, total: items.length, errors });
  } catch (e: any) {
    console.error('import-tiktok-posts error', e);
    return j({ error: e.message || 'failed' }, 500);
  }
});
