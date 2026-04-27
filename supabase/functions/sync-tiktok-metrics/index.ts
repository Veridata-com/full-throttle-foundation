// Triggers Apify TikTok scrape runs with a webhook callback to apify-webhook.
// Marks rows as 'syncing' immediately. Results are written by apify-webhook
// when the run completes — no polling here.
//
// Input: { posted_slideshow_id?: string } | { user_id?: string, sync_all_pending?: boolean }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const j = (b: any, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

interface Body {
  posted_slideshow_id?: string;
  user_id?: string;
  sync_all_pending?: boolean;
}

const APIFY_ACTOR = 'clockworks~free-tiktok-scraper';

async function startApifyRun(opts: {
  apifyKey: string;
  webhookUrl: string;
  webhookSecret: string;
  postedSlideshowId: string;
  postedAt: string;
  postUrl?: string;
  handle: string;
}) {
  const matchMode = opts.postUrl ? 'url' : 'handle';
  const input: any = opts.postUrl
    ? { postURLs: [opts.postUrl], resultsPerPage: 1 }
    : { profiles: [opts.handle], resultsPerPage: 20 };

  // Apify webhook with payloadTemplate — userData carries our routing info back
  const payloadTemplate = JSON.stringify({
    eventType: '{{eventType}}',
    runId: '{{resource.id}}',
    datasetId: '{{resource.defaultDatasetId}}',
    secret: opts.webhookSecret,
    userData: {
      posted_slideshow_id: opts.postedSlideshowId,
      match_mode: matchMode,
      posted_at: opts.postedAt,
    },
  });

  const webhooks = [
    {
      eventTypes: ['ACTOR.RUN.SUCCEEDED', 'ACTOR.RUN.FAILED', 'ACTOR.RUN.ABORTED', 'ACTOR.RUN.TIMED_OUT'],
      requestUrl: opts.webhookUrl,
      payloadTemplate,
    },
  ];
  // Apify expects the webhooks param as a base64-encoded JSON array on the query string
  const webhooksB64 = btoa(JSON.stringify(webhooks));

  const url =
    `https://api.apify.com/v2/acts/${APIFY_ACTOR}/runs?token=${opts.apifyKey}` +
    `&webhooks=${encodeURIComponent(webhooksB64)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Apify start failed: ${res.status} ${txt}`);
  }
  const data = await res.json();
  return data.data?.id as string | undefined;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const apifyKey = Deno.env.get('APIFY_API_KEY');
    const webhookSecret = Deno.env.get('APIFY_WEBHOOK_SECRET') || '';
    const projectId = Deno.env.get('SUPABASE_PROJECT_ID') || supabaseUrl.match(/https:\/\/([^.]+)\./)?.[1];
    const webhookUrl = `https://${projectId}.supabase.co/functions/v1/apify-webhook`;

    const admin = createClient(supabaseUrl, serviceKey);

    // Caller identity
    let callerUserId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader && !authHeader.includes(serviceKey)) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      callerUserId = user?.id || null;
    }

    const body = (await req.json().catch(() => ({}))) as Body;

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
    if (!targets || targets.length === 0) return j({ queued: 0, message: 'nothing to sync' });

    if (!apifyKey) return j({ error: 'apify_key_missing', queued: 0, pending: targets.length }, 200);

    const filtered = callerUserId ? targets.filter((t: any) => t.user_id === callerUserId) : targets;

    let queued = 0;
    const errors: any[] = [];

    for (const t of filtered) {
      try {
        await startApifyRun({
          apifyKey,
          webhookUrl,
          webhookSecret,
          postedSlideshowId: t.id,
          postedAt: t.posted_at,
          postUrl: t.tiktok_post_url || undefined,
          handle: t.tiktok_handle,
        });
        await admin
          .from('posted_slideshows')
          .update({ sync_status: 'syncing', last_synced_at: new Date().toISOString() })
          .eq('id', t.id);
        queued++;
      } catch (e: any) {
        await admin
          .from('posted_slideshows')
          .update({ sync_status: 'failed', last_synced_at: new Date().toISOString() })
          .eq('id', t.id);
        errors.push({ id: t.id, err: e.message });
      }
    }

    return j({ queued, errors, webhook_url: webhookUrl });
  } catch (e: any) {
    console.error('sync-tiktok-metrics error', e);
    return j({ error: e.message || 'failed' }, 500);
  }
});
