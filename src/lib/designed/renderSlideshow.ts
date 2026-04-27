// Orchestrates client-side rendering of a clean designed slideshow.
// Takes the specs returned by the generate-clean-slideshow edge function,
// renders each to PNG via html2canvas, uploads to storage, and patches the
// slideshow row with slides[] containing image_url + spec metadata.

import { supabase } from "@/integrations/supabase/client";
import type { BrandIdentity } from "./brand";
import { renderAndUploadSlide, type SlideSpec } from "./renderer";

export interface RenderProgress {
  current: number;
  total: number;
  label: string;
}

export async function renderAndPersistSlideshow(opts: {
  slideshowId: string;
  userId: string;
  specs: SlideSpec[];
  brand: BrandIdentity;
  onProgress?: (p: RenderProgress) => void;
}): Promise<void> {
  const { slideshowId, userId, specs, brand, onProgress } = opts;
  const slides: any[] = [];

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    onProgress?.({ current: i, total: specs.length, label: `Rendering slide ${i + 1} of ${specs.length}` });

    const path = `${userId}/clean/${slideshowId}/${i}-${Date.now()}.png`;
    const { url, storage_path } = await renderAndUploadSlide(spec, brand, path);

    slides.push({
      id: crypto.randomUUID(),
      type: i === 0 ? "hook" : i === specs.length - 1 ? "cta" : "value",
      template: spec.template,
      icon: spec.icon ?? null,
      mood_override: spec.mood_override ?? null,
      variables: spec.variables,
      image_url: url,
      image_id: null,
      storage_path,
      is_clean_designed: true,
    });

    // Update progress in DB so other tabs see it
    await supabase
      .from("slideshows")
      .update({
        generation_progress: { phase: "rendering", current: i + 1, total: specs.length, label: `Rendered slide ${i + 1}/${specs.length}` },
      })
      .eq("id", slideshowId);
  }

  onProgress?.({ current: specs.length, total: specs.length, label: "Saving slideshow" });

  await supabase
    .from("slideshows")
    .update({
      slides: slides as any,
      status: "ready",
      generation_mode: "clean_designed",
      generation_progress: { phase: "complete", current: specs.length, total: specs.length, label: "Done" },
    })
    .eq("id", slideshowId);
}
