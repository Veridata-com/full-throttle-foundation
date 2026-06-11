// Generate a TikTok slideshow from a workspace. AI auto-picks images. Last slide = product shot.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Body { slideshowId: string; image_source?: 'both' | 'own_only'; }

const STORY_STYLES = [
  'how-i-built-it',
  'how-i-got-first-customers',
  'the-mistake-that-cost-me',
  'the-moment-everything-changed',
  'what-almost-killed-it',
  'behind-the-numbers',
  'the-thing-nobody-told-me',
] as const;

const SYSTEM = `You are a founder writing raw, personal TikTok storytime slideshows. You write in first person â€” like a real human sharing something they lived through, not a marketer selling something.

Each slide gets ONE block of text. 1 to 3 short sentences. Lowercase, conversational, like texting a close friend. Line breaks between sentences for rhythm (use \\n).

THE STORYTIME FORMAT:

1) HOOK (slide 1) â€” drop the reader into the middle of the story with a specific number, a specific moment, or a confession.
   - Examples: "i spent $14k on ads last month\\nand made 3 sales."
   - "i almost shut down the company in march.\\nnobody knew."
   - "we went from 0 to 10k mrr\\nby doing something embarrassing."
   - Opens a loop the viewer NEEDS closed. Never describe the product. Never open with "we" or the brand name.

2) VALUE SLIDES (middle) â€” continue the story one beat per slide. Each reveals one new piece of what happened.
   - Specific details: real numbers, real moments, real emotions.
   - End each slide mid-tension so the next swipe feels mandatory.
   - No generic advice. No tips. Only what actually happened.

3) CTA (last slide) â€” land the story first, THEN the CTA. Reader should feel the story just ended and the CTA is the natural next step.
   - One line to close the story. One line for the CTA. Specific verb.

Tone: vulnerable, specific, human. Like a founder venting to a friend who gets it.
Never use: "game-changer", "unlock", "journey", "leverage", "utilize", "dive in", "explore", exclamation marks, ALL CAPS, marketing speak.

Examples of the energy:
"i hired my first employee\\nand immediately lost my two biggest clients.\\nsame week."

"the ads were 'working'.\\nfacebook said 400 conversions.\\nstripe showed 12 payments."

"we had 50k impressions on our launch day.\\n14 signups.\\ni cried in my car."`;

function generateEmbedCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  return 'AR-' + Array.from(bytes).map(b => chars[b % chars.length]).join('');
}

function buildTiktokCaption(hookText: string, ctaText: string, embedCode: string): string {
  const hook = (hookText || '').replace(/\n/g, ' ').trim();
  const cta = (ctaText || 'Follow for more').replace(/\n/g, ' ').trim();
  return `${hook}\n\n${cta}\n\n${embedCode}`;
}

