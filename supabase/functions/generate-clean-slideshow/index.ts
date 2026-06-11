// generate-clean-slideshow: fully autonomous designer.
// Picks hook style, content style, slide count (if not provided), templates,
// icons, mood, and writes ALL text. Logs decisions to ai_decisions.
// Updates slideshows.generation_progress in real time so the client can
// stream progress via Supabase Realtime.
// Rendering still happens client-side (html2canvas) — this fn returns specs.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  slideshowId: string;
  /** Optional: force a design style. "designed" = templated, "story" = white canvas story mode, "auto" = let AI pick. */
  designStyleOverride?: "auto" | "designed" | "story";
}

const TEMPLATES = ["title_card", "centered_text", "big_number", "list_items", "step_number", "highlight_box", "cta_card", "quote_style"];
const ICONS = ["arrow_right", "check", "star", "lightning", "chart_up", "users", "target", "rocket", "clock", "dollar", "eye", "lock", "heart", "message", "code", "globe", "shield", "zap", "refresh", "x_mark", "minus", "plus", "share", "award", "layers", "trending", "fire", "brain", "book", "briefcase", "cart", "gift", "smile", "thumbs_up", "bell", "search", "settings"];

const HOOK_STYLES = ["question", "contrarian", "pain", "result", "curiosity"] as const;
const CONTENT_STYLES = ["educational", "storytelling", "product_showcase", "myth-bust", "listicle"] as const;
const SLIDE_COUNT_POOL = [6, 7, 8, 9];
const DESIGN_STYLES = ["designed", "story"] as const;
const AI_MODEL = "google/gemini-3-flash-preview";

function summarizeAiFailure(status: number, raw: string): string {
  const text = (raw || "").trim();
  if (status >= 500) return "AI service is temporarily unavailable. Please try again in a minute.";
  if (status === 429) return "AI rate limit reached. Please retry shortly.";
  if (status === 402) return "AI credits are currently unavailable.";
  return text.slice(0, 300) || `AI request failed (${status})`;
}

function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

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

const SYSTEM_DESIGNED = `You are an autonomous TikTok carousel designer + scriptwriter. Decide nothing about strategy — that has already been decided for you. Just write the copy and pick the templates.

Rules:
- Pick the best template per slide. Vary across slides.
- For big_number: a real-sounding specific number (73%, 11.4x, $2,847).
- Choose icons that support the content. Set icon to null if template doesn't display one. Templates that show icons: centered_text, list_items, cta_card.
- For list_items, every item must include an icon name from the icon list.
- All text lowercase except acronyms and the brand name.
- Banned words: game-changer, unlock, journey, leverage, utilize, dive in, explore. No exclamation marks, no caps lock, no emoji, no em-dashes.
- Hook (slide 1): pattern interrupt; never opens with "I", "we", or the brand name. Information gap.
- Middle slides: each ends on an open loop.
- Last slide: cta_card. Resolve tension then drop the CTA naturally.
- Each slide also needs a "text" field — the plain text version (1-3 short sentences, lowercase, separated by \\n) used as a fallback.
Return ONLY a valid tool call.`;

// Story Mode is rebuilt: Claude writes the full HTML for each slide.
// The system prompt is built dynamically per request (see buildStorySystemPrompt below).

function clean(s: any): string {
  if (typeof s !== "string") return "";
  let t = s.replace(/[—–]/g, ", ").replace(/\*+/g, "").replace(/_+/g, "").replace(/\s+,/g, ",").replace(/,\s*,/g, ",").trim();
  t = t.split("\n").map((line) =>
    line.split(/(?<=[.!?])\s+/).map((sent) => {
      const letters = sent.replace(/[^A-Za-z]/g, "");
      if (letters.length >= 3 && letters === letters.toUpperCase()) {
        const lower = sent.toLowerCase();
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      }
      return sent;
    }).join(" ")
  ).join("\n");
  return t;
}

function escHtml(s: string): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] || c);
}

