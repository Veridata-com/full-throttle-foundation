// generate-clean-slideshow: GPT-5 picks templates + writes variables for each slide.
// Rendering happens client-side (html2canvas in src/lib/designed/renderer.ts).
// This function returns the slide specs; the client renders + uploads PNGs and patches the slideshow.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  slideshowId: string;
}

const TEMPLATES = ["title_card", "centered_text", "big_number", "list_items", "step_number", "highlight_box", "cta_card", "quote_style"];
const ICONS = ["arrow_right", "check", "star", "lightning", "chart_up", "users", "target", "rocket", "clock", "dollar", "eye", "lock", "heart", "message", "code", "globe", "shield", "zap", "refresh", "x_mark", "minus", "plus", "share", "award", "layers", "trending", "fire", "brain", "book", "briefcase", "cart", "gift", "smile", "thumbs_up", "bell", "search", "settings"];

const SYSTEM = `You are a world-class editorial slide designer for TikTok carousels. You design clean, typographic, minimalist slides that convert viewers into customers. Your designs use NO AI-generated images — only typography, geometric shapes, icons, and color.

Three things that matter most:
1) HOOK (slide 1) — contrarian, uncomfortable, sharp question. Information gap. Never opens with "I", "we", or the product name. Use title_card or quote_style.
2) VALUE SLIDES (middles) — each ends on an open loop. One concrete insight per slide. Mix centered_text, big_number, list_items, step_number, highlight_box.
3) CTA (last slide) — resolve the tension first, drop the CTA. Always use cta_card.

Rules:
- Pick the best template for each slide's purpose.
- Vary templates across slides — never use the same template twice in a row.
- For big_number: use a real-sounding specific number, not a round one (e.g. "73%", "11.4x", "$2,847").
- Choose icons that directly support the text content, not decorative ones. Set icon to null if the template doesn't display one.
- Templates that DO display an icon: centered_text, list_items, cta_card.
- For list_items, each item must include an icon name from the icon list.
- All text in lowercase except acronyms and the brand name.
- Banned words: game-changer, unlock, journey, leverage, utilize, dive in, explore. No exclamation marks, no caps lock, no emoji, no em-dashes.
- Keep text concise — same viral TikTok copywriting rules apply.

Return ONLY a valid tool call.`;

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

async function progress(admin: any, id: string, payload: Record<string, any>) {
  await admin.from("slideshows").update({ generation_progress: payload }).eq("id", id);
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

    const { slideshowId } = (await req.json()) as Body;
    if (!slideshowId) return j({ error: "slideshowId required" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: slideshow, error: ssErr } = await admin.from("slideshows").select("*").eq("id", slideshowId).single();
    if (ssErr || !slideshow || slideshow.user_id !== userId) return j({ error: "forbidden" }, 403);
    if (!slideshow.workspace_id) return j({ error: "workspace_required" }, 400);

    const { data: profile } = await admin.from("profiles").select("plan").eq("id", userId).single();
    if (!profile || profile.plan === "none") return j({ error: "plan_required" }, 402);

    // Cost cap — clean designed slides only use a single GPT-5 call (cheap), reserve 2 cents.
    const { data: capOk } = await admin.rpc("check_and_increment_ai_cost", { _user_id: userId, _cost_cents: 2 });
    if (capOk === false) {
      await admin.from("slideshows").update({ status: "failed", generation_error: "Monthly AI cost cap reached." }).eq("id", slideshowId);
      return j({ error: "cost_cap_reached" }, 402);
    }

    // Plan limit (re-use designed quota for now)
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

    // Brand identity is required for clean designed mode
    const { data: brand } = await admin.from("brand_identity").select("*").eq("user_id", userId).maybeSingle();
    if (!brand) return j({ error: "brand_required" }, 400);

    const numSlides = Math.min(10, Math.max(3, slideshow.num_slides || 6));

    await admin.from("slideshows").update({ status: "generating", generation_error: null }).eq("id", slideshowId);
    await progress(admin, slideshowId, { phase: "writing", current: 0, total: numSlides, label: "Designing slides" });

    const writePrompt = `Design a ${numSlides}-slide TikTok carousel for the brand "${brand.brand_name}".
${brand.brand_tagline ? `Brand tagline: ${brand.brand_tagline}\n` : ""}${brand.brand_url ? `Brand URL: ${brand.brand_url}\n` : ""}
PRODUCT WORKSPACE: ${workspace.name}
AUDIENCE: ${workspace.target_audience || "general"}
BRAND VOICE: ${workspace.brand_voice || "punchy, native to TikTok"}
DEFAULT CTA: ${workspace.default_cta || "try it now"}
HOOK STYLE: ${slideshow.hook_style || "curiosity"}

Brand visual style:
- Mood: ${brand.slide_mood}
- Icons enabled: ${brand.use_icons}
- Watermark enabled: ${brand.use_brand_watermark}

Available templates: ${TEMPLATES.join(", ")}
Available icons: ${ICONS.join(", ")}

Return exactly ${numSlides} slides. The first must be a hook, the last must use cta_card. Vary templates across the middle slides.`;

    const writeRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${lovableKey}` },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          { role: "system", content: SYSTEM },
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
                      variables: {
                        type: "object",
                        description: "Template-specific variables. Examples: title_card needs {label, heading, subtext}; centered_text needs {main_text, support_text}; big_number needs {number, unit, context}; list_items needs {section_label, items:[{icon,item_title,item_description}]}; step_number needs {step_number, instruction, detail}; highlight_box needs {context_above, highlight_text, context_below}; cta_card needs {cta_heading, cta_text, brand_url}; quote_style needs {quote_text, attribution}.",
                        additionalProperties: true,
                      },
                    },
                    required: ["template", "variables"],
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
    const slides: any[] = (parsed.slides || []).slice(0, numSlides);

    if (slides.length === 0) {
      await admin.from("slideshows").update({ status: "failed", generation_error: "AI returned no slides." }).eq("id", slideshowId);
      return j({ error: "ai_failed" }, 500);
    }

    // Sanitize text in variables (apply clean() to all string values)
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
    for (const s of slides) {
      s.variables = deepClean(s.variables || {});
      // Ensure cta_card always has brand_url
      if (s.template === "cta_card" && !s.variables.brand_url) s.variables.brand_url = brand.brand_url || "";
    }

    // Force last slide to be cta_card if AI ignored the rule
    const last = slides[slides.length - 1];
    if (last.template !== "cta_card") {
      slides[slides.length - 1] = {
        template: "cta_card",
        icon: "rocket",
        variables: {
          cta_heading: clean(workspace.default_cta || "ready to try it?"),
          cta_text: "Try it now",
          brand_url: brand.brand_url || "",
        },
      };
    }

    // Usage increment
    if (usage) {
      await admin.from("usage").update({
        designed_slideshows_generated: designedThisMonth + 1,
        slideshows_generated: ((usage as any).slideshows_generated || 0) + 1,
      }).eq("user_id", userId).eq("period_start", ps);
    } else {
      await admin.from("usage").insert({ user_id: userId, period_start: ps, slideshows_generated: 1, designed_slideshows_generated: 1 });
    }

    // Mark as awaiting_render — client will render PNGs, upload, then PATCH slideshow rows
    await admin.from("slideshows").update({
      generation_mode: "clean_designed",
      generation_progress: { phase: "rendering", current: 0, total: slides.length, label: "Rendering slides on your device" },
    }).eq("id", slideshowId);

    return j({ ok: true, slides, brand });
  } catch (e: any) {
    console.error("generate-clean-slideshow error", e);
    return j({ error: e.message }, 500);
  }
});

function j(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
