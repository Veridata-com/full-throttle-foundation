// Generate a TikTok slideshow from a workspace. AI auto-picks images. Last slide = product shot.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Body { slideshowId: string; }

const STORY_STYLES = ['listicle','pov','problem-agitate-solve','comparison','myth-bust','transformation','ugc-testimonial'] as const;

const SYSTEM = `You are a TikTok storyteller who writes captions that stop the scroll because they FEEL like something. You write the way a real person texts a close friend at 1am, reflective, raw, a little vulnerable, sometimes painful, sometimes wise, sometimes wildly curious.

Voice rules, absolute:
- Sentence case only. Capitalize the first letter of each sentence and proper nouns. Nothing else.
- NEVER use ALL CAPS. Not for emphasis, not ever.
- NEVER use bold, italics, asterisks, underscores, or any markdown.
- NEVER use em-dashes or en-dashes. Use commas, periods, or line breaks instead.
- NEVER use emoji.
- Short. Quiet. Confident. Two short sentences max per slide.
- Use a soft line break (\n) between two thoughts when it makes the pause hit harder.
- The reader should feel something: ache, recognition, hope, hunger, curiosity, a little sting.
- Write like the captions on viral late-night walking-shot reels. Reflective. Story-driven. Human.

Examples of the tone you write in (DO NOT copy these, only match the feel):
"Trading can give you everything you've ever wanted.\nBut only after it teaches you everything you need to learn."
"Most people quit right before the part that would have changed their life."
"You don't need motivation. You need to remember why you started."`;