function hexToRgb(hex: string): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec((hex || "").trim());
  if (!m) return "255,59,92";
  return `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}`;
}

function buildStorySystemPrompt(brand: any, topic: string, slideCount: number): string {
  return `You are designing a viral TikTok storytime carousel for a SaaS founder.
You write the COMPLETE HTML for each slide (1080x1920px). The slides must work as a story across the swipe.

Brand color: ${brand.primary_color}
Brand name: ${brand.brand_name}
URL: ${brand.brand_url || ""}
Topic: ${topic}
Slides: ${slideCount}

You decide everything: composition, typography size, where text goes, what visual elements to use.

NARRATIVE STRUCTURE:
- Slide 1: scene-setting hook with a SPECIFIC moment, number, or confession (not summary)
- Slides 2 to N-2: build the problem with specific moments and emotional beats
- Slide N-1: the turning point or realization
- Slide N: payoff that naturally introduces ${brand.brand_name}

WRITING RULES (absolute):
- Lowercase. Conversational. Like texting.
- Specific over generic. "$47 in my bank account" not "no money".
- Cliffhangers between slides. End with "..." or unresolved thought when possible.
- Real moments not advice. "i refreshed stripe 50 times that night" not "track your metrics".
- Each slide should make the viewer NEED to swipe.
- No exclamation marks, no caps lock, no emoji, no em-dashes.

DESIGN VOCABULARY (use creatively, mix and match):
- Massive type filling the slide (font-size 180px+)
- Tiny label + huge number combinations
- Strikethrough text for "what I thought" vs new reality
- Arrow showing transformation (before to after)
- Fake terminal window with green text on dark
- Fake notification card (like an iOS message)
- Receipt/invoice style for money moments
- Single highlighted word with brand color background
- Diagonal text or rotated elements
- Numbered list with X's and checkmarks
- Calendar or timeline visual
- Phone screen mockup
- Stats with tiny labels
- Empty space as a beat (one word in a sea of white)

VISUAL CONSISTENCY:
- Small slide counter in bottom right (1/${slideCount}, 2/${slideCount}, ...) using brand color
- Background: pick ONE of white, off-white (#FAFAFA), or subtle dot grid; use across ALL slides
- Use the brand color sparingly and intentionally, for emphasis only
- Use Inter, sans-serif as the font family

OUTPUT FORMAT:
Return STRICT JSON only, no prose, no code fences. Shape:
{"slides":[{"html":"<div style='width:1080px;height:1920px;...'>...</div>"}]}
Exactly ${slideCount} slides. Each html must be a complete, fully-inline-styled 1080x1920 slide. No external CSS. No <script>. Just HTML and inline SVG.

The story must feel like ONE founder's actual experience, with specific scenes that ladder into why ${brand.brand_name} matters.`;
}

