// Realtime progress screen shown while a slideshow is being generated.
// Subscribes to slideshows row updates via Supabase Realtime and shows
// step-by-step progress. For clean_designed mode it also drives client-side
// rendering once the edge function returns specs.

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Circle, AlertCircle } from "lucide-react";
import { SEO } from "@/components/SEO";
import { renderAndPersistSlideshow } from "@/lib/designed/renderSlideshow";
import type { BrandIdentity } from "@/lib/designed/brand";
import { toast } from "sonner";

interface Progress {
  step: string;
  step_index: number;
  total_steps: number;
  message: string;
  percent: number;
}

const STEPS = [
  { key: "started", label: "Analyzing your topic" },
  { key: "writing_copy", label: "Writing slide scripts" },
  { key: "rendering", label: "Designing your slides" },
  { key: "finishing", label: "Wrapping up" },
];

const Generating = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<Progress>({ step: "started", step_index: 0, total_steps: 4, message: "Starting up…", percent: 0 });
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  // Kick off generation once. For clean_designed: invoke fn → render client-side.
  // For photo: invoke fn (server marks status=ready when done).
  useEffect(() => {
    if (!id || !user || startedRef.current) return;
    startedRef.current = true;
    (async () => {
      const { data: ss, error: ssErr } = await supabase.from("slideshows").select("*").eq("id", id).single();
      if (ssErr || !ss) { setError("Slideshow not found"); return; }
      // Skip if already complete
      if (ss.status === "ready") { navigate(`/slideshows/${id}/edit`); return; }
      if (ss.status === "failed") { setError(ss.generation_error || "Generation failed"); return; }

      const isDesigned = ss.generation_mode === "clean_designed";

      try {
        if (isDesigned) {
          const { data: fnData, error: fnErr } = await supabase.functions.invoke("generate-clean-slideshow", {
            body: { slideshowId: id },
          });
          if (fnErr) throw fnErr;
          const err = (fnData as any)?.error;
          if (err) {
            if (err === "brand_required") { toast.error("Set up your brand identity first."); navigate("/brand"); return; }
            throw new Error(err);
          }
          const specs = (fnData as any).slides || [];
          const brand = (fnData as any).brand as BrandIdentity;
          await renderAndPersistSlideshow({
            slideshowId: id,
            userId: user.id,
            specs,
            brand,
            onProgress: (p) => {
              const percent = 50 + Math.round((p.current / Math.max(p.total, 1)) * 35);
              setProgress({ step: "rendering", step_index: 2, total_steps: 4, message: p.label, percent });
            },
          });
          // renderAndPersistSlideshow sets status=ready; realtime subscriber will navigate
        } else {
          const { error: fnErr, data: fnData } = await supabase.functions.invoke("generate-slideshow", {
            body: { slideshowId: id },
          });
          if (fnErr) throw fnErr;
          const err = (fnData as any)?.error;
          if (err) {
            if (err === "no_product_shot") { toast.error("Upload a product image first."); navigate("/library?upload=product"); return; }
            throw new Error(err);
          }
        }
      } catch (e: any) {
        console.error(e);
        setError(e.message || "Generation failed");
        await supabase.from("slideshows").update({ status: "failed", generation_error: e.message?.slice(0, 300) || "unknown" }).eq("id", id);
      }
    })();
  }, [id, user, navigate]);

  // Realtime subscription to the slideshow row
  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`slideshow-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "slideshows", filter: `id=eq.${id}` },
        (payload: any) => {
          const row = payload.new;
          if (row.generation_progress?.step) setProgress(row.generation_progress);
          if (row.status === "ready") {
            setProgress({ step: "complete", step_index: 4, total_steps: 4, message: "Done!", percent: 100 });
            setTimeout(() => navigate(`/slideshows/${id}/edit`), 600);
          }
          if (row.status === "failed") setError(row.generation_error || "Generation failed");
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, navigate]);

  // Poll fallback (in case realtime is delayed): every 3s check status
  useEffect(() => {
    if (!id) return;
    const t = setInterval(async () => {
      const { data } = await supabase.from("slideshows").select("status, generation_progress, generation_error").eq("id", id).single();
      if (!data) return;
      if (data.generation_progress && (data.generation_progress as any).step) setProgress(data.generation_progress as any);
      if (data.status === "ready") { clearInterval(t); navigate(`/slideshows/${id}/edit`); }
      if (data.status === "failed") { clearInterval(t); setError(data.generation_error || "Generation failed"); }
    }, 3000);
    return () => clearInterval(t);
  }, [id, navigate]);

  const activeStepIdx = STEPS.findIndex((s) => s.key === progress.step);

  return (
    <>
      <SEO title="Generating slideshow" description="AdRise is creating your slideshow" />
      <div className="min-h-[calc(100vh-3rem)] flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          <h1 className="font-display text-2xl font-bold text-center mb-8">
            AdRise is creating your slideshow
          </h1>

          <div className="space-y-3 mb-8">
            {STEPS.map((s, i) => {
              const done = i < activeStepIdx || progress.step === "complete";
              const active = i === activeStepIdx && progress.step !== "complete";
              return (
                <div key={s.key} className="flex items-center gap-3 text-sm">
                  {done ? (
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                  ) : active ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span className={done || active ? "text-foreground" : "text-muted-foreground"}>{s.label}</span>
                </div>
              );
            })}
          </div>

          <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${Math.min(100, progress.percent || 0)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">{progress.message}</p>

          {progress.step === "rendering" && (
            <p className="text-[11px] text-muted-foreground text-center mt-2">
              Rendering happens in your browser — keep this tab open.
            </p>
          )}

          {error && (
            <div className="mt-8 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-destructive">Something went wrong</p>
                  <p className="text-muted-foreground text-xs mt-1">{error}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button asChild size="sm" variant="outline"><Link to="/slideshows/new">Try again</Link></Button>
                <Button asChild size="sm" variant="ghost"><Link to="/slideshows">Go back</Link></Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Generating;