function clean(s: any): string {
  if (typeof s !== 'string') return '';
  return s.replace(/[—–]/g, ', ').replace(/\s+,/g, ',').replace(/,\s*,/g, ',').trim();
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
    const userId = user?.id;
    if (!userId) return j({ error: 'unauthorized' }, 401);

    const { slideshowId } = (await req.json()) as Body;
    if (!slideshowId) return j({ error: 'slideshowId required' }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: slideshow, error: ssErr } = await admin
      .from('slideshows').select('*').eq('id', slideshowId).single();
    if (ssErr || !slideshow || slideshow.user_id !== userId) return j({ error: 'forbidden' }, 403);
    if (!slideshow.workspace_id) return j({ error: 'workspace_required' }, 400);

    const { data: profile } = await admin.from('profiles').select('plan').eq('id', userId).single();
    if (!profile || profile.plan === 'none') return j({ error: 'plan_required' }, 402);

    if (profile.plan === 'starter') {
      const periodStart = new Date(); periodStart.setDate(1);
      const ps = periodStart.toISOString().slice(0, 10);
      const { data: usage } = await admin.from('usage').select('slideshows_generated').eq('user_id', userId).eq('period_start', ps).maybeSingle();
      if ((usage?.slideshows_generated || 0) >= 50) return j({ error: 'quota_exceeded' }, 402);
    }

    // Hard cost cap (abuse ceiling): Starter $5/mo, Pro $15/mo. Reserve ~3 cents per generation.
    const { data: capOk, error: capErr } = await admin.rpc('check_and_increment_ai_cost', { _user_id: userId, _cost_cents: 3 });
    if (capErr) console.error('cost cap rpc error', capErr);
    if (capOk === false) {
      await admin.from('slideshows').update({ status: 'failed', generation_error: 'Monthly AI cost cap reached for your plan.' }).eq('id', slideshowId);
      return j({ error: 'cost_cap_reached' }, 402);
    }

    const { data: workspace } = await admin.from('workspaces').select('*').eq('id', slideshow.workspace_id).single();
    if (!workspace) return j({ error: 'workspace_not_found' }, 404);

    await admin.from('slideshows').update({ status: 'generating', generation_error: null }).eq('id', slideshowId);

    // Pick a narrative style different from recent history
    const history: string[] = Array.isArray(workspace.story_style_history) ? workspace.story_style_history : [];
    const recent = new Set(history.slice(-5));
    const available = STORY_STYLES.filter((s) => !recent.has(s));
    const pool = available.length ? available : STORY_STYLES;
    const chosenStyle = pool[Math.floor(Math.random() * pool.length)];

    // Fetch all workspace images with quality + tags (non-product)
    const { data: allImages } = await admin.from('images')
      .select('id, ai_description, ai_tags, quality, is_product_shot, file_name')
      .eq('workspace_id', workspace.id)
      .eq('ai_status', 'done');

    const nonProduct = (allImages || []).filter((i: any) => !i.is_product_shot);
    const productShots = (allImages || []).filter((i: any) => i.is_product_shot);

    if (productShots.length === 0) {
      await admin.from('slideshows').update({ status: 'failed', generation_error: 'No product shot in workspace. Upload at least one in "Product slide images".' }).eq('id', slideshowId);
      return j({ error: 'no_product_shot' }, 400);
    }

    const qualityRank = (q: string) => q === 'high' ? 3 : q === 'medium' ? 2 : q === 'low' ? 1 : 2;
    nonProduct.sort((a: any, b: any) => qualityRank(b.quality) - qualityRank(a.quality));

    const numSlides = Math.min(12, Math.max(3, slideshow.num_slides || 6));
    const needNonProduct = numSlides - 1;

    // Build AI image context
    const imageContext = nonProduct.slice(0, 40).map((i: any, idx: number) =>
      `#${idx} [${i.quality || 'medium'}] ${i.ai_description || i.file_name || 'image'} | tags: ${(i.ai_tags || []).join(', ')}`
    ).join('\n');

    const prompt = `Generate a ${numSlides}-slide TikTok slideshow for:

PRODUCT: ${workspace.name}
TAGLINE: ${workspace.tagline || '(none)'}
AUDIENCE: ${workspace.target_audience || 'general'}
BRAND VOICE: ${workspace.brand_voice || 'punchy, human, TikTok-native'}
DEFAULT CTA: ${workspace.default_cta || 'Try it now'}

NARRATIVE STYLE THIS TIME: ${chosenStyle}
HOOK STYLE: ${slideshow.hook_style || 'curiosity'}

AVAILABLE IMAGES (pick ${needNonProduct} of these by index, prefer high quality and tag relevance):
${imageContext || '(no images, reuse index 0)'}

Rules:
- Slide 1 = HOOK (scroll-stopper, max 8 words)
- Middle slides = VALUE props following the ${chosenStyle} narrative (max 14 words each)
- Final slide = CTA (provided separately, you only output ${needNonProduct} slides here)
- Each slide: ONE short punchy headline + optional subtext
- Never use em-dashes or en-dashes
- Sound human, not corporate`;

    const tool = {
      type: 'function',
      function: {
        name: 'build_slides',
        description: 'Build slideshow slides',
        parameters: {
          type: 'object',
          properties: {
            slides: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['hook', 'value'] },
                  headline: { type: 'string' },
                  subtext: { type: 'string' },
                  image_index: { type: 'number', description: 'Index from AVAILABLE IMAGES list' },
                },
                required: ['type', 'headline', 'image_index'],
              },
            },
            cta_headline: { type: 'string', description: 'Headline for final CTA slide' },
            cta_subtext: { type: 'string' },
          },
          required: ['slides', 'cta_headline'],
        },
      },
    };

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${lovableKey}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: prompt },
        ],
        tools: [tool],
        tool_choice: { type: 'function', function: { name: 'build_slides' } },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error('generate-slideshow AI error', aiRes.status, txt);
      await admin.from('slideshows').update({ status: 'failed', generation_error: `${aiRes.status}: ${txt.slice(0, 300)}` }).eq('id', slideshowId);
      if (aiRes.status === 429) return j({ error: 'rate_limit' }, 429);
      if (aiRes.status === 402) return j({ error: 'payment_required' }, 402);
      return j({ error: 'ai_failed', detail: txt }, 500);
    }

    const data = await aiRes.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: any = {};
    try { parsed = JSON.parse(call?.function?.arguments || '{}'); } catch {}

    const rawSlides = Array.isArray(parsed.slides) ? parsed.slides.slice(0, needNonProduct) : [];

    const defaultLayout = {
      headline: { x: 540, y: 480, fontSize: 88, color: '#FFFFFF', stroke: '#000000', strokeWidth: 6, fontWeight: 800, textAlign: 'center', maxWidth: 920 },
      subtext:  { x: 540, y: 720, fontSize: 48, color: '#FFFFFF', stroke: '#000000', strokeWidth: 4, fontWeight: 600, textAlign: 'center', maxWidth: 920 },
    };

    const pickedImageIds: string[] = [];
    const slides = rawSlides.map((s: any, idx: number) => {
      const imgIdx = typeof s.image_index === 'number' ? s.image_index : idx;
      const pick = nonProduct[Math.min(Math.max(imgIdx, 0), nonProduct.length - 1)] || nonProduct[0];
      if (pick) pickedImageIds.push(pick.id);
      return {
        id: crypto.randomUUID(),
        type: s.type || (idx === 0 ? 'hook' : 'value'),
        headline: clean(s.headline).slice(0, 120),
        subtext: s.subtext ? clean(s.subtext).slice(0, 200) : null,
        image_id: pick?.id || null,
        layout: defaultLayout,
      };
    });

    // Append final CTA slide using a product shot
    const productShot = productShots[Math.floor(Math.random() * productShots.length)];
    slides.push({
      id: crypto.randomUUID(),
      type: 'cta',
      headline: clean(parsed.cta_headline || workspace.default_cta || 'Try it now').slice(0, 120),
      subtext: parsed.cta_subtext ? clean(parsed.cta_subtext).slice(0, 200) : null,
      image_id: productShot.id,
      layout: defaultLayout,
    });

    const finalImageIds = [...pickedImageIds, productShot.id];

    await admin.from('slideshows').update({
      status: 'ready',
      slides,
      image_ids: finalImageIds,
      generation_error: null,
    }).eq('id', slideshowId);

    // Update workspace story history
    const newHistory = [...history, chosenStyle].slice(-20);
    await admin.from('workspaces').update({ story_style_history: newHistory }).eq('id', workspace.id);

    // Usage increment
    const periodStart = new Date(); periodStart.setDate(1);
    const ps = periodStart.toISOString().slice(0, 10);
    const { data: existing } = await admin.from('usage').select('id, slideshows_generated').eq('user_id', userId).eq('period_start', ps).maybeSingle();
    if (existing) {
      await admin.from('usage').update({ slideshows_generated: (existing.slideshows_generated || 0) + 1 }).eq('id', existing.id);
    } else {
      await admin.from('usage').insert({ user_id: userId, period_start: ps, slideshows_generated: 1 });
    }

    return j({ ok: true, slides, style: chosenStyle });
  } catch (e: any) {
    console.error('generate-slideshow error', e);
    return j({ error: e.message }, 500);
  }
});

function j(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