async function setProgress(admin: any, id: string, step: string, stepIndex: number, totalSteps: number, message: string) {
  const percent = Math.round((stepIndex / totalSteps) * 100);
  await admin.from("slideshows").update({
    generation_progress: { step, step_index: stepIndex, total_steps: totalSteps, message, percent },
  }).eq("id", id);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return j({ error: "unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) return j({ error: "LOVABLE_API_KEY missing" }, 500);

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    const userId = user?.id;
    if (!userId) return j({ error: "unauthorized" }, 401);

    const { slideshowId, designStyleOverride } = (await req.json()) as Body;
    if (!slideshowId) return j({ error: "slideshowId required" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: slideshow, error: ssErr } = await admin.from("slideshows").select("*").eq("id", slideshowId).single();
    if (ssErr || !slideshow || slideshow.user_id !== userId) return j({ error: "forbidden" }, 403);
    if (!slideshow.workspace_id) return j({ error: "workspace_required" }, 400);

    const { data: profile } = await admin.from("profiles").select("plan").eq("id", userId).single();
    if (!profile || profile.plan === "none") return j({ error: "plan_required" }, 402);

    const { data: capOk } = await admin.rpc("check_and_increment_ai_cost", { _user_id: userId, _cost_cents: 2 });
    if (capOk === false) {
      await admin.from("slideshows").update({ status: "failed", generation_error: "Monthly AI cost cap reached." }).eq("id", slideshowId);
      return j({ error: "cost_cap_reached" }, 402);
    }

    const periodStart = new Date(); periodStart.setDate(1);
    const ps = periodStart.toISOString().slice(0, 10);
    const { data: usage } = await admin.from("usage").select("designed_slideshows_generated, slideshows_generated").eq("user_id", userId).eq("period_start", ps).maybeSingle();
    const designedThisMonth = usage?.designed_slideshows_generated || 0;
    if (profile.plan === "starter" && designedThisMonth >= 15) {
      await admin.from("slideshows").update({ status: "failed", generation_error: "Starter plan: 15 designed slideshows / month. Upgrade to Pro." }).eq("id", slideshowId);
      return j({ error: "designed_quota_exceeded" }, 402);
    }

    const { data: workspace } = await admin.from("workspaces").select("*").eq("id", slideshow.workspace_id).single();
    if (!workspace) return j({ error: "workspace_not_found" }, 404);

    const { data: brand } = await admin.from("brand_identity").select("*").eq("user_id", userId).maybeSingle();
    if (!brand) return j({ error: "brand_required" }, 400);

    await admin.from("slideshows").update({ status: "generating", generation_error: null }).eq("id", slideshowId);
    await setProgress(admin, slideshowId, "started", 0, 4, "Analyzing your topic...");

    // === Autonomous decision making ===
    // Pull user's insights as a strategy proxy.
    const { data: insights } = await admin
      .from("user_insights").select("*")
      .eq("user_id", userId).eq("is_current", true)
      .order("generated_at", { ascending: false }).limit(1).maybeSingle();

    const explorationRate = insights ? 0.3 : 0.7;
    const isExploration = Math.random() < explorationRate;

    // Decide design style: user override > stored slideshow choice > AI pick.
    const slideshowChoice = (slideshow as any).design_style as string | undefined;
    const overrideRequest = (designStyleOverride && designStyleOverride !== "auto")
      ? designStyleOverride
      : (slideshowChoice && slideshowChoice !== "auto" ? slideshowChoice : null);
    const designStyle: "designed" | "story" = overrideRequest === "story" || overrideRequest === "designed"
      ? overrideRequest
      : pick(DESIGN_STYLES);

    const userProvidedSlideCount = slideshow.ai_decided ? null : slideshow.num_slides;
    const hookStyle = isExploration ? pick(HOOK_STYLES) : (insights?.next_hook_suggestion ? "result" : pick(HOOK_STYLES));
    const slideCount = userProvidedSlideCount ?? insights?.best_slide_count ?? pick(SLIDE_COUNT_POOL);
    const contentStyle = isExploration ? pick(CONTENT_STYLES) : (insights?.best_style as any) || pick(CONTENT_STYLES);
    const numSlides = Math.min(10, Math.max(3, slideCount));

    const ctaText = slideshow.cta_text || workspace.default_cta || "";
    const topic = slideshow.topic || slideshow.title || workspace.name;

    await setProgress(admin, slideshowId, "writing_copy", 1, 4, "Writing slide scripts...");

    const writePromptDesigned = `Create a ${numSlides}-slide TikTok carousel.

BRAND: ${brand.brand_name}
${brand.brand_tagline ? `TAGLINE: ${brand.brand_tagline}\n` : ""}${brand.brand_url ? `URL: ${brand.brand_url}\n` : ""}
WORKSPACE: ${workspace.name}
AUDIENCE: ${workspace.target_audience || "general"}
BRAND VOICE: ${workspace.brand_voice || "punchy, native to TikTok"}

TOPIC: "${topic}"
CTA: ${ctaText || "write a compelling CTA yourself"}

HOOK STYLE TO USE: ${hookStyle}
${hookStyle === "question" ? "Open with a provocative question that makes the viewer feel called out." : ""}
${hookStyle === "contrarian" ? "Open with a statement that contradicts common belief." : ""}
${hookStyle === "pain" ? "Open by describing a specific frustration the viewer feels right now." : ""}
${hookStyle === "result" ? "Open with a specific impressive result or number." : ""}
${hookStyle === "curiosity" ? "Open with an incomplete thought that demands the next slide." : ""}

CONTENT STYLE: ${contentStyle}
SLIDE COUNT: ${numSlides}

Brand visuals — mood: ${brand.slide_mood}, icons: ${brand.use_icons}, watermark: ${brand.use_brand_watermark}
Available templates: ${TEMPLATES.join(", ")}
Available icons: ${ICONS.join(", ")}

Return exactly ${numSlides} slides. First = hook, last = cta_card.`;

    const isStory = designStyle === "story";
    const writePrompt = writePromptDesigned;

    let slides: any[] = [];

    if (isStory) {
      const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
      if (!anthropicKey) {
        await admin.from("slideshows").update({ status: "failed", generation_error: "ANTHROPIC_API_KEY missing for Story Mode." }).eq("id", slideshowId);
        return j({ error: "anthropic_key_missing" }, 500);
      }
      const storySystem = buildStorySystemPrompt(brand, topic, numSlides);
      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 8000,
          messages: [{ role: "user", content: storySystem }],
        }),
      });
      if (!claudeRes.ok) {
        const txt = await claudeRes.text();
        console.error("claude error", claudeRes.status, txt);
        await admin.from("slideshows").update({ status: "failed", generation_error: `Claude: ${txt.slice(0, 300)}` }).eq("id", slideshowId);
        return j({ error: "claude_failed" }, 500);
      }
      const cdata = await claudeRes.json();
      const raw = cdata?.content?.[0]?.text || "";
      let parsedC: any = {};
      const tryParse = (s: string) => { try { return JSON.parse(s); } catch { return null; } };
      try {
        const cleaned = raw.replace(/```json|```/g, "").trim();
        const m = cleaned.match(/\{[\s\S]*\}/);
        const candidate = m ? m[0] : cleaned;
        parsedC = tryParse(candidate)
          ?? tryParse(candidate.replace(/[\u0000-\u001F]/g, (c) => c === "\n" ? "\\n" : c === "\r" ? "\\r" : c === "\t" ? "\\t" : ""))
          ?? {};
      } catch (e) { console.error("claude parse fail", raw); }
      const arr = Array.isArray(parsedC.slides) ? parsedC.slides : [];
      if (arr.length === 0) {
        console.error("claude returned no slides. raw:", raw.slice(0, 2000));
        await admin.from("slideshows").update({ status: "failed", generation_error: "Claude returned no parseable slides" }).eq("id", slideshowId);
        return j({ error: "claude_no_slides" }, 500);
      }
      slides = arr.slice(0, numSlides).map((s: any) => {
        const html = typeof s.html === "string" ? s.html : "";
        // Strip plain-text from html for the fallback "text" field (best-effort).
        const textOnly = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400);
        return {
          template: "story_canvas",
          icon: null,
          text: textOnly,
          variables: { story_html: html },
        };
      });
    } else {
      const writeRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${lovableKey}` },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [
            { role: "system", content: SYSTEM_DESIGNED },
            { role: "user", content: writePrompt },
          ],
          tools: [{
            type: "function",
            function: {
              name: "design_slides",
              description: "Design a TikTok carousel of clean designed slides.",
              parameters: {
                type: "object",
                properties: {
                  slides: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        template: { type: "string", enum: TEMPLATES },
                        mood_override: { type: ["string", "null"], enum: ["dark", "light", null] },
                        icon: { type: ["string", "null"] },
                        text: { type: "string", description: "REQUIRED. Plain-text version of the slide, 1-3 short lowercase sentences separated by \\n. This is what the viewer reads." },
                        variables: {
                          type: "object",
                          description: "REQUIRED. Template-specific text vars must be filled with REAL copy. Schemas: title_card={label,heading,subtext}; centered_text={main_text,support_text}; big_number={number,unit,context}; list_items={section_label,items:[{icon,item_title,item_description}]}; step_number={step_number,instruction,detail}; highlight_box={context_above,highlight_text,context_below}; cta_card={cta_heading,cta_text,brand_url}; quote_style={quote_text,attribution}.",
                          additionalProperties: true,
                        },
                      },
                      required: ["template", "variables", "text"],
                    },
                  },
                },
                required: ["slides"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "design_slides" } },
        }),
      });

      if (!writeRes.ok) {
        const txt = await writeRes.text();
        console.error("write error", writeRes.status, txt);
        const friendlyError = summarizeAiFailure(writeRes.status, txt);
        await admin.from("slideshows").update({ status: "failed", generation_error: friendlyError }).eq("id", slideshowId);
        if (writeRes.status === 429) return j({ error: "rate_limit" }, 429);
        if (writeRes.status === 402) return j({ error: "payment_required" }, 402);
        return j({ error: "ai_failed", detail: friendlyError, fallback: writeRes.status >= 500 }, 200);
      }

      const writeData = await writeRes.json();
      const args = writeData?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      let parsed: any = {};
      try { parsed = JSON.parse(args || "{}"); } catch { /* noop */ }
      slides = (parsed.slides || []).slice(0, numSlides);
    }

    if (slides.length === 0) {
      await admin.from("slideshows").update({ status: "failed", generation_error: "AI returned no slides." }).eq("id", slideshowId);
      return j({ error: "ai_failed" }, 500);
    }

    function deepClean(v: any): any {
      if (typeof v === "string") return clean(v).slice(0, 600);
      if (Array.isArray(v)) return v.map(deepClean);
      if (v && typeof v === "object") {
        const o: any = {};
        for (const k of Object.keys(v)) o[k] = deepClean(v[k]);
        return o;
      }
      return v;
    }
    function fillFromText(template: string, text: string, vars: any, icon: string | null): any {
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      const v = { ...(vars || {}) };
      const has = (k: string) => typeof v[k] === "string" && v[k].trim().length > 0;
      switch (template) {
        case "title_card":
          if (!has("heading")) v.heading = lines[0] || "";
          if (!has("subtext")) v.subtext = lines.slice(1).join(" ") || "";
          if (!has("label")) v.label = "";
          break;
        case "centered_text":
          if (!has("main_text")) v.main_text = lines[0] || "";
          if (!has("support_text")) v.support_text = lines.slice(1).join(" ") || "";
          break;
        case "big_number": {
          const m = (lines[0] || "").match(/([\d.,]+\s*[%xX$€£+]?|\$[\d.,]+[kKmMbB]?)/);
          if (!has("number")) v.number = m ? m[1].trim() : (lines[0] || "");
          if (!has("unit")) v.unit = "";
          if (!has("context")) v.context = lines.slice(1).join(" ") || lines[0] || "";
          break;
        }
        case "list_items":
          if (!has("section_label")) v.section_label = lines[0] || "";
          if (!Array.isArray(v.items) || v.items.length === 0) {
            v.items = lines.slice(1).map((l) => ({ icon: icon || "check", item_title: l, item_description: "" }));
            if (v.items.length === 0) v.items = lines.map((l) => ({ icon: icon || "check", item_title: l, item_description: "" }));
          }
          break;
        case "step_number":
          if (!has("step_number")) v.step_number = "1";
          if (!has("instruction")) v.instruction = lines[0] || "";
          if (!has("detail")) v.detail = lines.slice(1).join(" ") || "";
          break;
        case "highlight_box":
          if (!has("highlight_text")) v.highlight_text = lines[0] || "";
          if (!has("context_above")) v.context_above = "";
          if (!has("context_below")) v.context_below = lines.slice(1).join(" ") || "";
          break;
        case "cta_card":
          if (!has("cta_heading")) v.cta_heading = lines[0] || "ready to try it?";
          if (!has("cta_text")) v.cta_text = lines.slice(1).join(" ") || "tap the link";
          break;
        case "quote_style":
          if (!has("quote_text")) v.quote_text = lines[0] || "";
          if (!has("attribution")) v.attribution = lines[1] || "";
          break;
        case "story_canvas":
          if (!has("story_text")) v.story_text = text || lines.join("\n") || "";
          break;
      }
      return v;
    }

    for (const s of slides) {
      const preservedHtml = s.variables?.story_html;
      s.variables = deepClean(s.variables || {});
      if (preservedHtml) s.variables.story_html = preservedHtml; // never truncate/clean rendered HTML
      s.text = clean(s.text || "");
      s.variables = fillFromText(s.template, s.text, s.variables, s.icon);
      if (s.template === "cta_card" && !s.variables.brand_url) s.variables.brand_url = brand.brand_url || "";
    }

    const last = slides[slides.length - 1];
    if (!isStory && last.template !== "cta_card") {
      slides[slides.length - 1] = {
        template: "cta_card",
        icon: "rocket",
        text: clean(ctaText || workspace.default_cta || "ready to try it?"),
        variables: {
          cta_heading: clean(workspace.default_cta || "ready to try it?"),
          cta_text: ctaText || "Try it now",
          brand_url: brand.brand_url || "",
        },
      };
    }
    if (isStory) {
      for (const s of slides) {
        if (s.template !== "story_canvas") {
          s.template = "story_canvas";
          s.icon = null;
          s.variables = s.variables || {};
          if (!s.variables.story_text) s.variables.story_text = s.text || "";
        }
      }
    }

    await setProgress(admin, slideshowId, "rendering", 2, 4, "Designing your slides...");

    if (usage) {
      await admin.from("usage").update({
        designed_slideshows_generated: designedThisMonth + 1,
        slideshows_generated: ((usage as any).slideshows_generated || 0) + 1,
      }).eq("user_id", userId).eq("period_start", ps);
    } else {
      await admin.from("usage").insert({ user_id: userId, period_start: ps, slideshows_generated: 1, designed_slideshows_generated: 1 });
    }

    // Persist learning context on the slideshow row
    const allTexts = slides.map((s: any) => s.text || "");
    const templatesUsed = slides.map((s: any) => s.template);
    const iconsUsed = slides.map((s: any) => s.icon).filter(Boolean);
    const embedCode = generateEmbedCode();
    const tiktokCaption = buildTiktokCaption(allTexts[0] || '', allTexts[allTexts.length - 1] || '', embedCode);

    await admin.from("slideshows").update({
      generation_mode: "clean_designed",
      design_style: designStyle,
      hook_style: hookStyle,
      content_style: contentStyle,
      num_slides: numSlides,
      hook_text: allTexts[0] || null,
      all_slide_texts: allTexts,
      templates_used: templatesUsed,
      icons_used: iconsUsed,
      embed_code: embedCode,
      tiktok_caption: tiktokCaption,
    } as any).eq("id", slideshowId);

    // Log decision
    await admin.from("ai_decisions").insert({
      user_id: userId,
      slideshow_id: slideshowId,
      decision_type: overrideRequest ? "override" : (isExploration ? "explore" : "exploit"),
      hook_style_chosen: hookStyle,
      slide_count_chosen: numSlides,
      content_style_chosen: contentStyle,
      generation_mode_chosen: "clean_designed",
      design_styles_chosen: [designStyle],
      reasoning: `${overrideRequest ? `User override: ${designStyle}` : (isExploration ? "Exploration" : "Exploitation")}: design_style=${designStyle}, hook=${hookStyle}, slides=${numSlides}, style=${contentStyle}. ${insights ? `Based on ${insights.posts_analyzed} tracked posts.` : "No data yet, used defaults."}`,
    });

    return j({ ok: true, slides, brand });
  } catch (e: any) {
    console.error("generate-clean-slideshow error", e);
    return j({ error: e.message }, 500);
  }
});

function j(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
