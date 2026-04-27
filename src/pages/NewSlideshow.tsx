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
import { Loader2, Sparkles, Upload, AlertCircle, Image as ImageIcon, Wand2, Check, Circle, Palette } from "lucide-react";
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
  const [brand, setBrand] = useState<BrandIdentity | null>(null);
  const [brandLoaded, setBrandLoaded] = useState(false);

  const [progress, setProgress] = useState<{ phase: string; current: number; total: number; label: string } | null>(null);

  const allowed: string[] = useMemo(
    () => (current as any)?.allowed_generation_modes?.length ? (current as any).allowed_generation_modes : ["photo", "designed"],
    [current]
  );

  useEffect(() => {
    setImageSource((profile?.default_image_source as ImageSource) || "both");
  }, [profile]);

  useEffect(() => {
    if (!current) return;
    supabase.from("images").select("id", { count: "exact", head: true })
      .eq("workspace_id", current.id).eq("is_product_shot", true)
      .then(({ count }) => setProductCount(count || 0));
  }, [current]);

  // Load brand identity (required for designed mode)
  useEffect(() => {
    if (!user) return;
    supabase.from("brand_identity").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      setBrand(data as any);
      setBrandLoaded(true);
    });
  }, [user]);

  if (!current) {
    return (
      <div className="container py-16 text-center">
        <p className="text-muted-foreground mb-4">Create a workspace first.</p>
        <Button asChild><Link to="/workspaces/new">New workspace</Link></Button>
      </div>
    );
  }

  if (productCount === 0 && mode === "photo") {
    // (kept lightweight — only block when explicitly choosing photo)
  }

  // Resolve which mode to actually use
  const resolveMode = (): "photo" | "designed" => {
    if (mode === "photo") return "photo";
    if (mode === "designed") return "designed";
    if (allowed.includes("photo") && allowed.includes("designed")) {
      return Math.random() < 0.5 ? "photo" : "designed";
    }
    if (allowed.includes("designed")) return "designed";
    return "photo";
  };

  const generate = async () => {
    if (!user) return;
    const chosen = resolveMode();

    // Photo mode requires a product shot
    if (chosen === "photo" && productCount === 0) {
      toast.error("Upload a product image to your library first.");
      navigate("/library?upload=product");
      return;
    }
    // Designed mode requires brand identity
    if (chosen === "designed" && !brand) {
      toast.error("Set up your brand identity first.");
      navigate("/brand");
      return;
    }

    setLoading(true);
    setProgress(null);
    try {
      const { data: ss, error } = await supabase.from("slideshows").insert({
        user_id: user.id,
        workspace_id: current.id,
        title: `${current.name} — ${new Date().toLocaleDateString()}`,
        hook_style: hookStyle,
        num_slides: numSlides,
        status: "generating",
        generation_mode: chosen === "designed" ? "clean_designed" : "photo",
      } as any).select().single();
      if (error) throw error;

      if (chosen === "designed") {
        setProgress({ phase: "writing", current: 0, total: numSlides, label: "Writing slide scripts" });

        const { error: fnErr, data: fnData } = await supabase.functions.invoke("generate-clean-slideshow", {
          body: { slideshowId: ss.id },
        });
        if (fnErr) throw fnErr;
        const err = (fnData as any)?.error;
        if (err) {
          if (err === "plan_required") { toast.error("Active plan required."); navigate("/billing"); return; }
          if (err === "designed_quota_exceeded") { toast.error("Designed slideshow limit reached. Upgrade to Pro."); navigate("/billing"); return; }
          if (err === "brand_required") { toast.error("Set up your brand identity first."); navigate("/brand"); return; }
          if (err === "rate_limit") { toast.error("Rate limited, try again in a moment."); return; }
          if (err === "payment_required") { toast.error("AI credits needed."); return; }
          if (err === "cost_cap_reached") { toast.error("Monthly AI cost cap reached. Resets next month."); return; }
          throw new Error(err);
        }

        const specs = (fnData as any).slides || [];
        const brandFromFn = ((fnData as any).brand || brand) as BrandIdentity;

        await renderAndPersistSlideshow({
          slideshowId: ss.id,
          userId: user.id,
          specs,
          brand: brandFromFn,
          onProgress: (p) => setProgress({ phase: "rendering", current: p.current, total: p.total, label: p.label }),
        });

        toast.success("Slideshow generated");
        navigate(`/slideshows/${ss.id}/edit`);
        return;
      }

      // Photo mode (legacy generate-slideshow)
      const { error: fnErr, data: fnData } = await supabase.functions.invoke("generate-slideshow", {
        body: { slideshowId: ss.id, image_source: imageSource },
      });
      if (fnErr) throw fnErr;
      const err = (fnData as any)?.error;
      if (err) {
        if (err === "plan_required") { toast.error("Active plan required."); navigate("/billing"); return; }
        if (err === "quota_exceeded") { toast.error("Monthly limit reached. Upgrade to Pro."); navigate("/billing"); return; }
        if (err === "no_product_shot") { toast.error("Upload a product image first."); return; }
        if (err === "no_images") { setNoImagesErr(true); return; }
        if (err === "rate_limit") { toast.error("Rate limited, try again in a moment."); return; }
        if (err === "payment_required") { toast.error("AI credits needed."); return; }
        if (err === "cost_cap_reached") { toast.error("Monthly AI cost cap reached."); return; }
        throw new Error(err);
      }

      toast.success("Slideshow generated");
      navigate(`/slideshows/${ss.id}/edit`);
    } catch (err: any) {
      toast.error(err.message || "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const modeOptions: { id: Mode; label: string; desc: string; Icon: any }[] = ([
    { id: "auto" as Mode, label: "Let AI choose", desc: "AI picks photo or designed for each slideshow.", Icon: Wand2 },
    { id: "photo" as Mode, label: "Photo slides", desc: "Use uploaded or stock photos.", Icon: ImageIcon },
    { id: "designed" as Mode, label: "Designed slides", desc: "Clean typographic slides built from your brand.", Icon: Sparkles },
  ]).filter((o) => o.id === "auto" ? allowed.length > 1 : allowed.includes(o.id));

  const designedSelected = mode === "designed" || (mode === "auto" && allowed.includes("designed"));
  const showBrandWarning = brandLoaded && !brand && designedSelected;

  return (
    <>
      <SEO title="New slideshow" description="Generate a slideshow." />
      <div className="container py-8 max-w-2xl">
        <h1 className="font-display text-3xl font-bold mb-2">New slideshow</h1>
        <p className="text-muted-foreground mb-6">Set the inputs — the AI handles the rest.</p>

        <Card className="p-6 space-y-6 shadow-card">
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

          {showBrandWarning && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm flex items-start gap-2">
              <Palette className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              <div className="flex-1">
                <p className="font-medium">Set up your brand first</p>
                <p className="text-muted-foreground text-xs mt-0.5">Designed slides use your brand colors, fonts, and style.</p>
              </div>
              <Button asChild size="sm" variant="outline"><Link to="/brand">Open Brand</Link></Button>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Number of slides</Label>
              <span className="text-lg font-bold font-display">{numSlides}</span>
            </div>
            <Slider value={[numSlides]} min={3} max={10} step={1} onValueChange={([v]) => setNumSlides(v)} />
            <p className="text-xs text-muted-foreground">3 to 10 slides.</p>
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

          {(mode === "photo" || (mode === "auto" && allowed.includes("photo"))) && (
            <div className="space-y-2">
              <Label>Image source <span className="text-xs text-muted-foreground font-normal">(photo mode only)</span></Label>
              <ImageSourceToggle value={imageSource} onChange={(v) => { setImageSource(v); setNoImagesErr(false); }} />
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

          <Button className="w-full shadow-glow" onClick={generate} disabled={loading || (showBrandWarning && mode === "designed")} size="lg">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate slideshow
          </Button>

          {progress && loading && (
            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
              <div className="text-sm font-semibold">Generating your slideshow…</div>
              <ProgressStep done={progress.phase !== "writing"} active={progress.phase === "writing"} label="Writing slide scripts" />
              <ProgressStep done={false} active={progress.phase === "rendering"} label={progress.phase === "rendering" ? progress.label : "Rendering slides"} />
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, Math.round((progress.current / Math.max(progress.total, 1)) * 100))}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">Rendering happens in your browser — keep this tab open.</p>
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
