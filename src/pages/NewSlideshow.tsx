import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Upload, AlertCircle, Image as ImageIcon, Layers, Wand2, Check, Circle } from "lucide-react";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";
import { ImageSourceToggle, type ImageSource } from "@/components/ImageSourceToggle";
import { renderAndPersistSlideshow } from "@/lib/designed/renderSlideshow";
import type { BrandIdentity } from "@/lib/designed/brand";

type Mode = "auto" | "photo" | "designed";

const NewSlideshow = () => {
  const { user, profile } = useAuth();
  const { current } = useWorkspace();
  const navigate = useNavigate();
  const [numSlides, setNumSlides] = useState(6);
  const [hookStyle, setHookStyle] = useState("curiosity");
  const [loading, setLoading] = useState(false);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [imageSource, setImageSource] = useState<ImageSource>("both");
  const [noImagesErr, setNoImagesErr] = useState(false);
  const [mode, setMode] = useState<Mode>("auto");
  const [designStyles, setDesignStyles] = useState<string[]>(["dark"]);

  // Live progress (for designed/auto-resolved-to-designed)
  const [progress, setProgress] = useState<{ phase: string; current: number; total: number; label: string } | null>(null);
  const [progressShowId, setProgressShowId] = useState<string | null>(null);

  const allowed: string[] = useMemo(() => (current as any)?.allowed_generation_modes?.length ? (current as any).allowed_generation_modes : ["photo", "designed"], [current]);

  useEffect(() => {
    setImageSource((profile?.default_image_source as ImageSource) || "both");
  }, [profile]);

  useEffect(() => {
    if (!current) return;
    supabase.from("images").select("id", { count: "exact", head: true })
      .eq("workspace_id", current.id).eq("is_product_shot", true)
      .then(({ count }) => setProductCount(count || 0));
  }, [current]);

  // Poll generation_progress while a designed slideshow is being built
  useEffect(() => {
    if (!progressShowId) return;
    const t = setInterval(async () => {
      const { data } = await supabase.from("slideshows").select("status, generation_progress, generation_error").eq("id", progressShowId).single();
      if (!data) return;
      const p = (data as any).generation_progress || {};
      if (p.phase) setProgress(p);
      if (data.status === "ready") { clearInterval(t); }
      if (data.status === "failed") { clearInterval(t); }
    }, 1500);
    return () => clearInterval(t);
  }, [progressShowId]);

  if (!current) {
    return (
      <div className="container py-16 text-center">
        <p className="text-muted-foreground mb-4">Create a workspace first.</p>
        <Button asChild><Link to="/workspaces/new">New workspace</Link></Button>
      </div>
    );
  }

  if (productCount === 0) {
    return (
      <>
        <SEO title="New slideshow" description="Generate a slideshow." />
        <div className="container py-16 max-w-xl">
          <Card className="p-8 text-center shadow-card border-destructive/30">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
            <h2 className="font-display text-2xl font-bold mb-2">Add a product slide image first</h2>
            <p className="text-muted-foreground mb-6">
              Every slideshow ends with one of your product shots. Upload at least one to <strong>{current.name}</strong> before generating.
            </p>
            <Button asChild size="lg" className="shadow-glow">
              <Link to="/library?upload=product"><Upload className="h-4 w-4" /> Upload product slide image</Link>
            </Button>
          </Card>
        </div>
      </>
    );
  }

  // Resolve which mode to actually use
  const resolveMode = (): "photo" | "designed" => {
    if (mode === "photo") return "photo";
    if (mode === "designed") return "designed";
    // auto: pick from workspace-allowed modes. If both, randomize so AI tests both.
    if (allowed.includes("photo") && allowed.includes("designed")) {
      return Math.random() < 0.5 ? "photo" : "designed";
    }
    if (allowed.includes("designed")) return "designed";
    return "photo";
  };

  const toggleStyle = (id: string) => {
    setDesignStyles((prev) => {
      if (prev.includes(id)) return prev.length === 1 ? prev : prev.filter((s) => s !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const generate = async () => {
    if (!user) return;
    setLoading(true);
    setProgress(null);
    setProgressShowId(null);
    try {
      const chosen = resolveMode();
      const { data: ss, error } = await supabase.from("slideshows").insert({
        user_id: user.id,
        workspace_id: current.id,
        title: `${current.name} — ${new Date().toLocaleDateString()}`,
        hook_style: hookStyle,
        num_slides: numSlides,
        status: "generating",
        generation_mode: chosen,
        design_styles: chosen === "designed" ? designStyles : [],
      } as any).select().single();
      if (error) throw error;

      if (chosen === "designed") {
        setProgressShowId(ss.id);
        setProgress({ phase: "writing", current: 0, total: numSlides + 1, label: "Writing slide scripts" });
      }

      const fnName = chosen === "designed" ? "generate-designed-slideshow" : "generate-slideshow";
      const fnBody: any = chosen === "designed"
        ? { slideshowId: ss.id, design_styles: designStyles }
        : { slideshowId: ss.id, image_source: imageSource };

      const { error: fnErr, data: fnData } = await supabase.functions.invoke(fnName, { body: fnBody });
      if (fnErr) throw fnErr;
      const err = (fnData as any)?.error;
      if (err) {
        if (err === "plan_required") { toast.error("Active plan required."); navigate("/billing"); return; }
        if (err === "quota_exceeded") { toast.error("Starter monthly limit reached. Upgrade to Pro."); navigate("/billing"); return; }
        if (err === "designed_quota_exceeded") { toast.error("Designed slideshow limit (15/mo on Starter). Upgrade to Pro."); navigate("/billing"); return; }
        if (err === "no_product_shot") { toast.error("Upload a product image in workspace settings."); return; }
        if (err === "no_images") { setNoImagesErr(true); return; }
        if (err === "rate_limit") { toast.error("Rate limited, try again in a moment."); return; }
        if (err === "payment_required") { toast.error("AI credits needed. Add credits in Lovable workspace."); return; }
        if (err === "cost_cap_reached") { toast.error("Monthly AI cost cap reached for your plan. Resets next month."); return; }
        if (err === "image_failed") { toast.error("Image generation failed. Try again."); return; }
        throw new Error(err);
      }

      toast.success("Slideshow generated");
      navigate(`/slideshows/${ss.id}/edit`);
    } catch (err: any) {
      toast.error(err.message || "Generation failed");
    } finally { setLoading(false); }
  };

  // Mode cards — only show modes the workspace allows
  const modeOptions: { id: Mode; label: string; desc: string; Icon: any }[] = ([
    { id: "auto" as Mode, label: "Let AI choose", desc: "AI tests both modes to learn what works best.", Icon: Wand2 },
    { id: "photo" as Mode, label: "Photo slides", desc: "Use uploaded or stock photos.", Icon: ImageIcon },
    { id: "designed" as Mode, label: "AI-designed", desc: "Custom AI visuals + smart text placement.", Icon: Sparkles },
  ]).filter((o) => o.id === "auto" ? allowed.length > 1 : allowed.includes(o.id));

  return (
    <>
      <SEO title="New slideshow" description="Generate a slideshow." />
      <div className="container py-8 max-w-2xl">
        <h1 className="font-display text-3xl font-bold mb-2">New slideshow</h1>
        <p className="text-muted-foreground mb-6">Set the inputs — the AI handles the rest. Last slide always uses your product shot.</p>

        <Card className="p-6 space-y-6 shadow-card">
          {/* Mode selector */}
          {modeOptions.length > 1 && (
            <div className="space-y-3">
              <Label>How should the slides look?</Label>
              <div className="grid sm:grid-cols-3 gap-3">
                {modeOptions.map((m) => {
                  const active = mode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMode(m.id)}
                      className={`text-left rounded-xl border-2 p-4 transition relative ${active ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "border-border hover:border-muted-foreground"}`}
                    >
                      {m.id === "designed" && <span className="absolute top-2 right-2 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-bold">NEW</span>}
                      <m.Icon className="h-5 w-5 mb-2" />
                      <div className="font-semibold text-sm">{m.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">{m.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Design styles (only when designed) */}
          {(mode === "designed" || (mode === "auto" && allowed.includes("designed"))) && (
            <div className="space-y-2">
              <Label>Design style {mode === "auto" && <span className="text-xs text-muted-foreground font-normal">(used if AI picks designed mode)</span>}</Label>
              <div className="flex flex-wrap gap-2">
                {DESIGN_STYLES.map((s) => {
                  const active = designStyles.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleStyle(s.id)}
                      className={`text-xs rounded-lg px-3 py-2 border transition ${active ? "bg-primary text-primary-foreground border-primary" : "bg-muted/30 text-muted-foreground border-border hover:border-muted-foreground"}`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">Pick 1-2 styles. The AI will blend them.</p>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Number of slides</Label>
              <span className="text-lg font-bold font-display">{numSlides}</span>
            </div>
            <Slider value={[numSlides]} min={3} max={12} step={1} onValueChange={([v]) => setNumSlides(v)} />
            <p className="text-xs text-muted-foreground">3 to 12 slides.</p>
          </div>

          <div className="space-y-2">
            <Label>Hook style</Label>
            <Select value={hookStyle} onValueChange={setHookStyle}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="curiosity">Curiosity</SelectItem>
                <SelectItem value="problem">Problem / pain point</SelectItem>
                <SelectItem value="bold-claim">Bold claim</SelectItem>
                <SelectItem value="story">Story</SelectItem>
                <SelectItem value="social-proof">Social proof</SelectItem>
                <SelectItem value="contrarian">Contrarian</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Image source — only relevant for photo mode */}
          {(mode === "photo" || (mode === "auto" && allowed.includes("photo"))) && (
            <div className="space-y-2">
              <Label>Image source <span className="text-xs text-muted-foreground font-normal">(photo mode only)</span></Label>
              <ImageSourceToggle value={imageSource} onChange={(v) => { setImageSource(v); setNoImagesErr(false); }} />
              <p className="text-xs text-muted-foreground">
                Stock + Mine uses AdRise's curated library alongside your uploads for more variety.
              </p>
            </div>
          )}

          {noImagesErr && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                You have no uploaded images yet. Switch to "Stock + Mine" or{" "}
                <Link to="/library" className="underline font-medium">upload images in your library</Link>.
              </span>
            </div>
          )}

          <Button className="w-full shadow-glow" onClick={generate} disabled={loading} size="lg">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate slideshow
          </Button>

          {/* Live progress for designed mode */}
          {progress && loading && (
            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
              <div className="text-sm font-semibold">Generating your slideshow…</div>
              <ProgressStep done={progress.phase !== "writing"} active={progress.phase === "writing"} label="Writing slide scripts" />
              <ProgressStep done={progress.phase === "placement" || progress.phase === "assembling" || progress.phase === "complete"} active={progress.phase === "imaging"} label={progress.phase === "imaging" ? `${progress.label}` : "Designing images"} />
              <ProgressStep done={progress.phase === "assembling" || progress.phase === "complete"} active={progress.phase === "placement"} label={progress.phase === "placement" ? `${progress.label}` : "Analyzing text placement"} />
              <ProgressStep done={progress.phase === "complete"} active={progress.phase === "assembling"} label="Assembling slideshow" />
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, Math.round((progress.current / Math.max(progress.total, 1)) * 100))}%` }} />
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
};

function ProgressStep({ done, active, label }: { done: boolean; active: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {done ? <Check className="h-4 w-4 text-green-500" /> : active ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
      <span className={done || active ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

export default NewSlideshow;
