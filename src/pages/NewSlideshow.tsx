import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Upload, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";
import { ImageSourceToggle, type ImageSource } from "@/components/ImageSourceToggle";

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

  useEffect(() => {
    setImageSource((profile?.default_image_source as ImageSource) || "both");
  }, [profile]);

  useEffect(() => {
    if (!current) return;
    supabase.from("images").select("id", { count: "exact", head: true })
      .eq("workspace_id", current.id).eq("is_product_shot", true)
      .then(({ count }) => setProductCount(count || 0));
  }, [current]);

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

  const generate = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: ss, error } = await supabase.from("slideshows").insert({
        user_id: user.id,
        workspace_id: current.id,
        title: `${current.name} — ${new Date().toLocaleDateString()}`,
        hook_style: hookStyle,
        num_slides: numSlides,
        status: "generating",
      }).select().single();
      if (error) throw error;

      const { error: fnErr, data: fnData } = await supabase.functions.invoke("generate-slideshow", { body: { slideshowId: ss.id, image_source: imageSource } });
      if (fnErr) throw fnErr;
      const err = (fnData as any)?.error;
      if (err) {
        if (err === "plan_required") { toast.error("Active plan required."); navigate("/billing"); return; }
        if (err === "quota_exceeded") { toast.error("Starter monthly limit reached. Upgrade to Pro."); navigate("/billing"); return; }
        if (err === "no_product_shot") { toast.error("Upload a product image in workspace settings."); return; }
        if (err === "no_images") { setNoImagesErr(true); return; }
        if (err === "rate_limit") { toast.error("Rate limited, try again in a moment."); return; }
        if (err === "payment_required") { toast.error("AI credits needed. Add credits in Lovable workspace."); return; }
        if (err === "cost_cap_reached") { toast.error("Monthly AI cost cap reached for your plan. Resets next month."); return; }
        throw new Error(err);
      }

      toast.success("Slideshow generated");
      navigate(`/slideshows/${ss.id}/edit`);
    } catch (err: any) {
      toast.error(err.message || "Generation failed");
    } finally { setLoading(false); }
  };

  return (
    <>
      <SEO title="New slideshow" description="Generate a slideshow." />
      <div className="container py-8 max-w-xl">
        <h1 className="font-display text-3xl font-bold mb-2">New slideshow</h1>
        <p className="text-muted-foreground mb-6">AI picks the best images from {current.name} and writes the script. Last slide = your product shot.</p>

        <Card className="p-6 space-y-6 shadow-card">
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
