// Label a single product image using Lovable AI Gateway (Gemini vision)
// Input: { imageId, signedUrl } -> writes ai_description, ai_tags, ai_palette to images row
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Body { imageId: string; signedUrl: string; }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return j({ error: 'unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableKey) return j({ error: 'LOVABLE_API_KEY missing' }, 500);

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return j({ error: 'unauthorized' }, 401);

    const body = (await req.json()) as Body;
    if (!body.imageId || !body.signedUrl) return j({ error: 'invalid body' }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    // Verify ownership
    const { data: img } = await admin.from('images').select('user_id').eq('id', body.imageId).single();
    if (!img || img.user_id !== user.id) return j({ error: 'forbidden' }, 403);

    await admin.from('images').update({ ai_status: 'processing', ai_error: null }).eq('id', body.imageId);

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${lovableKey}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a product marketing analyst. Analyze the product image and respond with strict JSON only.' },
          { role: 'user', content: [
            { type: 'text', text: 'Analyze this product image. Return JSON: { "description": string (1-2 sentences describing the product objectively), "tags": string[] (5-10 short keywords: product type, color, style, materials, mood), "palette": string[] (3-5 dominant colors as hex e.g. "#FF3B5C"), "ad_angles": string[] (3 short ad angle ideas) }' },
            { type: 'image_url', image_url: { url: body.signedUrl } },
          ]},
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      await admin.from('images').update({ ai_status: 'failed', ai_error: `${aiRes.status}: ${txt.slice(0,200)}` }).eq('id', body.imageId);
      if (aiRes.status === 429) return j({ error: 'rate_limit' }, 429);
      if (aiRes.status === 402) return j({ error: 'payment_required' }, 402);
      return j({ error: 'ai_failed', detail: txt }, 500);
    }

    const data = await aiRes.json();
    const content = data?.choices?.[0]?.message?.content || '{}';
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }

    await admin.from('images').update({
      ai_description: parsed.description || null,
      ai_tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 15) : [],
      ai_palette: parsed.palette || parsed.ad_angles ? { colors: parsed.palette || [], ad_angles: parsed.ad_angles || [] } : null,
      ai_status: 'done',
      ai_error: null,
    }).eq('id', body.imageId);

    return j({ ok: true, ...parsed });
  } catch (e: any) {
    return j({ error: e.message || 'unknown' }, 500);
  }
});

function j(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
