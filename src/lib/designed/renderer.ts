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
const RAW_KEYS = new Set(["icon_svg", "item_icon_svg", "story_extras", "story_html"]);

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

function hexToRgb(hex: string): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return "255,59,92";
  return `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}`;
}

function buildStoryExtras(primaryHex: string): string {
  const rgb = hexToRgb(primaryHex);
  const elements: string[] = [];
  // Pick 0-2 elements
  const count = Math.floor(Math.random() * 3);
  const pool = [
    // Floating stat card (top-right)
    () => {
      const stats = ["34k", "12k", "1.2M", "847", "92%", "3.4x"];
      const labels = ["views", "signups", "saved", "shipped", "users", "growth"];
      const stat = stats[Math.floor(Math.random() * stats.length)];
      const label = labels[Math.floor(Math.random() * labels.length)];
      return `<div style="position:absolute;top:140px;right:100px;background:rgba(${rgb},0.08);border:1px solid rgba(${rgb},0.25);border-radius:14px;padding:18px 28px;">
        <div style="font-family:var(--heading-font);font-size:36px;font-weight:700;color:rgb(${rgb});">${stat}</div>
        <div style="font-family:var(--body-font);font-size:14px;color:#666;letter-spacing:0.05em;">${label}</div>
      </div>`;
    },
    // Dotted curved arrow (bottom-left)
    () => `<svg style="position:absolute;bottom:200px;left:90px;width:140px;height:80px;pointer-events:none;">
        <path d="M10 10 Q70 70 130 10" stroke="rgb(${rgb})" stroke-width="2.5" stroke-dasharray="5 5" fill="none" opacity="0.7"/>
      </svg>`,
    // Small accent dot cluster (top-left)
    () => `<div style="position:absolute;top:160px;left:100px;display:flex;gap:10px;">
        <div style="width:12px;height:12px;border-radius:50%;background:rgb(${rgb});opacity:0.7;"></div>
        <div style="width:12px;height:12px;border-radius:50%;background:rgb(${rgb});opacity:0.4;"></div>
        <div style="width:12px;height:12px;border-radius:50%;background:rgb(${rgb});opacity:0.2;"></div>
      </div>`,
    // Star icon (bottom-right area)
    () => `<svg style="position:absolute;bottom:220px;right:130px;width:48px;height:48px;color:rgb(${rgb});opacity:0.75;" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>`,
    // Underline swoosh below text area
    () => `<svg style="position:absolute;bottom:300px;left:160px;width:280px;height:24px;pointer-events:none;">
        <path d="M5 12 Q140 4 275 14" stroke="rgb(${rgb})" stroke-width="4" fill="none" opacity="0.6" stroke-linecap="round"/>
      </svg>`,
  ];
  // Shuffle
  const shuffled = pool.sort(() => Math.random() - 0.5);
  for (let i = 0; i < count && i < shuffled.length; i++) {
    elements.push(shuffled[i]());
  }
  return elements.join("\n");
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

  // story_canvas: Claude provides full slide HTML in story_html. Fallback for legacy
  // slides that only carry story_text: wrap as a minimal full-bleed slide.
  if (spec.template === "story_canvas" && !vars.story_html) {
    const txt = escapeHtml(String(vars.story_text || "")).replace(/\n/g, "<br>");
    vars.story_html = `<div style="width:1080px;height:1920px;background:#FFFFFF;position:relative;font-family:Inter,sans-serif;"><div style="position:absolute;left:100px;right:100px;top:50%;transform:translateY(-50%);font-weight:500;font-size:54px;color:#1A1A1A;line-height:1.4;text-align:center;">${txt}</div></div>`;
  }

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

  // For story_canvas: ensure the root div has position:relative so absolute children
  // resolve against the 1080x1920 slide box, not the viewport. We patch the first
  // opening <div style="..."> tag rather than wrapping (which breaks html2canvas).
  if (spec.template === "story_canvas") {
    html = html.replace(/^(\s*<div\s+style=")/, '$1position:relative;');
  }

  return `<div style="${cssVars}">${html}</div>`;
}

/** Render resolved HTML to a 1080×1920 PNG Blob.
 *  Uses a hidden iframe so the slide gets its own document context —
 *  fonts load correctly, styles don't bleed from the parent page. */
export async function renderSlideToPng(html: string, brand: BrandIdentity): Promise<Blob> {
  ensureFontLoaded(brand.heading_font, [brand.heading_weight, "400", "600"]);
  if (brand.body_font !== brand.heading_font) ensureFontLoaded(brand.body_font, [brand.body_weight, "400", "600"]);

  // Collect font <link> tags already injected in the parent document so the
  // iframe can load the same typefaces.
  const fontLinks = Array.from(document.head.querySelectorAll('link[rel="stylesheet"]'))
    .map((l) => (l as HTMLLinkElement).outerHTML)
    .join("\n");

  const docHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">
${fontLinks}
<style>*{margin:0;padding:0;box-sizing:border-box;}html,body{width:1080px;height:1920px;overflow:hidden;}</style>
</head><body>${html}</body></html>`;

  return new Promise<Blob>((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:1080px;height:1920px;border:none;visibility:hidden;";

    const cleanup = () => { try { document.body.removeChild(iframe); } catch { /* already removed */ } };

    iframe.onload = async () => {
      try {
        const doc = iframe.contentDocument!;
        // Wait for fonts inside the iframe
        if (doc.fonts?.ready) await doc.fonts.ready;
        await new Promise((r) => setTimeout(r, 350));

        const canvas = await html2canvas(doc.body, {
          width: 1080,
          height: 1920,
          windowWidth: 1080,
          windowHeight: 1920,
          scale: 1,
          useCORS: true,
          allowTaint: false,
          backgroundColor: null,
          logging: false,
        });

        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
          "image/png",
          0.95,
        );
      } catch (e) {
        reject(e);
      } finally {
        cleanup();
      }
    };

    iframe.onerror = () => { cleanup(); reject(new Error("iframe failed to load")); };
    document.body.appendChild(iframe);
    iframe.srcdoc = docHtml;
  });
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
