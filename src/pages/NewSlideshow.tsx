import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";

const NewSlideshow = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [images, setImages] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("Untitled slideshow");
  const [hookStyle, setHookStyle] = useState("curiosity");
  const [audience, setAudience] = useState("");
  const [cta, setCta] = useState("Shop now");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("images").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      const withUrls = await Promise.all((data || []).map(async (img: any) => {
        const { data: signed } = await supabase.storage.from("product-images").createSignedUrl(img.storage_path, 3600);
        return { ...img, signedUrl: signed?.signedUrl };
      }));
      setImages(withUrls);
    })();
  }, [user]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const generate = async () => {
    if (!user) return;
    if (selected.size === 0) { toast.error("Pick at least one image"); return; }
    setLoading(true);
    try {
      const { data: ss, error } = await supabase.from("slideshows").insert({
        user_id: user.id, title, hook_style: hookStyle, target_audience: audience || null, cta,
        image_ids: Array.from(selected), status: "generating",
      }).select().single();
      if (error) throw error;

      const { error: fnErr, data: fnData } = await supabase.functions.invoke("generate-slideshow", { body: { slideshowId: ss.id } });
      if (fnErr) throw fnErr;
      if ((fnData as any)?.error) {
        if ((fnData as any).error === "plan_required") {
          toast.error("You need an active plan. Choose one to continue.");
          navigate("/billing");
          return;
        }
        if ((fnData as any).error === "quota_exceeded") {
          toast.error("Monthly limit reached on Starter. Upgrade to Pro for unlimited.");
          navigate("/billing");
          return;
        }
        throw new Error((fnData as any).error);
      }

      toast.success("Slideshow generated!");
      navigate(`/slideshows/${ss.id}/edit`);
    } catch (err: any) {
      toast.error(err.message || "Generation failed");
    } finally { setLoading(false); }
  };

  return (
    <>
      <SEO title="New slideshow" description="Generate a new TikTok ad slideshow." />
      <div className="container py-8 max-w-5xl">
        <h1 className="font-display text-3xl font-bold mb-2">New slideshow</h1>
        <p className="text-muted-foreground mb-8">Pick images, give us the angle, and we'll write the script.</p>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          <Card className="p-6 shadow-card">
            <h2 className="font-display font-bold mb-4">Pick images ({selected.size} selected)</h2>
            {images.length === 0 ? (
              <p className="text-muted-foreground text-sm">No images yet. <a className="text-primary underline" href="/library">Upload some first</a>.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[600px] overflow-auto">
                {images.map(img => {
                  const isSel = selected.has(img.id);
                  return (
                    <button key={img.id} type="button" onClick={() => toggle(img.id)} className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${isSel ? "border-primary shadow-glow" : "border-transparent hover:border-border"}`}>
                      {img.signedUrl && <img src={img.signedUrl} alt="" className="object-cover w-full h-full" />}
                      {isSel && (
                        <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                          <div className="bg-primary text-primary-foreground rounded-full h-7 w-7 flex items-center justify-center"><Check className="h-4 w-4" /></div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="p-6 shadow-card h-fit space-y-4">
            <h2 className="font-display font-bold">Creative brief</h2>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} />
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
            <div className="space-y-2">
              <Label>Target audience</Label>
              <Textarea placeholder="e.g. Gen Z skincare buyers, ages 18-25" value={audience} onChange={e => setAudience(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Call to action</Label>
              <Input value={cta} onChange={e => setCta(e.target.value)} placeholder="Shop now" />
            </div>
            <Button className="w-full shadow-glow" onClick={generate} disabled={loading || selected.size === 0}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate slideshow
            </Button>
          </Card>
        </div>
      </div>
    </>
  );
};

export default NewSlideshow;
