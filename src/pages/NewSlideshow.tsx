// New slideshow — minimal autonomous flow.
// User enters a topic + optional CTA. AI decides everything else.

import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";

const NewSlideshow = () => {
  const { user } = useAuth();
  const { current } = useWorkspace();
  const navigate = useNavigate();

  const [topic, setTopic] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [loading, setLoading] = useState(false);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [hasBrand, setHasBrand] = useState<boolean | null>(null);

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

  const resolveMode = (): "photo" | "designed" => {
    const canPhoto = allowed.includes("photo") && (productCount ?? 0) > 0;
    const canDesigned = allowed.includes("designed") && hasBrand;
    if (canPhoto && canDesigned) return Math.random() < 0.5 ? "photo" : "designed";
    if (canDesigned) return "designed";
    if (canPhoto) return "photo";
    // Fallback to allowed even if prerequisites missing (will error below)
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
    if (chosen === "designed" && !hasBrand) {
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
        ai_decided: true,
        num_slides: 7,
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

          <Button className="w-full shadow-glow" onClick={generate} disabled={loading || !topic.trim()} size="lg">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate slideshow
          </Button>
        </Card>
      </div>
    </>
  );
};

export default NewSlideshow;
