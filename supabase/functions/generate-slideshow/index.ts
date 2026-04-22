// Generate a TikTok slideshow from a workspace. AI auto-picks images. Last slide = product shot.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Body { slideshowId: string; image_source?: 'both' | 'own_only'; }

const STORY_STYLES = ['listicle','pov','problem-agitate-solve','comparison','myth-bust','transformation','ugc-testimonial'] as const;

const SYSTEM = `You are a viral TikTok scriptwriter. You write slide captions for SaaS and business content that stop the scroll and make people swipe compulsively.

Each slide gets ONE block of text. 1 to 3 short sentences. Write them like you're texting a smart friend — lowercase, conversational, no corporate speak. Use line breaks between sentences to create rhythm (use \\n).

THE THREE THINGS THAT MATTER MOST:

1) THE HOOK (slide 1) — this is 80% of the job. It must stop the thumb in under 1 second.
   - Lead with a contrarian claim, uncomfortable truth, specific number, or a sharp question.
   - Concrete > abstract. Specific > generic. Weird > safe.
   - Never open with "I", "we", the brand name, or a greeting. Never describe the product.
   - Create an information gap they NEED closed.

2) VALUE SLIDES (middles) — each one is its own mini-hook.
   - Every middle slide must end on an open loop: tension unresolved, a question hanging, "but here's the thing…" energy.
   - Reveal one concrete insight per slide. No fluff, no recap, no transitions like "next up".
   - Each slide should make the next swipe feel mandatory.

3) THE CTA (last slide) — resolve the tension first, then land the CTA in the final sentence.
   - Pay off whatever tension the hook set up. Make the reader feel the click is the obvious next move.
   - The CTA itself is one short line at the end. Specific verb. No "click here" energy.

Never use: "game-changer", "unlock", "journey", "leverage", "utilize", "dive in", "explore", exclamation marks, ALL CAPS.

Examples of the energy:
"nobody talks about what happens\\nafter you hit your first $10k month."

"most founders are solving\\nthe wrong problem.\\nand they won't find out until it's too late."`;

