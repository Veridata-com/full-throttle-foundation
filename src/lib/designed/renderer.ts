// Client-side designed-slide renderer.
// Pipeline: template HTML + variables + brand identity → fully-resolved HTML →
// rendered offscreen at 1080×1920 → html2canvas → PNG blob → uploaded to storage.

import html2canvas from "html2canvas";
import { TEMPLATES, type LayoutType } from "./templates";
import { getIconSvg } from "./icons";
import { type BrandIdentity, CORNER_RADIUS_PX, FONT_OPTIONS } from "./brand";
import { supabase } from "@/integrations/supabase/client";

export interface SlideSpec {
  template: LayoutType;
  /** Override mood for this slide ("dark" | "light"). Null = use brand default. */
  mood_override?: "dark" | "light" | null;
  /** Icon name (from icons.ts) used by templates that have a top icon. */
  icon?: string | null;
  variables: Record<string, any>;
}

/** Loaded font names so we don't double-inject <link> tags. */
const loadedFonts = new Set<string>();

export function ensureFontLoaded(fontName: string, weights: string[] = ["400", "600", "700", "800", "900"]) {
  const key = `${fontName}|${weights.join(",")}`;
  if (loadedFonts.has(key)) return;
  loadedFonts.add(key);

  const opt = FONT_OPTIONS.find((f) => f.name === fontName);
  if (!opt || opt.source === "google") {
    // Google Fonts
    const family = fontName.replace(/ /g, "+");
    const wghts = weights.join(";");
    const href = `https://fonts.googleapis.com/css2?family=${family}:wght@${wghts}&display=swap`;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  } else {
    // Fontshare — just use the all-weights stylesheet (one per family)
    const slug = fontName.toLowerCase().replace(/ /g, "-");
    const href = `https://api.fontshare.com/v2/css?f[]=${slug}@1,2,3,4,5,6,7,8,9&display=swap`;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }
}

export async function waitForFont(fontName: string, weight: string, timeoutMs = 3000): Promise<void> {
  if (typeof (document as any).fonts?.load !== "function") return;
  const t0 = Date.now();
  try {
    await Promise.race([
      (document as any).fonts.load(`${weight} 16px "${fontName}"`),
      new Promise((res) => setTimeout(res, timeoutMs)),
    ]);
  } catch {
    /* swallow */
  }
  // Tiny extra wait so glyph atlas is ready
  if (Date.now() - t0 < 200) await new Promise((r) => setTimeout(r, 200));
}

function escapeHtml(s: string): string {
  return String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] || c);
}

/** Keys whose value is raw HTML/SVG and must NOT be escaped. */
const RAW_KEYS = new Set(["icon_svg", "item_icon_svg", "story_extras"]);

/** Replace {{key}} with value. Escapes text; passes SVG/HTML through for raw keys. */
function fillVars(html: string, vars: Record<string, any>): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    const v = vars[k];
    if (v === undefined || v === null) return "";
    if (RAW_KEYS.has(k)) return String(v);
    return escapeHtml(String(v)).replace(/\n/g, "<br>");
  });
}

/** Expand {{#items}}...{{/items}} blocks for list_items template. */
function expandLists(html: string, vars: Record<string, any>): string {
  return html.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, key, block) => {
    const arr = vars[key];
    if (!Array.isArray(arr)) return "";
    return arr
      .map((item: any) => {
        const itemVars = { ...item };
        if (item.icon) itemVars.item_icon_svg = getIconSvg(item.icon);
        return fillVars(block, itemVars);
      })
      .join("");
  });
}

function bgFor(brand: BrandIdentity, moodOverride?: "dark" | "light" | null): { bg: string; text: string } {
  const mood = moodOverride || (brand.slide_mood === "mixed" ? "dark" : brand.slide_mood);
  if (mood === "light") return { bg: brand.background_light, text: brand.text_on_light };
  return { bg: brand.background_dark, text: brand.text_on_dark };
}

export interface ResolveOptions {
  brand: BrandIdentity;
  spec: SlideSpec;
  /** Auto-fit heading size based on length when template uses it. */
}

