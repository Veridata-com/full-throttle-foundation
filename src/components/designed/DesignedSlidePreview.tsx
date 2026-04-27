// Live preview of a designed slide. Renders the template HTML into a scaled iframe-like
// container so the user can see exactly what the exported PNG will look like.
import { useMemo } from "react";
import { resolveSlideHtml, type SlideSpec } from "@/lib/designed/renderer";
import type { BrandIdentity } from "@/lib/designed/brand";
import { ensureFontLoaded } from "@/lib/designed/renderer";

interface Props {
  brand: BrandIdentity;
  spec: SlideSpec;
  /** Display height in pixels (preserves 9:16). */
  height?: number;
  className?: string;
}

export function DesignedSlidePreview({ brand, spec, height = 480, className }: Props) {
  // Ensure fonts are requested for previews too
  ensureFontLoaded(brand.heading_font, [brand.heading_weight, "400", "600"]);
  if (brand.body_font !== brand.heading_font) ensureFontLoaded(brand.body_font, [brand.body_weight, "400", "600"]);

  const html = useMemo(() => resolveSlideHtml({ brand, spec }), [brand, spec]);

  // 1080×1920 source, scale to target height
  const scale = height / 1920;
  const width = 1080 * scale;

  return (
    <div
      className={className}
      style={{
        width,
        height,
        overflow: "hidden",
        position: "relative",
        borderRadius: 12,
        border: "1px solid hsl(var(--border))",
        boxShadow: "0 8px 24px -8px hsl(var(--background))",
      }}
    >
      <div
        style={{
          width: 1080,
          height: 1920,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
        // The slide HTML is fully author-controlled (templates + AI variables we sanitize)
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
