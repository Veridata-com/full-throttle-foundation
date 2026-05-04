// New slideshow — minimal autonomous flow.
// User enters a topic + optional CTA. AI decides hook style, content style,
// templates, design, and (optionally) slide count.

import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Wand2, Image as ImageIcon, Palette } from "lucide-react";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";
import type { BrandIdentity } from "@/lib/designed/brand";

type Mode = "auto" | "photo" | "designed";

const NewSlideshow = () => {
  const { user } = useAuth();
  const { current } = useWorkspace();
  const navigate = useNavigate();

  const [topic, setTopic] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [aiDecidesCount, setAiDecidesCount] = useState(true);
  const [numSlides, setNumSlides] = useState(7);
  const [loading, setLoading] = useState(false);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("auto");
  const [brand, setBrand] = useState<BrandIdentity | null>(null);
  const [brandLoaded, setBrandLoaded] = useState(false);

  const allowed: string[] = useMemo(
    () => (current as any)?.allowed_generation_modes?.length ? (current as any).allowed_generation_modes : ["photo", "designed"],
    [current]
  );

  useEffect(() => {
    if (!current) return;
    supabase.from("images").select("id", { count: "exact", head: true })
      .eq("workspace_id", current.id).eq("is_product_shot", true)
      .then(({ count }) => setProductCount(count || 0));
  }, [current]);

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
    if (!topic.trim()) { toast.error("Tell the AI what your slideshow is about."); return; }

    const chosen = resolveMode();
    if (chosen === "photo" && productCount === 0) {
      toast.error("Upload a product image to your library first.");
      navigate("/library?upload=product");
      return;
    }
    if (chosen === "designed" && !brand) {
      toast.error("Set up your brand identity first.");
      navigate("/brand");
      return;
    }

    setLoading(true);
    try {
      const { data: ss, error } = await supabase.from("slideshows").insert({
        user_id: user.id,
        workspace_id: current.id,
        title: topic.slice(0, 80),
        topic,
        cta_text: ctaText || null,
        ai_decided: aiDecidesCount,
        num_slides: aiDecidesCount ? 7 : numSlides,
        status: "generating",
        generation_mode: chosen === "designed" ? "clean_designed" : "photo",
        generation_progress: { step: "started", step_index: 0, total_steps: 4, message: "Starting…", percent: 0 },
      } as any).select().single();
      if (error) throw error;
      navigate(`/generating/${ss.id}`);
    } catch (err: any) {
      toast.error(err.message || "Could not start generation");
      setLoading(false);
    }
  };

  const modeOptions: { id: Mode; label: string; desc: string; Icon: any }[] = ([
    { id: "auto" as Mode, label: "Let AI choose", desc: "AI picks photo or designed.", Icon: Wand2 },
    { id: "photo" as Mode, label: "Photo slides", desc: "Use uploaded or stock photos.", Icon: ImageIcon },
    { id: "designed" as Mode, label: "Designed slides", desc: "Clean typographic slides from your brand.", Icon: Sparkles },
  ]).filter((o) => o.id === "auto" ? allowed.length > 1 : allowed.includes(o.id));

  const designedSelected = mode === "designed" || (mode === "auto" && allowed.includes("designed"));
  const showBrandWarning = brandLoaded && !brand && designedSelected;

  return (
    <>
      <SEO title="New slideshow" description="Generate a slideshow." />
      <div className="container py-8 max-w-2xl">
        <h1 className="font-display text-3xl font-bold mb-2">New slideshow</h1>
        <p className="text-muted-foreground mb-6">Give the AI a topic. It handles everything else.</p>

        <Card className="p-6 space-y-6 shadow-card">
          <div className="space-y-2">
            <Label htmlFor="topic">What's your topic?</Label>
            <Textarea
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder='e.g. "why most SaaS founders never get their first 100 users"'
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cta">CTA <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              id="cta"
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              placeholder='e.g. "try adrise.app" — leave blank and AI will write one'
            />
          </div>

          <div className="space-y-3">
            <Label>Slide count</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAiDecidesCount(true)}
                className={`flex-1 rounded-lg border-2 p-3 text-sm transition ${aiDecidesCount ? "border-primary bg-primary/5 font-medium" : "border-border text-muted-foreground"}`}
              >
                Let AI decide
              </button>
              <button
                type="button"
                onClick={() => setAiDecidesCount(false)}
                className={`flex-1 rounded-lg border-2 p-3 text-sm transition ${!aiDecidesCount ? "border-primary bg-primary/5 font-medium" : "border-border text-muted-foreground"}`}
              >
                I'll choose
              </button>
            </div>
            {!aiDecidesCount && (
              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">3 to 10 slides</span>
                  <span className="text-lg font-bold font-display">{numSlides}</span>
                </div>
                <Slider value={[numSlides]} min={3} max={10} step={1} onValueChange={([v]) => setNumSlides(v)} />
              </div>
            )}
          </div>

          {modeOptions.length > 1 && (
            <div className="space-y-3">
              <Label>How should the slides look? <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
              <div className="grid sm:grid-cols-3 gap-3">
                {modeOptions.map((m) => {
                  const active = mode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMode(m.id)}
                      className={`text-left rounded-xl border-2 p-3 transition relative ${active ? "border-primary bg-primary/5 ring-2 ring-primary/10" : "border-border hover:border-muted-foreground"}`}
                    >
                      <m.Icon className="h-4 w-4 mb-1.5" />
                      <div className="font-semibold text-xs">{m.label}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{m.desc}</div>
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

          <Button className="w-full shadow-glow" onClick={generate} disabled={loading || !topic.trim() || (showBrandWarning && mode === "designed")} size="lg">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate slideshow
          </Button>
        </Card>
      </div>
    </>
  );
};

export default NewSlideshow;
