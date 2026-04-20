// Generate a 6-slide TikTok-style slideshow from selected image labels
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Body {
  slideshowId: string;
}

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
    if (!body.slideshowId) return j({ error: 'slideshowId required' }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: slideshow, error: ssErr } = await admin
      .from('slideshows').select('*').eq('id', body.slideshowId).single();
    if (ssErr || !slideshow || slideshow.user_id !== user.id) return j({ error: 'forbidden' }, 403);

    // Plan limit check
    const { data: profile } = await admin.from('profiles').select('plan').eq('id', user.id).single();
    if (!profile || profile.plan === 'none') return j({ error: 'plan_required' }, 402);

    if (profile.plan === 'starter') {
      const periodStart = new Date();
      periodStart.setDate(1);
      const ps = periodStart.toISOString().slice(0, 10);
      const { data: usage } = await admin.from('usage').select('slideshows_generated').eq('user_id', user.id).eq('period_start', ps).maybeSingle();
      if ((usage?.slideshows_generated || 0) >= 50) return j({ error: 'quota_exceeded' }, 402);
    }

    await admin.from('slideshows').update({ status: 'generating', generation_error: null }).eq('id', body.slideshowId);

    // Fetch image context
    const { data: images } = await admin
      .from('images').select('id, ai_description, ai_tags, ai_palette, file_name')
      .in('id', slideshow.image_ids);

    const imageContext = (images || []).map((i: any, idx: number) =>
      `Image ${idx + 1}: ${i.ai_description || i.file_name || 'product photo'} — tags: ${(i.ai_tags || []).join(', ')}`
    ).join('\n');

    const prompt = `You are an expert TikTok/Reels copywriter creating a 6-slide product ad slideshow.

PRODUCT CONTEXT:
${imageContext}

CREATIVE BRIEF:
- Hook style: ${slideshow.hook_style || 'curiosity'}
- Target audience: ${slideshow.target_audience || 'general consumers'}
- Call to action: ${slideshow.cta || 'Shop now'}

Generate exactly 6 slides as JSON. Each slide gets ONE short punchy text overlay (max 8 words for hook/CTA, max 14 for value props). TikTok-native voice — direct, native, no corporate fluff.

Structure:
1. HOOK — scroll-stopping question or pattern interrupt
2-5. VALUE PROPS — four distinct benefits/features/social proof angles
6. CTA — clear action

Return JSON: { "slides": [ { "type": "hook"|"value"|"cta", "headline": string, "subtext": string|null, "image_index": number (0-${(images?.length||1)-1}) } ] }`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${lovableKey}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      await admin.from('slideshows').update({ status: 'failed', generation_error: txt.slice(0, 300) }).eq('id', body.slideshowId);
      if (aiRes.status === 429) return j({ error: 'rate_limit' }, 429);
      if (aiRes.status === 402) return j({ error: 'payment_required' }, 402);
      return j({ error: 'ai_failed' }, 500);
    }

    const data = await aiRes.json();
    const content = data?.choices?.[0]?.message?.content || '{}';
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch {}

    const rawSlides = Array.isArray(parsed.slides) ? parsed.slides.slice(0, 6) : [];
    const imageIds: string[] = slideshow.image_ids || [];

    const slides = rawSlides.map((s: any, idx: number) => ({
      id: crypto.randomUUID(),
      type: s.type || (idx === 0 ? 'hook' : idx === 5 ? 'cta' : 'value'),
      headline: String(s.headline || '').slice(0, 120),
      subtext: s.subtext ? String(s.subtext).slice(0, 200) : null,
      image_id: imageIds[Math.min(s.image_index || 0, imageIds.length - 1)] || imageIds[0],
      // Default text layout (centered headline near top, subtext below)
      layout: {
        headline: { x: 540, y: 480, fontSize: 88, color: '#FFFFFF', stroke: '#000000', strokeWidth: 6, fontWeight: 800, textAlign: 'center', maxWidth: 920 },
        subtext: { x: 540, y: 720, fontSize: 48, color: '#FFFFFF', stroke: '#000000', strokeWidth: 4, fontWeight: 600, textAlign: 'center', maxWidth: 920 },
      },
    }));

    await admin.from('slideshows').update({
      status: 'ready',
      slides,
      generation_error: null,
    }).eq('id', body.slideshowId);

    // Increment usage
    const periodStart = new Date(); periodStart.setDate(1);
    const ps = periodStart.toISOString().slice(0, 10);
    const { data: existing } = await admin.from('usage').select('id, slideshows_generated').eq('user_id', user.id).eq('period_start', ps).maybeSingle();
    if (existing) {
      await admin.from('usage').update({ slideshows_generated: (existing.slideshows_generated || 0) + 1 }).eq('id', existing.id);
    } else {
      await admin.from('usage').insert({ user_id: user.id, period_start: ps, slideshows_generated: 1 });
    }

    return j({ ok: true, slides });
  } catch (e: any) {
    return j({ error: e.message }, 500);
  }
});

function j(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
