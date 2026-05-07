// HTML slide templates for designed slides. Each template is a 1080x1920 composition
// using only typography, geometric shapes, dividers, and inline SVG icons.
// Variables look like {{name}}. List blocks use {{#items}}...{{/items}}.
//
// Colors and fonts are pulled from CSS variables set on the wrapper:
//   --primary, --secondary, --bg, --text, --muted, --accent-muted,
//   --heading-font, --heading-weight, --body-font, --body-weight,
//   --corner-radius (e.g. "0px" / "8px" / "16px"),
//   --button-radius (e.g. "0px" / "10px" / "999px")

export type LayoutType =
  | "title_card"
  | "centered_text"
  | "big_number"
  | "list_items"
  | "step_number"
  | "highlight_box"
  | "cta_card"
  | "quote_style"
  | "story_canvas";

export interface SlideTemplate {
  name: string;
  layout_type: LayoutType;
  html: string;
  suitable_for: ("hook" | "value" | "cta" | "any")[];
  /** Variables this template expects. Used by editor's "Re-edit text" modal. */
  variables: { key: string; label: string; multiline?: boolean; type?: "text" | "number" | "list" }[];
}

const watermark = `
  <div data-watermark style="position:absolute;bottom:60px;right:80px;font-family:var(--body-font);font-weight:600;font-size:24px;color:var(--text);opacity:0.2;letter-spacing:0.02em;">
    {{brand_name}}
  </div>
`;