/** Render a slide spec to a fully-resolved HTML string (1080×1920) with brand CSS variables. */
export function resolveSlideHtml({ brand, spec }: ResolveOptions): string {
  const tpl = TEMPLATES[spec.template];
  if (!tpl) throw new Error(`Unknown template: ${spec.template}`);

  const { bg, text } = bgFor(brand, spec.mood_override ?? null);
  const radius = CORNER_RADIUS_PX[brand.corner_radius] || CORNER_RADIUS_PX.subtle;

  // Auto-fit heading size when template asks for {{heading_size}} and value not provided
  const vars: Record<string, any> = { ...spec.variables };
  if (vars.heading && vars.heading_size === undefined) {
    const len = String(vars.heading).length;
    vars.heading_size = len < 24 ? 96 : len < 40 ? 80 : len < 60 ? 66 : len < 90 ? 54 : 44;
  }
  if (vars.main_text && vars.text_size === undefined) {
    const len = String(vars.main_text).length;
    vars.text_size = len < 30 ? 70 : len < 60 ? 58 : len < 100 ? 48 : 40;
  }
  if (spec.icon && vars.icon_svg === undefined) vars.icon_svg = getIconSvg(spec.icon);
  if (vars.brand_name === undefined) vars.brand_name = brand.brand_name;
  if (vars.brand_url === undefined) vars.brand_url = brand.brand_url || "";

  const cssVars = `
    --primary: ${brand.primary_color};
    --secondary: ${brand.secondary_color || brand.primary_color};
    --bg: ${bg};
    --text: ${text};
    --muted: ${brand.accent_muted || "#222"};
    --accent-muted: ${brand.accent_muted || "#222"};
    --heading-font: '${brand.heading_font}', sans-serif;
    --heading-weight: ${brand.heading_weight};
    --body-font: '${brand.body_font}', sans-serif;
    --body-weight: ${brand.body_weight};
    --corner-radius: ${radius.card};
    --button-radius: ${radius.button};
  `.trim();

  let html = tpl.html;
  html = expandLists(html, vars);
  html = fillVars(html, vars);

  // Strip watermark if disabled
  if (!brand.use_brand_watermark) {
    html = html.replace(/<div data-watermark[\s\S]*?<\/div>/g, "");
  }
  // Strip icons if disabled (replace with empty container so layout doesn't shift hard)
  if (!brand.use_icons) {
    html = html.replace(/<div data-icon[\s\S]*?<\/div>/g, '<div style="height:0;"></div>');
  }

  return `<div style="${cssVars}">${html}</div>`;
}

/** Render resolved HTML to a 1080×1920 PNG Blob using html2canvas. */
export async function renderSlideToPng(html: string, brand: BrandIdentity): Promise<Blob> {
  // Make sure fonts are loaded before rasterizing
  ensureFontLoaded(brand.heading_font, [brand.heading_weight, "400", "600"]);
  if (brand.body_font !== brand.heading_font) ensureFontLoaded(brand.body_font, [brand.body_weight, "400", "600"]);
  await waitForFont(brand.heading_font, brand.heading_weight);
  await waitForFont(brand.body_font, brand.body_weight);

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "0";
  container.style.width = "1080px";
  container.style.height = "1920px";
  container.style.pointerEvents = "none";
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
      width: 1080,
      height: 1920,
      windowWidth: 1080,
      windowHeight: 1920,
      scale: 1,
      useCORS: true,
      backgroundColor: null,
      logging: false,
    });
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png", 0.95);
    });
  } finally {
    document.body.removeChild(container);
  }
}

/** Render + upload one slide. Returns a signed URL good for 7 days. */
export async function renderAndUploadSlide(
  spec: SlideSpec,
  brand: BrandIdentity,
  storagePath: string,
): Promise<{ url: string; storage_path: string }> {
  const html = resolveSlideHtml({ brand, spec });
  const blob = await renderSlideToPng(html, brand);

  const { error: upErr } = await supabase.storage
    .from("generated-images")
    .upload(storagePath, blob, { contentType: "image/png", upsert: true });
  if (upErr) throw upErr;

  const { data: signed, error: sErr } = await supabase.storage
    .from("generated-images")
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7);
  if (sErr || !signed) throw sErr || new Error("sign failed");

  return { url: signed.signedUrl, storage_path: storagePath };
}