function clean(s: any): string {
  if (typeof s !== 'string') return '';
  let t = s.replace(/[â€”â€“]/g, ', ').replace(/\*+/g, '').replace(/_+/g, '').replace(/\s+,/g, ',').replace(/,\s*,/g, ',').trim();
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

    const { data: capOk, error: capErr } = await admin.rpc('check_and_increment_ai_cost', { _user_id: userId, _cost_cents: 3 });
    if (capErr) console.error('cost cap rpc error', capErr);
    if (capOk === false) {
      await admin.from('slideshows').update({ status: 'failed', generation_error: 'Monthly AI cost cap reached for your plan.' }).eq('id', slideshowId);
      return j({ error: 'cost_cap_reached' }, 402);
    }

    const { data: workspace } = await admin.from('workspaces').select('*').eq('id', slideshow.workspace_id).single();
    if (!workspace) return j({ error: 'workspace_not_found' }, 404);

    // Read photo layout config FIRST before any update overwrites generation_progress
    const savedProgress = (slideshow.generation_progress as any) || {};
    const photoLayout: 'one' | 'hvc' | null = savedProgress.photo_layout || null;
    const photoOneSource: string = savedProgress.image_source || 'ai';
    const photoOneUrl: string | null = savedProgress.image_url || null;
    const photoOneId: string | null = savedProgress.image_id || null;
    const photoHook = savedProgress.hook || null;
    const photoValue = savedProgress.value || null;
    const photoCta = savedProgress.cta || null;

    // Keep photo config fields alive in every progress update so they survive overwrites
    const photoMeta = photoLayout ? { photo_layout: photoLayout, image_source: photoOneSource, image_url: photoOneUrl, image_id: photoOneId, hook: photoHook, value: photoValue, cta: photoCta } : {};

    await admin.from('slideshows').update({
      status: 'generating',
      generation_error: null,
      generation_progress: { ...photoMeta, step: 'started', step_index: 0, total_steps: 4, message: 'Analyzing your topic...', percent: 0 },
    }).eq('id', slideshowId);

    const HOOK_POOL = ['question','contrarian','pain','result','curiosity'];
    const { data: insights } = await admin
      .from('user_insights').select('*')
      .eq('user_id', userId).eq('is_current', true)
      .order('generated_at', { ascending: false }).limit(1).maybeSingle();
    const isExploration = Math.random() < (insights ? 0.3 : 0.7);
    const hookStyle = slideshow.hook_style || HOOK_POOL[Math.floor(Math.random()*HOOK_POOL.length)];

    const history: string[] = Array.isArray(workspace.story_style_history) ? workspace.story_style_history : [];
    const recent = new Set(history.slice(-5));
    const available = STORY_STYLES.filter((s) => !recent.has(s));
    const pool = available.length ? available : [...STORY_STYLES];
    const chosenStyle = (insights?.best_style as any) && !isExploration ? insights.best_style as string : pool[Math.floor(Math.random() * pool.length)];

    await admin.from('slideshows').update({
      generation_progress: { ...photoMeta, step: 'writing_copy', step_index: 1, total_steps: 4, message: 'Writing slide scripts...', percent: 25 },
    }).eq('id', slideshowId);

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

    if (nonProduct.length === 0 && photoLayout === null) {
      await admin.from('slideshows').update({ status: 'failed', generation_error: 'No images available. Upload images or enable stock images.' }).eq('id', slideshowId);
      return j({ error: 'no_images' }, 400);
    }

    const qualityRank = (q: string) => q === 'high' ? 3 : q === 'medium' ? 2 : q === 'low' ? 1 : 2;

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

    const poolSize = Math.min(nonProduct.length, Math.max(40, needNonProduct * 6));
    const imageContext = nonProduct.slice(0, poolSize).map((i: any, idx: number) =>
      `#${idx} [${i.quality || 'medium'}]${recentKeys.has(keyOf(i)) ? ' [recently-used]' : ''} ${i.ai_description || i.file_name || 'image'} | tags: ${(i.ai_tags || []).join(', ')}`
    ).join('\n');

    const topic = (slideshow as any).topic || workspace.name;
    const ctaOverride = (slideshow as any).cta_text || workspace.default_cta || 'Try it now';

    const prompt = `Write a ${numSlides}-slide FOUNDER STORYTIME TikTok slideshow. This is NOT an ad. It is a personal first-person story told by a founder about their real experience.

PRODUCT CONTEXT (do NOT use this as the hook — use it only to know what the founder built):
- Product: ${workspace.name}
- What it does: ${workspace.tagline || workspace.name}
- Audience: ${workspace.target_audience || 'founders, builders'}

STORY ANGLE THIS TIME: ${chosenStyle} — write a true story FROM THE FOUNDER'S PERSPECTIVE about building, launching, or struggling with this product. Think "how i got my first 100 users" or "the week i almost gave up" or "i was $8k in debt when this happened".

HOOK STYLE: ${hookStyle}
CTA: ${ctaOverride}

CRITICAL RULES — break any of these and the output is wrong:
- The hook MUST be a personal confession, specific number, or moment in time. NEVER a "what if" or a pitch.
  BAD: "what if 7 slides got you more users than 70 videos?"
  GOOD: "i launched to 0 users. spent $3k on ads. got 4 signups."
- Every slide continues the story — one beat, one moment, one number.
- NEVER write as a marketer, never pitch the product, never use "you" to address the reader in value slides.
- Last slide: close the story THEN one-line CTA.

${photoLayout !== 'one' ? `AVAILABLE IMAGES (pick ${needNonProduct} DISTINCT indexes â€” never repeat the same index, prefer images NOT marked [recently-used]):
${imageContext || '(no images, reuse index 0)'}

Image rules:
- Pick ${needNonProduct} different indexes. No duplicates.
- Avoid [recently-used] images unless nothing else fits.
- Match each image to the slide's actual content.` : 'IMAGE: the user has pre-selected an image â€” image_index is irrelevant, use 0 for all slides.'}

Writing rules â€” non-negotiable:
- HOOK (slide 1): drop into the middle of the story. Specific number, specific moment, or confession. Create an information gap. No "I", "we", or brand name to open.
- VALUE SLIDES: continue the story beat by beat. Real numbers, real emotions. End each mid-tension.
- CTA SLIDE: close the story first, then one-line CTA. Specific verb.
- Format: each slide = ONE block, 1-3 short sentences, lowercase, separated by \\n.
- No exclamation marks, no caps, no markdown, no emoji, no em-dashes, no marketing speak.
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

    let personalization = '';
    try {
      const { data: ins } = await admin
        .from('user_insights').select('*').eq('user_id', userId).eq('is_current', true)
        .order('generated_at', { ascending: false }).limit(1).maybeSingle();
      if (ins) {
        personalization = `\n\nPERSONALIZATION CONTEXT (this user's actual TikTok performance â€” weight these heavily):
- Posts analyzed: ${ins.posts_analyzed}
- Best hook patterns: ${(ins.top_hook_patterns || []).join(' | ') || 'n/a'}
- Hook patterns to AVOID: ${(ins.worst_hook_patterns || []).join(' | ') || 'n/a'}
- Optimal slide count: ${ins.best_slide_count ?? 'n/a'}
- Best performing style: ${ins.best_style || 'n/a'}
- Topics that resonate: ${(ins.best_posting_topics || []).join(', ') || 'n/a'}
- Image types that work: ${(ins.best_image_types || []).join(', ') || 'n/a'}
${ins.next_hook_suggestion ? `- Suggested next hook direction: ${ins.next_hook_suggestion}` : ''}

Use these learnings to bias your decisions. Do not mention this context in the output.`;
      }
    } catch (e) {
      console.warn('personalization fetch failed', e);
    }

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${lovableKey}` },
      body: JSON.stringify({
        model: 'openai/gpt-5',
        messages: [
          { role: 'system', content: personalization + SYSTEM },
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

    await admin.from('slideshows').update({
      generation_progress: { ...photoMeta, step: 'rendering', step_index: 2, total_steps: 4, message: 'Selecting and arranging images...', percent: 60 },
    }).eq('id', slideshowId);

    const data = await aiRes.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: any = {};
    try { parsed = JSON.parse(call?.function?.arguments || '{}'); } catch {}

    const rawSlides = Array.isArray(parsed.slides) ? parsed.slides.slice(0, needNonProduct) : [];

    // Helper: resolve an image slot from user photo config
    const resolveSlot = async (slot: any): Promise<{ image_id: string | null; image_url: string | null; is_stock: boolean }> => {
      if (!slot || slot.source === 'ai') return { image_id: null, image_url: null, is_stock: false };
      if (slot.source === 'stock' && slot.image_url) return { image_id: null, image_url: slot.image_url, is_stock: true };
      if (slot.source === 'own' && slot.image_id) return { image_id: slot.image_id, image_url: null, is_stock: false };
      return { image_id: null, image_url: null, is_stock: false };
    };

    const pickedImageIds: string[] = [];
    const usedIdx = new Set<number>();
    const fallbackOrder = nonProduct.map((_: any, i: number) => i);
    const nextUnused = () => fallbackOrder.find((i) => !usedIdx.has(i)) ?? 0;

    const slides = await Promise.all(rawSlides.map(async (s: any, idx: number) => {
      let imgResult: { image_id: string | null; image_url: string | null; is_stock: boolean };

      if (photoLayout === 'one') {
        // Same image for every slide
        imgResult = await resolveSlot({ source: photoOneSource, image_url: photoOneUrl, image_id: photoOneId });
        // If source is 'ai' or nothing was picked, fall back to normal AI selection
        if (!imgResult.image_id && !imgResult.image_url) {
          let imgIdx = typeof s.image_index === 'number' ? s.image_index : idx;
          imgIdx = Math.min(Math.max(imgIdx, 0), nonProduct.length - 1);
          if (usedIdx.has(imgIdx)) imgIdx = nextUnused();
          usedIdx.add(imgIdx);
          const pick = nonProduct[imgIdx] || nonProduct[0];
          if (pick && !pick.is_stock) pickedImageIds.push(pick.id);
          imgResult = { image_id: pick && !pick.is_stock ? pick.id : null, image_url: pick?.is_stock ? pick.public_url : null, is_stock: !!pick?.is_stock };
        } else if (imgResult.image_id) {
          pickedImageIds.push(imgResult.image_id);
        }
      } else if (photoLayout === 'hvc') {
        // Hook = first slide, value = middle slides, cta handled below
        const slot = idx === 0 ? photoHook : photoValue;
        imgResult = await resolveSlot(slot);
        if (!imgResult.image_id && !imgResult.image_url) {
          let imgIdx = typeof s.image_index === 'number' ? s.image_index : idx;
          imgIdx = Math.min(Math.max(imgIdx, 0), nonProduct.length - 1);
          if (usedIdx.has(imgIdx)) imgIdx = nextUnused();
          usedIdx.add(imgIdx);
          const pick = nonProduct[imgIdx] || nonProduct[0];
          if (pick && !pick.is_stock) pickedImageIds.push(pick.id);
          imgResult = { image_id: pick && !pick.is_stock ? pick.id : null, image_url: pick?.is_stock ? pick.public_url : null, is_stock: !!pick?.is_stock };
        } else if (imgResult.image_id) {
          pickedImageIds.push(imgResult.image_id);
        }
      } else {
        // Normal AI image selection
        let imgIdx = typeof s.image_index === 'number' ? s.image_index : idx;
        imgIdx = Math.min(Math.max(imgIdx, 0), nonProduct.length - 1);
        if (usedIdx.has(imgIdx)) imgIdx = nextUnused();
        usedIdx.add(imgIdx);
        const pick = nonProduct[imgIdx] || nonProduct[0];
        if (pick && !pick.is_stock) pickedImageIds.push(pick.id);
        imgResult = { image_id: pick && !pick.is_stock ? pick.id : null, image_url: pick?.is_stock ? pick.public_url : null, is_stock: !!pick?.is_stock };
      }

      return {
        id: crypto.randomUUID(),
        type: s.type || (idx === 0 ? 'hook' : 'value'),
        text: clean(s.text).slice(0, 400),
        ...imgResult,
        fabric_state: null,
      };
    }));

    // CTA slide â€” use hvc cta slot if specified, otherwise product shot
    let ctaImgResult: { image_id: string | null; image_url: string | null; is_stock: boolean };
    if (photoLayout === 'hvc' && photoCta) {
      ctaImgResult = await resolveSlot(photoCta);
      if (!ctaImgResult.image_id && !ctaImgResult.image_url) {
        const productShot = productShots[Math.floor(Math.random() * productShots.length)];
        ctaImgResult = { image_id: productShot.id, image_url: null, is_stock: false };
        pickedImageIds.push(productShot.id);
      } else if (ctaImgResult.image_id) {
        pickedImageIds.push(ctaImgResult.image_id);
      }
    } else {
      const productShot = productShots[Math.floor(Math.random() * productShots.length)];
      ctaImgResult = { image_id: productShot.id, image_url: null, is_stock: false };
      pickedImageIds.push(productShot.id);
    }

    slides.push({
      id: crypto.randomUUID(),
      type: 'cta',
      text: clean(parsed.cta_text || ctaOverride).slice(0, 400),
      ...ctaImgResult,
      fabric_state: null,
    } as any);

    await admin.from('slideshows').update({
      generation_progress: { ...photoMeta, step: 'finishing', step_index: 3, total_steps: 4, message: 'Wrapping up...', percent: 85 },
    }).eq('id', slideshowId);

    const allTexts = slides.map((s: any) => s.text || '');
    const embedCode = generateEmbedCode();
    const tiktokCaption = buildTiktokCaption(allTexts[0] || '', allTexts[allTexts.length - 1] || '', embedCode);
    await admin.from('slideshows').update({
      status: 'ready',
      slides,
      image_ids: pickedImageIds,
      generation_error: null,
      hook_style: hookStyle,
      content_style: chosenStyle,
      hook_text: allTexts[0] || null,
      all_slide_texts: allTexts,
      embed_code: embedCode,
      tiktok_caption: tiktokCaption,
      generation_progress: { step: 'complete', step_index: 4, total_steps: 4, message: 'Your slideshow is ready!', percent: 100 },
    }).eq('id', slideshowId);

    const newHistory = [...history, chosenStyle].slice(-20);
    await admin.from('workspaces').update({ story_style_history: newHistory }).eq('id', workspace.id);

    const periodStart2 = new Date(); periodStart2.setDate(1);
    const ps = periodStart2.toISOString().slice(0, 10);
    const { data: existing } = await admin.from('usage').select('id, slideshows_generated').eq('user_id', userId).eq('period_start', ps).maybeSingle();
    if (existing) {
      await admin.from('usage').update({ slideshows_generated: (existing.slideshows_generated || 0) + 1 }).eq('id', existing.id);
    } else {
      await admin.from('usage').insert({ user_id: userId, period_start: ps, slideshows_generated: 1 });
    }

    await admin.from('ai_decisions').insert({
      user_id: userId,
      slideshow_id: slideshowId,
      decision_type: isExploration ? 'explore' : 'exploit',
      hook_style_chosen: hookStyle,
      slide_count_chosen: numSlides,
      content_style_chosen: chosenStyle,
      generation_mode_chosen: 'photo',
      design_styles_chosen: [],
      reasoning: `${isExploration ? 'Exploration' : 'Exploitation'}: hook=${hookStyle}, slides=${numSlides}, style=${chosenStyle}, mode=photo, photoLayout=${photoLayout || 'ai'}. ${insights ? `Based on ${insights.posts_analyzed} tracked posts.` : 'No data yet, used defaults.'}`,
    });

    return j({ ok: true, slides, style: chosenStyle });
  } catch (e: any) {
    console.error('generate-slideshow error', e);
    return j({ error: e.message }, 500);
  }
});

function j(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
