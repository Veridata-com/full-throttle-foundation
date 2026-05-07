// New slideshow — autonomous by default. Optional manual override lets the user
// force a specific generation style instead of letting the AI pick.

import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Image as ImageIcon, LayoutTemplate, FileText, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";

type StyleChoice = "auto" | "photo" | "designed" | "story";

const STYLE_OPTIONS: { id: StyleChoice; label: string; desc: string; Icon: any }[] = [
  { id: "auto", label: "Let AI decide", desc: "AdRise picks the best style based on your data.", Icon: Wand2 },
  { id: "photo", label: "Photo slides", desc: "Uses uploaded or stock photos.", Icon: ImageIcon },
  { id: "designed", label: "Designed", desc: "Bold templates, brand colors, varied layouts.", Icon: LayoutTemplate },
  { id: "story", label: "Story mode", desc: "White canvas, lowercase, founder-voice storytelling.", Icon: FileText },
];

const NewSlideshow = () => {
  const { user } = useAuth();
  const { current } = useWorkspace();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [hasBrand, setHasBrand] = useState<boolean | null>(null);
  const [styleChoice, setStyleChoice] = useState<StyleChoice>("auto");

  const allowed: string[] = (current as any)?.allowed_generation_modes?.length
    ? (current as any).allowed_generation_modes
    : ["photo", "designed"];

  useEffect(() => {
    if (!current) return;
    supabase.from("images").select("id", { count: "exact", head: true })
      .eq("workspace_id", current.id).eq("is_product_shot", true)
      .then(({ count }) => setProductCount(count || 0));
  }, [current]);

  useEffect(() => {
    if (!user) return;
    supabase.from("brand_identity").select("id").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setHasBrand(!!data));
  }, [user]);

  if (!current) {
    return (
      <div className="container py-16 text-center">
        <p className="text-muted-foreground mb-4">Create a workspace first.</p>
        <Button asChild><Link to="/workspaces/new">New workspace</Link></Button>
      </div>
    );
  }

  const resolveAutoMode = (): "photo" | "designed" => {
    const canPhoto = allowed.includes("photo") && (productCount ?? 0) > 0;
    const canDesigned = allowed.includes("designed") && hasBrand;
    if (canPhoto && canDesigned) return Math.random() < 0.5 ? "photo" : "designed";
    if (canDesigned) return "designed";
    if (canPhoto) return "photo";
    if (allowed.includes("designed")) return "designed";
    return "photo";
  };

  const generate = async () => {
    if (!user) return;

    let chosenMode: "photo" | "designed";
    let designStyle: "auto" | "designed" | "story" = "auto";

    if (styleChoice === "auto") {
      chosenMode = resolveAutoMode();
    } else if (styleChoice === "photo") {
      chosenMode = "photo";
    } else if (styleChoice === "story") {
      chosenMode = "designed";
      designStyle = "story";
    } else {
      chosenMode = "designed";
      designStyle = "designed";
    }

    if (chosenMode === "photo" && (productCount ?? 0) === 0) {
      toast.error("Upload a product image to your library first.");
      navigate("/library?upload=product");
      return;
    }
    if (chosenMode === "designed" && !hasBrand) {
      toast.error("Set up your brand identity first.");
      navigate("/brand");
      return;
    }

    setLoading(true);
    try {
      const { data: ss, error } = await supabase.from("slideshows").insert({
        user_id: user.id,
        workspace_id: current.id,
        title: "Untitled slideshow",
        topic: null,
        cta_text: null,
        ai_decided: styleChoice === "auto",
        num_slides: 7,
        status: "generating",
        generation_mode: chosenMode === "designed" ? "clean_designed" : "photo",
        design_style: designStyle,
        generation_progress: { step: "started", step_index: 0, total_steps: 4, message: "Starting…", percent: 0 },
      } as any).select().single();
      if (error) throw error;
      navigate(`/generating/${ss.id}`);
    } catch (err: any) {
      toast.error(err.message || "Could not start generation");
      setLoading(false);
    }
  };

  return (
    <>
      <SEO title="New slideshow" description="Generate a slideshow." />
      <div className="container py-8 max-w-2xl">
        <h1 className="font-display text-3xl font-bold mb-2">New slideshow</h1>
        <p className="text-muted-foreground mb-6">The AI handles everything by default. Override the style if you want.</p>

        <Card className="p-6 shadow-card space-y-6">
          <div>
            <div className="text-sm font-semibold mb-3">Style</div>
            <div className="grid sm:grid-cols-2 gap-3">
              {STYLE_OPTIONS.map((opt) => {
                const active = styleChoice === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setStyleChoice(opt.id)}
                    className={`text-left rounded-xl border-2 p-4 transition ${active ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "border-border hover:border-muted-foreground"}`}
                  >
                    <opt.Icon className="h-5 w-5 mb-2" />
                    <div className="font-semibold text-sm">{opt.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{opt.desc}</div>
                  </button>
                );
              })}
            </div>
            {styleChoice !== "auto" && (
              <p className="text-[11px] text-muted-foreground mt-3">
                Manual override on. The AI won&apos;t pick the style for this slideshow but will still write the copy and choose templates.
              </p>
            )}
          </div>

          <Button className="w-full shadow-glow" onClick={generate} disabled={loading} size="lg">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate slideshow
          </Button>
        </Card>
      </div>
    </>
  );
};

export default NewSlideshow;
