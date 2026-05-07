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

function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

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

function renderAccent(accent: any, primary: string, rgb: string): string {
  if (!accent || typeof accent !== "object") return "";
  const pos = String(accent.position || "top-right");
  const positions: Record<string, string> = {
    "top-left": "top:140px;left:100px;",
    "top-right": "top:140px;right:100px;",
    "bottom-left": "bottom:180px;left:100px;",
    "bottom-right": "bottom:180px;right:100px;",
    "center-left": "top:50%;left:80px;transform:translateY(-50%);",
    "center-right": "top:50%;right:80px;transform:translateY(-50%);",
  };
  const posCss = positions[pos] || positions["top-right"];
  const t = String(accent.type || "");
  switch (t) {
    case "stat_card": {
      const stat = escHtml(String(accent.stat || "12k"));
      const label = escHtml(String(accent.label || "views"));
      return `<div style="position:absolute;${posCss}background:rgba(${rgb},0.08);border:1px solid rgba(${rgb},0.28);border-radius:16px;padding:20px 30px;z-index:3;">
        <div style="font-family:var(--heading-font);font-size:42px;font-weight:700;color:${primary};line-height:1;">${stat}</div>
        <div style="font-family:var(--body-font);font-size:16px;color:#666;letter-spacing:0.05em;margin-top:6px;">${label}</div>
      </div>`;
    }
    case "arrow":
      return `<svg style="position:absolute;${posCss}width:160px;height:90px;pointer-events:none;z-index:3;" viewBox="0 0 160 90">
        <path d="M10 15 Q80 80 145 25" stroke="${primary}" stroke-width="3" stroke-dasharray="6 6" fill="none" opacity="0.7"/>
        <path d="M135 18 L150 24 L142 38" stroke="${primary}" stroke-width="3" fill="none" opacity="0.7" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    case "dots":
      return `<div style="position:absolute;${posCss}display:flex;gap:12px;z-index:3;">
        <div style="width:14px;height:14px;border-radius:50%;background:${primary};opacity:0.75;"></div>
        <div style="width:14px;height:14px;border-radius:50%;background:${primary};opacity:0.45;"></div>
        <div style="width:14px;height:14px;border-radius:50%;background:${primary};opacity:0.22;"></div>
      </div>`;
    case "star":
      return `<svg style="position:absolute;${posCss}width:54px;height:54px;color:${primary};opacity:0.8;z-index:3;" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>`;
    case "underline":
      return `<svg style="position:absolute;${posCss}width:320px;height:28px;pointer-events:none;z-index:3;" viewBox="0 0 320 28">
        <path d="M5 14 Q160 4 315 16" stroke="${primary}" stroke-width="5" fill="none" opacity="0.7" stroke-linecap="round"/>
      </svg>`;
    case "circle_outline":
      return `<div style="position:absolute;${posCss}width:90px;height:90px;border:3px solid ${primary};border-radius:50%;opacity:0.6;z-index:3;"></div>`;
    case "diagonal_line":
      return `<svg style="position:absolute;${posCss}width:180px;height:180px;pointer-events:none;z-index:3;" viewBox="0 0 180 180">
        <line x1="10" y1="170" x2="170" y2="10" stroke="${primary}" stroke-width="3" opacity="0.5"/>
      </svg>`;
    case "side_bar":
      return `<div style="position:absolute;left:50px;top:50%;transform:translateY(-50%);width:6px;height:520px;background:${primary};opacity:0.65;border-radius:3px;z-index:3;"></div>`;
    default:
      return "";
  }
}

function renderStorySlide(s: any, primary: string): string {
  const text = typeof s.text === "string" ? s.text : "";
  const fontSize = Math.min(140, Math.max(28, Number(s.font_size) || 60));
  const fontWeight = [400, 500, 600, 700, 800].includes(Number(s.font_weight)) ? Number(s.font_weight) : 500;
  const align = ["left", "center", "right"].includes(s.text_align) ? s.text_align : "center";
  const vPos = ["top", "center", "bottom"].includes(s.vertical_position) ? s.vertical_position : "center";
  const hPad = Math.min(220, Math.max(40, Number(s.horizontal_padding) || 100));
  const textColor = /^#[0-9a-f]{6}$/i.test(String(s.text_color || "")) ? s.text_color : "#1A1A1A";
  const rgb = hexToRgb(primary);

  // Build text with optional highlight pill
  let textHtml = escHtml(text).replace(/\n/g, "<br>");
  const highlight = typeof s.highlight_word === "string" ? s.highlight_word.trim() : "";
  if (highlight) {
    const safe = escHtml(highlight);
    const re = new RegExp(`\\b(${safe.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})\\b`, "i");
    textHtml = textHtml.replace(re, `<span style="background:rgba(${rgb},0.18);color:${primary};padding:0 14px;border-radius:10px;display:inline-block;">$1</span>`);
  }

  const vCss = vPos === "top" ? "top:200px;" : vPos === "bottom" ? "bottom:240px;" : "top:50%;transform:translateY(-50%);";
  // For non-center align we use absolute left/right instead of horizontal centering
  const hCss = align === "center"
    ? `left:${hPad}px;right:${hPad}px;`
    : align === "left" ? `left:${hPad}px;right:${hPad}px;` : `left:${hPad}px;right:${hPad}px;`;

  const accentHtml = renderAccent(s.accent, primary, rgb);

  return `${accentHtml}
<div style="position:absolute;${vCss}${hCss}font-family:var(--body-font);font-weight:${fontWeight};font-size:${fontSize}px;color:${textColor};line-height:1.25;text-align:${align};letter-spacing:-0.01em;z-index:2;">
  ${textHtml}
</div>`;
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

    const writePromptStory = `Design a ${numSlides}-slide TikTok carousel.

BRAND: ${brand.brand_name}
${brand.brand_tagline ? `TAGLINE: ${brand.brand_tagline}\n` : ""}${brand.brand_url ? `URL: ${brand.brand_url}\n` : ""}AUDIENCE: ${workspace.target_audience || "general"}
BRAND VOICE: ${workspace.brand_voice || "honest, founder, lowercase"}
TOPIC: "${topic}"
CTA: ${ctaText || "soft, in story voice"}

CANVAS: 1080x1920px, white background with subtle dot grid (already drawn).
PRIMARY BRAND COLOR: ${brand.primary_color} (use sparingly for accents/highlights, never for body text).

For EACH of the ${numSlides} slides, design the composition. You decide:
- text: the words for this slide. Use \\n for line breaks. Keep it short.
- font_size: 32-140 (px). Bigger for emphasis, smaller for context. Vary across slides.
- font_weight: 400, 500, 600, 700, or 800.
- text_align: "left", "center", or "right".
- vertical_position: "top", "center", or "bottom".
- horizontal_padding: 60-200 (px from sides).
- highlight_word: optional, ONE word inside text to wrap with a colored background pill (uses primary color). Must match exactly.
- accent: optional, ONE visual accent. Object: { type, position }. Types: "stat_card" (also needs stat + label), "arrow" (curved dotted), "dots" (3-dot cluster), "star", "underline" (under text), "circle_outline", "diagonal_line", "side_bar" (vertical accent line). Position: "top-left", "top-right", "bottom-left", "bottom-right", "center-left", "center-right".
- text_color: optional, default "#1A1A1A". Only override if you want a slide where the text itself is the brand color.

Compose intentionally. Move text around the canvas across slides. Use whitespace. Some slides feel huge and bold, others small and quiet. The eye should travel.`;

    const isStory = designStyle === "story";
    const writePrompt = isStory ? writePromptStory : writePromptDesigned;

    let slides: any[] = [];

    if (isStory) {
      const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
      if (!anthropicKey) {
        await admin.from("slideshows").update({ status: "failed", generation_error: "ANTHROPIC_API_KEY missing for Story Mode." }).eq("id", slideshowId);
        return j({ error: "anthropic_key_missing" }, 500);
      }
      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 3000,
          system: SYSTEM_STORY,
          messages: [{
            role: "user",
            content: `${writePrompt}\n\nReturn STRICT JSON only, no prose, no code fences. Shape:\n{"slides":[{"text":"...","font_size":72,"font_weight":600,"text_align":"left","vertical_position":"center","horizontal_padding":100,"highlight_word":"shipped","accent":{"type":"stat_card","position":"top-right","stat":"34k","label":"views"},"text_color":"#1A1A1A"}]}\n\nExactly ${numSlides} slides. Only "text" is required; everything else is optional but use them to design.`,
          }],
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
      try {
        const m = raw.match(/\{[\s\S]*\}/);
        parsedC = JSON.parse(m ? m[0] : raw);
      } catch (e) { console.error("claude parse fail", raw); }
      const arr = Array.isArray(parsedC.slides) ? parsedC.slides : [];
      slides = arr.slice(0, numSlides).map((s: any) => ({
        template: "story_canvas",
        icon: null,
        text: typeof s.text === "string" ? s.text : "",
        variables: {
          story_html: renderStorySlide(s, brand.primary_color),
          story_text: typeof s.text === "string" ? s.text : "",
        },
      }));
    } else {
      const writeRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${lovableKey}` },
        body: JSON.stringify({
          model: "openai/gpt-5",
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
        await admin.from("slideshows").update({ status: "failed", generation_error: `AI: ${txt.slice(0, 300)}` }).eq("id", slideshowId);
        if (writeRes.status === 429) return j({ error: "rate_limit" }, 429);
        if (writeRes.status === 402) return j({ error: "payment_required" }, 402);
        return j({ error: "ai_failed" }, 500);
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
