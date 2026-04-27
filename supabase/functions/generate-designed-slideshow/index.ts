// Generate an AI-DESIGNED TikTok slideshow.
// Pipeline: GPT-5 writes slide text + image prompts -> Nano Banana Pro renders 1080x1920 backgrounds
// -> GPT-5 vision picks per-slide text placement. Last slide = a product shot from the workspace.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  slideshowId: string;
  design_styles?: string[];
}

const STYLE_KEYWORDS: Record<string, string[]> = {
  dark: ["dark", "moody", "dramatic", "shadow", "cinematic"],
  minimal: ["minimal", "clean", "white", "simple", "negative space"],
  gradient: ["gradient", "colorful", "modern", "vibrant"],
  luxury: ["luxury", "gold", "premium", "elegant", "rich textures"],
  tech: ["tech", "digital", "cyber", "neon", "futuristic"],
  nature: ["nature", "organic", "earth tones", "warm", "natural textures"],
};

const SYSTEM = `You are a viral TikTok scriptwriter AND visual art director.

Each slide gets ONE block of text — 1 to 3 short lowercase sentences separated by \\n. Conversational, native to TikTok, scroll-stopping.

THE THREE THINGS THAT MATTER MOST:
1) HOOK (slide 1) — contrarian, uncomfortable, sharp question. Information gap. Never opens with "I", "we", or the product name.
2) VALUE SLIDES (middles) — each ends on an open loop, one concrete insight per slide.
3) CTA (last slide) — resolve the tension first, drop the CTA in the final sentence.

You ALSO write a Flux/Nano Banana image prompt for each slide that:
- Designs a 9:16 portrait background with intentional negative space for text overlay.
- Includes phrase: "leave clean empty space in the [position] area suitable for text overlay, no busy patterns there".
- Varies negative-space position across slides (alternate center / lower-center / upper-center / left-center / right-center).
- Matches the chosen design style keywords.
- NEVER includes any text, words, letters, or typography in the image (text is added later).
- Avoids faces or identifiable people.

Banned words in slide text: game-changer, unlock, journey, leverage, utilize, dive in, explore. No exclamation marks, no caps, no emoji, no em-dashes.`;

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

    const body = (await req.json()) as Body;
    const { slideshowId, design_styles } = body;
    if (!slideshowId) return j({ error: "slideshowId required" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: slideshow, error: ssErr } = await admin.from("slideshows").select("*").eq("id", slideshowId).single();
    if (ssErr || !slideshow || slideshow.user_id !== userId) return j({ error: "forbidden" }, 403);
    if (!slideshow.workspace_id) return j({ error: "workspace_required" }, 400);

    const { data: profile } = await admin.from("profiles").select("plan").eq("id", userId).single();
    if (!profile || profile.plan === "none") return j({ error: "plan_required" }, 402);

    // Plan limit: starter = 15 designed slideshows / month, pro = unlimited
    const periodStart = new Date(); periodStart.setDate(1);
    const ps = periodStart.toISOString().slice(0, 10);
    const { data: usage } = await admin.from("usage").select("designed_slideshows_generated").eq("user_id", userId).eq("period_start", ps).maybeSingle();
    const designedThisMonth = usage?.designed_slideshows_generated || 0;
    if (profile.plan === "starter" && designedThisMonth >= 15) {
      await admin.from("slideshows").update({ status: "failed", generation_error: "Starter plan: 15 designed slideshows / month. Upgrade to Pro for unlimited." }).eq("id", slideshowId);
      return j({ error: "designed_quota_exceeded" }, 402);
    }

    // Cost cap (designed slideshows are pricier — reserve ~12 cents)
    const { data: capOk } = await admin.rpc("check_and_increment_ai_cost", { _user_id: userId, _cost_cents: 12 });
    if (capOk === false) {
      await admin.from("slideshows").update({ status: "failed", generation_error: "Monthly AI cost cap reached." }).eq("id", slideshowId);
      return j({ error: "cost_cap_reached" }, 402);
    }

    const { data: workspace } = await admin.from("workspaces").select("*").eq("id", slideshow.workspace_id).single();
    if (!workspace) return j({ error: "workspace_not_found" }, 404);

    // Need a product shot for the CTA slide
    const { data: productShots } = await admin.from("images")
      .select("id, storage_path")
      .eq("workspace_id", workspace.id).eq("is_product_shot", true).eq("ai_status", "done");
    if (!productShots || productShots.length === 0) {
      await admin.from("slideshows").update({ status: "failed", generation_error: "Upload at least one product shot first." }).eq("id", slideshowId);
      return j({ error: "no_product_shot" }, 400);
    }

    const styles = (design_styles && design_styles.length ? design_styles : (slideshow.design_styles || ["dark", "moody"])).slice(0, 2);
    const styleWords = styles.flatMap((s) => STYLE_KEYWORDS[s] || [s]);

    const numSlides = Math.min(12, Math.max(3, slideshow.num_slides || 6));
    const needDesigned = numSlides - 1; // last slide = product shot

    await admin.from("slideshows").update({ status: "generating", generation_error: null }).eq("id", slideshowId);
    await progress(admin, slideshowId, { phase: "writing", current: 0, total: needDesigned + 2, label: "Writing slide scripts" });

    // === Phase 1: GPT-5 writes text + image prompts ===
    const writePrompt = `Write a ${numSlides}-slide viral TikTok slideshow.

PRODUCT: ${workspace.name}
TAGLINE: ${workspace.tagline || "(none)"}
AUDIENCE: ${workspace.target_audience || "general"}
BRAND VOICE: ${workspace.brand_voice || "punchy, native to TikTok"}
DEFAULT CTA: ${workspace.default_cta || "try it now"}
HOOK STYLE: ${slideshow.hook_style || "curiosity"}

DESIGN STYLE for the visuals: ${styles.join(", ")} (keywords: ${styleWords.join(", ")})

Return ${needDesigned} hook+value slides, plus a final cta_text. For each of the ${needDesigned} slides include:
- text (1-3 lowercase sentences with \\n)
- image_prompt (detailed prompt for an AI image generator, 9:16 portrait, with explicit clean negative-space instruction)
- negative_space_position: one of center | upper | lower | left | right (vary across slides)
- suggested_text_color (#FFFFFF or #000000 for contrast)
- suggested_stroke_color (inverse of text color)`;

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
            name: "build_designed_slides",
            description: "Build slideshow text + image prompts",
            parameters: {
              type: "object",
              properties: {
                slides: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string", enum: ["hook", "value"] },
                      text: { type: "string" },
                      image_prompt: { type: "string" },
                      negative_space_position: { type: "string", enum: ["center", "upper", "lower", "left", "right"] },
                      suggested_text_color: { type: "string" },
                      suggested_stroke_color: { type: "string" },
                    },
                    required: ["type", "text", "image_prompt", "negative_space_position", "suggested_text_color", "suggested_stroke_color"],
                  },
                },
                cta_text: { type: "string" },
              },
              required: ["slides", "cta_text"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "build_designed_slides" } },
      }),
    });
    if (!writeRes.ok) {
      const txt = await writeRes.text();
      console.error("write phase error", writeRes.status, txt);
      await admin.from("slideshows").update({ status: "failed", generation_error: `AI write: ${txt.slice(0, 300)}` }).eq("id", slideshowId);
      if (writeRes.status === 429) return j({ error: "rate_limit" }, 429);
      if (writeRes.status === 402) return j({ error: "payment_required" }, 402);
      return j({ error: "ai_failed" }, 500);
    }
    const writeData = await writeRes.json();
    const writeArgs = writeData?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let parsed: any = {};
    try { parsed = JSON.parse(writeArgs || "{}"); } catch { /* noop */ }
    const rawSlides: any[] = (parsed.slides || []).slice(0, needDesigned);
    if (rawSlides.length < needDesigned) {
      while (rawSlides.length < needDesigned) {
        rawSlides.push({
          type: rawSlides.length === 0 ? "hook" : "value",
          text: "tap to edit your text here.",
          image_prompt: `${styleWords.join(", ")} abstract background, 9:16 portrait, leave clean empty space in the center area for text overlay`,
          negative_space_position: "center",
          suggested_text_color: "#FFFFFF",
          suggested_stroke_color: "#000000",
        });
      }
    }

    // === Phase 2: generate images sequentially (with progress updates) ===
    const finalSlides: any[] = [];
    for (let i = 0; i < rawSlides.length; i++) {
      const slide = rawSlides[i];
      await progress(admin, slideshowId, { phase: "imaging", current: i + 1, total: rawSlides.length, label: `Designing image ${i + 1} of ${rawSlides.length}` });

      const t0 = Date.now();
      const imgRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${lovableKey}` },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          messages: [{ role: "user", content: `${slide.image_prompt}\n\nAspect ratio: 9:16 portrait (1080x1920). Photorealistic or stylized per the prompt. NO text, NO letters, NO words, NO typography anywhere in the image.` }],
          modalities: ["image", "text"],
        }),
      });
      if (!imgRes.ok) {
        const txt = await imgRes.text();
        console.error(`image gen ${i} failed`, imgRes.status, txt);
        if (imgRes.status === 429) { await admin.from("slideshows").update({ status: "failed", generation_error: "Rate limited during image generation." }).eq("id", slideshowId); return j({ error: "rate_limit" }, 429); }
        if (imgRes.status === 402) { await admin.from("slideshows").update({ status: "failed", generation_error: "AI credits exhausted." }).eq("id", slideshowId); return j({ error: "payment_required" }, 402); }
        await admin.from("slideshows").update({ status: "failed", generation_error: `Image gen: ${txt.slice(0, 200)}` }).eq("id", slideshowId);
        return j({ error: "image_failed" }, 500);
      }
      const imgData = await imgRes.json();
      const dataUrl: string | undefined = imgData?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!dataUrl || !dataUrl.startsWith("data:")) {
        console.error(`image ${i} missing data url`, imgData);
        await admin.from("slideshows").update({ status: "failed", generation_error: "Image generator returned no image." }).eq("id", slideshowId);
        return j({ error: "image_failed" }, 500);
      }
      const genTime = Date.now() - t0;

      // Decode base64 -> upload to private bucket
      const [meta, b64] = dataUrl.split(",");
      const mime = meta.match(/data:([^;]+)/)?.[1] || "image/png";
      const ext = mime === "image/jpeg" ? "jpg" : "png";
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const storagePath = `${userId}/${slideshowId}/slide-${i}.${ext}`;
      const { error: upErr } = await admin.storage.from("generated-images").upload(storagePath, bytes, { contentType: mime, upsert: true });
      if (upErr) {
        console.error("upload error", upErr);
        await admin.from("slideshows").update({ status: "failed", generation_error: "Failed to store generated image." }).eq("id", slideshowId);
        return j({ error: "storage_failed" }, 500);
      }
      const { data: signed } = await admin.storage.from("generated-images").createSignedUrl(storagePath, 60 * 60 * 24 * 7);
      const permanentUrl = signed?.signedUrl || "";

      // === Phase 3 (per-slide): GPT-5 vision picks text placement ===
      await progress(admin, slideshowId, { phase: "placement", current: i + 1, total: rawSlides.length, label: `Placing text on slide ${i + 1}` });

      let placement: any = {
        x: 540,
        y: slide.negative_space_position === "upper" ? 480 : slide.negative_space_position === "lower" ? 1500 : 960,
        originX: "center", originY: "center",
        fontSize: 72,
        fillColor: slide.suggested_text_color || "#FFFFFF",
        strokeColor: slide.suggested_stroke_color || "#000000",
        strokeWidth: 12, maxWidth: 900, textAlign: "center",
      };
      try {
        const vis = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${lovableKey}` },
          body: JSON.stringify({
            model: "openai/gpt-5-mini",
            messages: [
              { role: "system", content: `You analyze a 1080x1920 image and decide where to place a TikTok text overlay. Coords: (0,0) top-left, (540,960) center, (1080,1920) bottom-right. Intended negative-space area: ${slide.negative_space_position}. Use Arial Black 900. Font size: <20 chars 88, 20-35 chars 76, 35-50 chars 60, 50+ chars 48; cap 52 if 5+ lines, 42 if 7+ lines. Dark image -> #FFFFFF text + #000000 stroke. Light image -> #000000 text + #FFFFFF stroke. Mixed -> #FFFFFF + #000000 strokeWidth 12.` },
              { role: "user", content: [
                { type: "image_url", image_url: { url: dataUrl } },
                { type: "text", text: `Text to place:\n"${slide.text}"\n\nReturn placement.` },
              ] },
            ],
            tools: [{
              type: "function",
              function: {
                name: "set_placement",
                description: "Set text placement",
                parameters: {
                  type: "object",
                  properties: {
                    x: { type: "number" }, y: { type: "number" },
                    originX: { type: "string", enum: ["left", "center", "right"] },
                    originY: { type: "string", enum: ["top", "center", "bottom"] },
                    fontSize: { type: "number" },
                    fillColor: { type: "string" }, strokeColor: { type: "string" },
                    strokeWidth: { type: "number" }, maxWidth: { type: "number" },
                    textAlign: { type: "string", enum: ["left", "center", "right"] },
                    reasoning: { type: "string" },
                  },
                  required: ["x", "y", "originX", "originY", "fontSize", "fillColor", "strokeColor", "strokeWidth", "maxWidth", "textAlign"],
                },
              },
            }],
            tool_choice: { type: "function", function: { name: "set_placement" } },
          }),
        });
        if (vis.ok) {
          const vd = await vis.json();
          const pa = vd?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
          if (pa) {
            const p = JSON.parse(pa);
            placement = { ...placement, ...p };
          }
        }
      } catch (e) {
        console.warn("vision placement failed, using fallback", e);
      }

      // Persist generated_images row
      const { data: genRow } = await admin.from("generated_images").insert({
        user_id: userId,
        slideshow_id: slideshowId,
        slide_index: i,
        image_prompt: slide.image_prompt,
        style_keywords: styles,
        negative_space_position: slide.negative_space_position,
        image_url: permanentUrl,
        storage_path: storagePath,
        generation_model: "google/gemini-3-pro-image-preview",
        generation_time_ms: genTime,
        text_placement: placement,
      }).select("id").single();

      finalSlides.push({
        id: crypto.randomUUID(),
        type: slide.type || (i === 0 ? "hook" : "value"),
        text: clean(slide.text).slice(0, 400),
        image_id: null,
        image_url: permanentUrl,
        is_stock: false,
        is_generated: true,
        generated_image_id: genRow?.id || null,
        text_placement: placement,
        fabric_state: null,
      });
    }

    // === Final slide: product shot (CTA) ===
    await progress(admin, slideshowId, { phase: "assembling", current: rawSlides.length + 1, total: rawSlides.length + 1, label: "Assembling slideshow" });
    const productShot = productShots[Math.floor(Math.random() * productShots.length)];
    finalSlides.push({
      id: crypto.randomUUID(),
      type: "cta",
      text: clean(parsed.cta_text || workspace.default_cta || "try it now").slice(0, 400),
      image_id: productShot.id,
      image_url: null,
      is_stock: false,
      is_generated: false,
      text_placement: null,
      fabric_state: null,
    });

    await admin.from("slideshows").update({
      status: "ready",
      slides: finalSlides,
      image_ids: [productShot.id],
      generation_mode: "designed",
      design_styles: styles,
      generation_progress: { phase: "complete", current: 1, total: 1, label: "Done" },
      generation_error: null,
    }).eq("id", slideshowId);

    // Usage increment
    if (usage) {
      await admin.from("usage").update({ designed_slideshows_generated: designedThisMonth + 1, slideshows_generated: (usage as any).slideshows_generated || designedThisMonth + 1 }).eq("user_id", userId).eq("period_start", ps);
    } else {
      await admin.from("usage").insert({ user_id: userId, period_start: ps, slideshows_generated: 1, designed_slideshows_generated: 1 });
    }

    return j({ ok: true, slides: finalSlides });
  } catch (e: any) {
    console.error("generate-designed-slideshow error", e);
    return j({ error: e.message }, 500);
  }
});

function j(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
