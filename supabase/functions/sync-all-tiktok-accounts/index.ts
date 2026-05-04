// Fan-out sync: imports posts for every tiktok_account in a given workspace
// (or all the user's enabled accounts) by invoking import-tiktok-posts in parallel.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const j = (b: any, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return j({ error: 'unauthorized' }, 401);
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    const userId = user?.id;
    if (!userId) return j({ error: 'unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const workspaceId: string | undefined = body?.workspace_id;
    const limit = Math.min(Number(body?.limit ?? 30), 50);

    const admin = createClient(supabaseUrl, serviceKey);
    let q = admin.from('tiktok_accounts').select('id, handle, workspace_id').eq('user_id', userId).eq('sync_enabled', true);
    if (workspaceId) q = q.eq('workspace_id', workspaceId);
    const { data: accounts, error } = await q;
    if (error) return j({ error: error.message }, 500);
    if (!accounts?.length) return j({ error: 'no_accounts', synced: 0 });

    // Run in parallel (capped concurrency = 5)
    const results: any[] = [];
    const chunks: typeof accounts[] = [];
    const concurrency = 5;
    for (let i = 0; i < accounts.length; i += concurrency) chunks.push(accounts.slice(i, i + concurrency));

    for (const chunk of chunks) {
      const settled = await Promise.all(chunk.map(async (a) => {
        try {
          const r = await fetch(`${supabaseUrl}/functions/v1/import-tiktok-posts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: authHeader! },
            body: JSON.stringify({ tiktok_account_id: a.id, limit }),
          });
          const data = await r.json().catch(() => ({}));
          if (!r.ok || data?.error) {
            await admin.from('tiktok_accounts').update({
              last_sync_status: 'failed',
              last_sync_error: String(data?.error || `HTTP ${r.status}`).slice(0, 200),
            }).eq('id', a.id);
          }
          return { account_id: a.id, handle: a.handle, ...data };
        } catch (e: any) {
          await admin.from('tiktok_accounts').update({ last_sync_status: 'failed', last_sync_error: e.message?.slice(0, 200) }).eq('id', a.id);
          return { account_id: a.id, handle: a.handle, error: e.message };
        }
      }));
      results.push(...settled);
    }

    const totalImported = results.reduce((s, r) => s + (Number(r.imported) || 0), 0);
    const totalUpdated = results.reduce((s, r) => s + (Number(r.updated) || 0), 0);
    const failures = results.filter((r) => r.error).length;
    return j({ accounts: results.length, imported: totalImported, updated: totalUpdated, failures, results });
  } catch (e: any) {
    console.error('sync-all-tiktok-accounts', e);
    return j({ error: e.message || 'failed' }, 500);
  }
});