function clean(s: any): string {
  if (typeof s !== 'string') return '';
  let t = s.replace(/[—–]/g, ', ').replace(/\*+/g, '').replace(/_+/g, '').replace(/\s+,/g, ',').replace(/,\s*,/g, ',').trim();
  // De-shout: any sentence in ALL CAPS gets converted to sentence case.
  t = t.split('\n').map((line) =>
    line.split(/(?<=[.!?])\s+/).map((sent) => {
      const letters = sent.replace(/[^A-Za-z]/g, '');
      if (letters.length >= 3 && letters === letters.toUpperCase()) {
        const lower = sent.toLowerCase();
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      }
      return sent;
    }).join(' ')
  ).join('\n');
  return t;
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

    const body = (await req.json()) as Body;
    const { slideshowId } = body;
    if (!slideshowId) return j({ error: 'slideshowId required' }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: slideshow, error: ssErr } = await admin
      .from('slideshows').select('*').eq('id', slideshowId).single();
    if (ssErr || !slideshow || slideshow.user_id !== userId) return j({ error: 'forbidden' }, 403);
    if (!slideshow.workspace_id) return j({ error: 'workspace_required' }, 400);

    const { data: profile } = await admin.from('profiles').select('plan, default_image_source').eq('id', userId).single();
    if (!profile || profile.plan === 'none') return j({ error: 'plan_required' }, 402);

    const imageSource: 'both' | 'own_only' = body.image_source || (profile as any).default_image_source || 'both';

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

    const userNonProduct = (allImages || []).filter((i: any) => !i.is_product_shot)
      .map((i: any) => ({ ...i, is_stock: false, public_url: null }));
    const productShots = (allImages || []).filter((i: any) => i.is_product_shot);

    if (productShots.length === 0) {
      await admin.from('slideshows').update({ status: 'failed', generation_error: 'No product shot in workspace. Upload at least one in "Product slide images".' }).eq('id', slideshowId);
      return j({ error: 'no_product_shot' }, 400);
    }

    // Optionally pull stock images from the platform library
    let stockNonProduct: any[] = [];
    if (imageSource === 'both') {
      const { data: stock } = await admin.from('stock_images').select('id, ai_description, ai_tags, public_url, category');
      stockNonProduct = (stock || []).map((s: any) => ({
        id: s.id,
        ai_description: s.ai_description,
        ai_tags: s.ai_tags || [],
        quality: 'medium',
        is_product_shot: false,
        file_name: s.category,
        is_stock: true,
        public_url: s.public_url,
      }));
    }

    const nonProduct = [...userNonProduct, ...stockNonProduct];

    if (nonProduct.length === 0) {
      await admin.from('slideshows').update({ status: 'failed', generation_error: 'No images available. Upload images or enable stock images.' }).eq('id', slideshowId);
      return j({ error: 'no_images' }, 400);
    }

    const qualityRank = (q: string) => q === 'high' ? 3 : q === 'medium' ? 2 : q === 'low' ? 1 : 2;

    // Variety: find images used in this workspace's last 5 slideshows and deprioritize them.
    const { data: recentSs } = await admin.from('slideshows')
      .select('slides, image_ids')
      .eq('workspace_id', workspace.id)
      .neq('id', slideshowId)
      .order('created_at', { ascending: false })
      .limit(5);
    const recentKeys = new Set<string>();
    (recentSs || []).forEach((r: any) => {
      (r.image_ids || []).forEach((id: string) => recentKeys.add(id));
      (Array.isArray(r.slides) ? r.slides : []).forEach((s: any) => {
        if (s?.image_url) recentKeys.add(s.image_url);
        if (s?.image_id) recentKeys.add(s.image_id);
      });
    });
    const keyOf = (i: any) => i.is_stock ? i.public_url : i.id;

    // Shuffle first for randomness, then sort by (not-recent first, then quality desc).
    for (let i = nonProduct.length - 1; i > 0; i--) {
      const r = Math.floor(Math.random() * (i + 1));
      [nonProduct[i], nonProduct[r]] = [nonProduct[r], nonProduct[i]];
    }
    nonProduct.sort((a: any, b: any) => {
      const ra = recentKeys.has(keyOf(a)) ? 1 : 0;
      const rb = recentKeys.has(keyOf(b)) ? 1 : 0;
      if (ra !== rb) return ra - rb;
      return qualityRank(b.quality) - qualityRank(a.quality);
    });

    const numSlides = Math.min(12, Math.max(3, slideshow.num_slides || 6));
    const needNonProduct = numSlides - 1;

    // Build AI image context with a larger pool for variety
    const poolSize = Math.min(nonProduct.length, Math.max(40, needNonProduct * 6));
    const imageContext = nonProduct.slice(0, poolSize).map((i: any, idx: number) =>
      `#${idx} [${i.quality || 'medium'}]${recentKeys.has(keyOf(i)) ? ' [recently-used]' : ''} ${i.ai_description || i.file_name || 'image'} | tags: ${(i.ai_tags || []).join(', ')}`
    ).join('\n');

    const prompt = `Write a ${numSlides}-slide viral TikTok slideshow for:

PRODUCT: ${workspace.name}
TAGLINE: ${workspace.tagline || '(none)'}
AUDIENCE: ${workspace.target_audience || 'general'}
BRAND VOICE: ${workspace.brand_voice || 'punchy, native to TikTok'}
DEFAULT CTA: ${workspace.default_cta || 'Try it now'}

NARRATIVE STYLE THIS TIME: ${chosenStyle}
HOOK STYLE: ${slideshow.hook_style || 'curiosity'}

AVAILABLE IMAGES (pick ${needNonProduct} DISTINCT indexes — never repeat the same index, and STRONGLY prefer images NOT marked [recently-used] so this slideshow looks different from the last few):
${imageContext || '(no images, reuse index 0)'}

Image rules:
- Pick ${needNonProduct} different indexes. No duplicates.
- Avoid [recently-used] images unless nothing else fits the slide's meaning.
- Match each image to its slide's actual content (use tags + description).
- Vary the visual feel across slides — don't pick 5 near-identical shots.

Writing rules — these are non-negotiable:
- HOOK (slide 1): the most important line in the whole script. Contrarian, uncomfortable, or a sharp specific question. Create an information gap. Don't open with "I", "we", or the brand name. Don't describe the product.
- VALUE SLIDES (middles): each one ends on an open loop. One concrete insight per slide. Each slide makes the next swipe feel mandatory.
- CTA SLIDE (last, returned as cta_text): resolve the tension from the hook, THEN drop the CTA in the final sentence. Specific verb. Feels like the obvious next move.
- Format: each slide = ONE block, 1-3 short sentences, lowercase, separated by \\n line breaks.
- No exclamation marks, no caps, no markdown, no emoji, no em-dashes.
- Banned words: game-changer, unlock, journey, leverage, utilize, dive in, explore.`;

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
                  text: { type: 'string', description: 'ONE block, 1-3 short lowercase sentences separated by \\n.' },
                  image_index: { type: 'number', description: 'Index from AVAILABLE IMAGES list' },
                },
                required: ['type', 'text', 'image_index'],
              },
            },
            cta_text: { type: 'string', description: 'Final CTA block, 1-3 short lowercase sentences separated by \\n. Last sentence is the CTA.' },
          },
          required: ['slides', 'cta_text'],
        },
      },
    };

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${lovableKey}` },
      body: JSON.stringify({
        model: 'openai/gpt-5',
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

    const pickedImageIds: string[] = [];
    const usedIdx = new Set<number>();
    const fallbackOrder = nonProduct.map((_: any, i: number) => i);
    const nextUnused = () => fallbackOrder.find((i) => !usedIdx.has(i)) ?? 0;
    const slides = rawSlides.map((s: any, idx: number) => {
      let imgIdx = typeof s.image_index === 'number' ? s.image_index : idx;
      imgIdx = Math.min(Math.max(imgIdx, 0), nonProduct.length - 1);
      if (usedIdx.has(imgIdx)) imgIdx = nextUnused();
      usedIdx.add(imgIdx);
      const pick = nonProduct[imgIdx] || nonProduct[0];
      if (pick && !pick.is_stock) pickedImageIds.push(pick.id);
      return {
        id: crypto.randomUUID(),
        type: s.type || (idx === 0 ? 'hook' : 'value'),
        text: clean(s.text).slice(0, 400),
        image_id: pick && !pick.is_stock ? pick.id : null,
        image_url: pick?.is_stock ? pick.public_url : null,
        is_stock: !!pick?.is_stock,
        fabric_state: null,
      };
    });

    // Append final CTA slide using a product shot (always a user image)
    const productShot = productShots[Math.floor(Math.random() * productShots.length)];
    slides.push({
      id: crypto.randomUUID(),
      type: 'cta',
      text: clean(parsed.cta_text || workspace.default_cta || 'try it now').slice(0, 400),
      image_id: productShot.id,
      image_url: null,
      is_stock: false,
      fabric_state: null,
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