export const TEMPLATES: Record<LayoutType, SlideTemplate> = {
  title_card: {
    name: "title_card",
    layout_type: "title_card",
    suitable_for: ["hook"],
    variables: [
      { key: "label", label: "Eyebrow label" },
      { key: "heading", label: "Headline", multiline: true },
      { key: "subtext", label: "Subtext", multiline: true },
    ],
    html: `
<div style="width:1080px;height:1920px;background:var(--bg);display:flex;flex-direction:column;justify-content:center;align-items:center;padding:80px;box-sizing:border-box;position:relative;">
  <div style="position:absolute;top:120px;left:80px;right:80px;height:3px;background:var(--primary);opacity:0.4;"></div>
  <div style="font-family:var(--body-font);font-weight:600;font-size:28px;color:var(--primary);letter-spacing:0.18em;text-transform:uppercase;margin-bottom:40px;text-align:center;">
    {{label}}
  </div>
  <div style="font-family:var(--heading-font);font-weight:var(--heading-weight);font-size:{{heading_size}}px;color:var(--text);text-align:center;line-height:1.12;max-width:920px;letter-spacing:-0.02em;">
    {{heading}}
  </div>
  <div style="font-family:var(--body-font);font-weight:var(--body-weight);font-size:34px;color:var(--text);opacity:0.55;text-align:center;margin-top:44px;max-width:820px;line-height:1.5;">
    {{subtext}}
  </div>
  <div style="position:absolute;bottom:120px;left:80px;right:80px;height:3px;background:var(--primary);opacity:0.4;"></div>
  ${watermark}
</div>`.trim(),
  },

  centered_text: {
    name: "centered_text",
    layout_type: "centered_text",
    suitable_for: ["value", "any"],
    variables: [
      { key: "main_text", label: "Main text", multiline: true },
      { key: "support_text", label: "Supporting text", multiline: true },
    ],
    html: `
<div style="width:1080px;height:1920px;background:var(--bg);display:flex;flex-direction:column;justify-content:center;align-items:center;padding:80px;box-sizing:border-box;position:relative;">
  <div data-icon style="width:84px;height:84px;margin-bottom:52px;color:var(--primary);">
    {{icon_svg}}
  </div>
  <div style="font-family:var(--heading-font);font-weight:var(--heading-weight);font-size:{{text_size}}px;color:var(--text);text-align:center;line-height:1.25;max-width:880px;letter-spacing:-0.01em;">
    {{main_text}}
  </div>
  <div style="width:64px;height:3px;background:var(--primary);margin:44px 0;border-radius:2px;"></div>
  <div style="font-family:var(--body-font);font-weight:var(--body-weight);font-size:32px;color:var(--text);opacity:0.5;text-align:center;max-width:760px;line-height:1.5;">
    {{support_text}}
  </div>
  ${watermark}
</div>`.trim(),
  },

  big_number: {
    name: "big_number",
    layout_type: "big_number",
    suitable_for: ["value"],
    variables: [
      { key: "number", label: "Number / stat", type: "text" },
      { key: "unit", label: "Unit / label" },
      { key: "context", label: "Context", multiline: true },
    ],
    html: `
<div style="width:1080px;height:1920px;background:var(--bg);display:flex;flex-direction:column;justify-content:center;align-items:center;padding:80px;box-sizing:border-box;position:relative;">
  <div style="font-family:var(--heading-font);font-weight:900;font-size:280px;color:var(--primary);line-height:0.95;margin-bottom:24px;letter-spacing:-0.04em;">
    {{number}}
  </div>
  <div style="font-family:var(--body-font);font-weight:600;font-size:34px;color:var(--text);opacity:0.55;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:64px;text-align:center;">
    {{unit}}
  </div>
  <div style="font-family:var(--heading-font);font-weight:var(--heading-weight);font-size:54px;color:var(--text);text-align:center;line-height:1.3;max-width:820px;letter-spacing:-0.01em;">
    {{context}}
  </div>
  ${watermark}
</div>`.trim(),
  },

  list_items: {
    name: "list_items",
    layout_type: "list_items",
    suitable_for: ["value"],
    variables: [
      { key: "section_label", label: "Section label" },
      { key: "items", label: "Items (icon, title, description)", type: "list" },
    ],
    html: `
<div style="width:1080px;height:1920px;background:var(--bg);display:flex;flex-direction:column;justify-content:center;padding:100px;box-sizing:border-box;position:relative;">
  <div style="font-family:var(--body-font);font-weight:600;font-size:30px;color:var(--primary);letter-spacing:0.14em;text-transform:uppercase;margin-bottom:60px;">
    {{section_label}}
  </div>
  {{#items}}
  <div style="display:flex;align-items:flex-start;margin-bottom:48px;">
    <div data-icon style="width:56px;height:56px;min-width:56px;margin-right:32px;margin-top:6px;color:var(--primary);">
      {{item_icon_svg}}
    </div>
    <div style="flex:1;">
      <div style="font-family:var(--heading-font);font-weight:var(--heading-weight);font-size:44px;color:var(--text);margin-bottom:10px;line-height:1.2;letter-spacing:-0.01em;">
        {{item_title}}
      </div>
      <div style="font-family:var(--body-font);font-weight:var(--body-weight);font-size:30px;color:var(--text);opacity:0.5;line-height:1.45;">
        {{item_description}}
      </div>
    </div>
  </div>
  {{/items}}
  ${watermark}
</div>`.trim(),
  },

  step_number: {
    name: "step_number",
    layout_type: "step_number",
    suitable_for: ["value"],
    variables: [
      { key: "step_number", label: "Step number", type: "number" },
      { key: "instruction", label: "Instruction", multiline: true },
      { key: "detail", label: "Detail", multiline: true },
    ],
    html: `
<div style="width:1080px;height:1920px;background:var(--bg);display:flex;flex-direction:column;justify-content:center;align-items:center;padding:80px;box-sizing:border-box;position:relative;">
  <div style="font-family:var(--heading-font);font-weight:900;font-size:220px;color:var(--primary);opacity:0.16;line-height:0.9;margin-bottom:-30px;letter-spacing:-0.04em;">
    {{step_number}}
  </div>
  <div style="font-family:var(--body-font);font-weight:600;font-size:30px;color:var(--primary);letter-spacing:0.14em;text-transform:uppercase;margin-bottom:36px;">
    STEP {{step_number}}
  </div>
  <div style="font-family:var(--heading-font);font-weight:var(--heading-weight);font-size:60px;color:var(--text);text-align:center;line-height:1.25;max-width:870px;letter-spacing:-0.01em;">
    {{instruction}}
  </div>
  <div style="font-family:var(--body-font);font-weight:var(--body-weight);font-size:32px;color:var(--text);opacity:0.5;text-align:center;margin-top:40px;max-width:760px;line-height:1.5;">
    {{detail}}
  </div>
  ${watermark}
</div>`.trim(),
  },

  highlight_box: {
    name: "highlight_box",
    layout_type: "highlight_box",
    suitable_for: ["value"],
    variables: [
      { key: "context_above", label: "Context above", multiline: true },
      { key: "highlight_text", label: "Highlighted text", multiline: true },
      { key: "context_below", label: "Context below", multiline: true },
    ],
    html: `
<div style="width:1080px;height:1920px;background:var(--bg);display:flex;flex-direction:column;justify-content:center;align-items:center;padding:80px;box-sizing:border-box;position:relative;">
  <div style="font-family:var(--body-font);font-weight:var(--body-weight);font-size:34px;color:var(--text);opacity:0.55;text-align:center;margin-bottom:48px;max-width:820px;line-height:1.5;">
    {{context_above}}
  </div>
  <div style="background:var(--accent-muted);border-left:5px solid var(--primary);padding:48px 56px;border-radius:var(--corner-radius);max-width:880px;width:100%;box-sizing:border-box;">
    <div style="font-family:var(--heading-font);font-weight:var(--heading-weight);font-size:50px;color:var(--text);line-height:1.32;letter-spacing:-0.01em;">
      {{highlight_text}}
    </div>
  </div>
  <div style="font-family:var(--body-font);font-weight:var(--body-weight);font-size:34px;color:var(--text);opacity:0.55;text-align:center;margin-top:48px;max-width:820px;line-height:1.5;">
    {{context_below}}
  </div>
  ${watermark}
</div>`.trim(),
  },

  cta_card: {
    name: "cta_card",
    layout_type: "cta_card",
    suitable_for: ["cta"],
    variables: [
      { key: "cta_heading", label: "CTA heading", multiline: true },
      { key: "cta_text", label: "Button text" },
      { key: "brand_url", label: "URL" },
    ],
    html: `
<div style="width:1080px;height:1920px;background:var(--bg);display:flex;flex-direction:column;justify-content:center;align-items:center;padding:80px;box-sizing:border-box;position:relative;">
  <div data-icon style="width:88px;height:88px;margin-bottom:52px;color:var(--primary);">
    {{icon_svg}}
  </div>
  <div style="font-family:var(--heading-font);font-weight:var(--heading-weight);font-size:68px;color:var(--text);text-align:center;line-height:1.18;max-width:860px;margin-bottom:48px;letter-spacing:-0.02em;">
    {{cta_heading}}
  </div>
  <div style="background:var(--primary);color:#FFFFFF;font-family:var(--heading-font);font-weight:700;font-size:38px;padding:28px 72px;border-radius:var(--button-radius);letter-spacing:0.01em;">
    {{cta_text}}
  </div>
  <div style="font-family:var(--body-font);font-weight:500;font-size:32px;color:var(--text);opacity:0.45;margin-top:32px;letter-spacing:0.02em;">
    {{brand_url}}
  </div>
  <div style="position:absolute;bottom:100px;left:80px;right:80px;height:3px;background:var(--primary);opacity:0.3;"></div>
</div>`.trim(),
  },

  quote_style: {
    name: "quote_style",
    layout_type: "quote_style",
    suitable_for: ["hook", "value"],
    variables: [
      { key: "quote_text", label: "Quote", multiline: true },
      { key: "attribution", label: "Attribution" },
    ],
    html: `
<div style="width:1080px;height:1920px;background:var(--bg);display:flex;flex-direction:column;justify-content:center;align-items:center;padding:80px;box-sizing:border-box;position:relative;">
  <div style="font-family:Georgia,serif;font-size:340px;color:var(--primary);opacity:0.14;line-height:0.55;margin-bottom:-50px;font-weight:700;">
    &ldquo;
  </div>
  <div style="font-family:var(--heading-font);font-weight:var(--heading-weight);font-size:54px;color:var(--text);text-align:center;line-height:1.4;max-width:820px;font-style:italic;letter-spacing:-0.01em;">
    {{quote_text}}
  </div>
  <div style="font-family:var(--body-font);font-weight:600;font-size:28px;color:var(--primary);margin-top:48px;letter-spacing:0.08em;text-transform:uppercase;">
    {{attribution}}
  </div>
  ${watermark}
</div>`.trim(),
  },
  story_canvas: {
    name: "story_canvas",
    layout_type: "story_canvas",
    suitable_for: ["hook", "value", "cta", "any"],
    variables: [
      { key: "story_html", label: "Story HTML", multiline: true },
    ],
    // Pure pass-through: Claude writes the entire 1080x1920 slide HTML.
    html: `{{story_html}}`,
  },
};

export const TEMPLATE_LIST = Object.values(TEMPLATES);
