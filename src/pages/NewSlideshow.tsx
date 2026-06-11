// New slideshow — autonomous by default. Optional manual override lets the user
// force a specific generation style instead of letting the AI pick.

import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Image as ImageIcon, FileText, Wand2, ChevronDown, Check } from "lucide-react";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";

type StyleChoice = "auto" | "photo" | "story";
type PhotoLayout = "one" | "hvc";
type ImgSource = "ai" | "stock" | "own";

interface ImageSlot {
  source: ImgSource;
  imageUrl?: string;
  imageId?: string;
  signedUrl?: string;
}

const defaultSlot = (): ImageSlot => ({ source: "ai" });

interface StockImg { id: string; public_url: string; category: string; filename: string; }
interface OwnImg   { id: string; file_name: string; storage_path: string; signedUrl?: string; }

function ImagePicker({
  label, slot, onUpdate, stockImages, ownImages,
}: {
  label: string;
  slot: ImageSlot;
  onUpdate: (s: ImageSlot) => void;
  stockImages: StockImg[];
  ownImages: OwnImg[];
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</div>

      {/* Source pills */}
      <div className="flex gap-2">
        {(["ai", "stock", "own"] as ImgSource[]).map((src) => (
          <button
            key={src}
            type="button"
            onClick={() => onUpdate({ source: src })}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              slot.source === src
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-muted-foreground"
            }`}
          >
            {src === "ai" ? "AI decides" : src === "stock" ? "Stock photos" : "My images"}
          </button>
        ))}
      </div>

      {/* Image grid */}
      {slot.source !== "ai" && (
        <div className="max-h-48 overflow-y-auto rounded-lg border p-2">
          {slot.source === "stock" && (
            <div className="grid grid-cols-4 gap-1.5">
              {stockImages.length === 0 && <p className="col-span-4 text-xs text-muted-foreground py-4 text-center">No stock images found.</p>}
              {stockImages.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => onUpdate({ source: "stock", imageUrl: img.public_url })}
                  className={`relative aspect-[3/4] rounded overflow-hidden border-2 transition-colors ${
                    slot.imageUrl === img.public_url ? "border-primary" : "border-transparent hover:border-muted-foreground"
                  }`}
                >
                  <img src={img.public_url} alt={img.filename} className="w-full h-full object-cover" loading="lazy" />
                  {slot.imageUrl === img.public_url && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
          {slot.source === "own" && (
            <div className="grid grid-cols-4 gap-1.5">
              {ownImages.length === 0 && <p className="col-span-4 text-xs text-muted-foreground py-4 text-center">No images in your library.</p>}
              {ownImages.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => onUpdate({ source: "own", imageId: img.id, imageUrl: img.signedUrl })}
                  className={`relative aspect-[3/4] rounded overflow-hidden border-2 transition-colors ${
                    slot.imageId === img.id ? "border-primary" : "border-transparent hover:border-muted-foreground"
                  }`}
                >
                  {img.signedUrl
                    ? <img src={img.signedUrl} alt={img.file_name} className="w-full h-full object-cover" loading="lazy" />
                    : <div className="w-full h-full bg-muted flex items-center justify-center"><ImageIcon className="h-4 w-4 text-muted-foreground" /></div>
                  }
                  {slot.imageId === img.id && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const NewSlideshow = () => {
  const { user } = useAuth();
  const { current } = useWorkspace();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [hasBrand, setHasBrand] = useState<boolean | null>(null);
  const [styleChoice, setStyleChoice] = useState<StyleChoice>("auto");

  // Photo sub-options
  const [photoLayout, setPhotoLayout] = useState<PhotoLayout>("one");
  const [oneSlot, setOneSlot] = useState<ImageSlot>(defaultSlot());
  const [hookSlot, setHookSlot] = useState<ImageSlot>(defaultSlot());
  const [valueSlot, setValueSlot] = useState<ImageSlot>(defaultSlot());
  const [ctaSlot, setCtaSlot] = useState<ImageSlot>(defaultSlot());

  const [stockImages, setStockImages] = useState<StockImg[]>([]);
  const [ownImages, setOwnImages] = useState<OwnImg[]>([]);
  const [imagesLoaded, setImagesLoaded] = useState(false);

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

  // Load images lazily when photo is selected
  useEffect(() => {
    if (styleChoice !== "photo" || imagesLoaded || !current) return;
    setImagesLoaded(true);

    supabase.from("stock_images").select("id,public_url,category,filename").order("created_at", { ascending: false })
      .then(({ data }) => setStockImages((data as StockImg[]) || []));

    supabase.from("images").select("id,file_name,storage_path").eq("workspace_id", current.id)
      .order("created_at", { ascending: false }).limit(60)
      .then(async ({ data }) => {
        if (!data) return;
        const signed = await Promise.all(
          data.map(async (img: any) => {
            const { data: s } = await supabase.storage.from("product-images").createSignedUrl(img.storage_path, 3600);
            return { ...img, signedUrl: s?.signedUrl };
          })
        );
        setOwnImages(signed);
      });
  }, [styleChoice, imagesLoaded, current]);

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
    } else if (styleChoice === "story") {
      chosenMode = "designed";
      designStyle = "story";
    } else {
      chosenMode = "photo";
    }

    if (chosenMode === "photo" && (productCount ?? 0) === 0 &&
        photoLayout === "one" && oneSlot.source === "ai") {
      toast.error("Upload a product image to your library first.");
      navigate("/library?upload=product");
      return;
    }
    if (chosenMode === "designed" && !hasBrand) {
      toast.error("Set up your brand identity first.");
      navigate("/brand");
      return;
    }

    // Build photo config to pass along
    const photoConfig = chosenMode === "photo" ? {
      layout: photoLayout,
      ...(photoLayout === "one" ? {
        image_source: oneSlot.source,
        image_url: oneSlot.imageUrl || null,
        image_id: oneSlot.imageId || null,
      } : {
        hook: { source: hookSlot.source, image_url: hookSlot.imageUrl || null, image_id: hookSlot.imageId || null },
        value: { source: valueSlot.source, image_url: valueSlot.imageUrl || null, image_id: valueSlot.imageId || null },
        cta: { source: ctaSlot.source, image_url: ctaSlot.imageUrl || null, image_id: ctaSlot.imageId || null },
      }),
    } : null;

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
        photo_config: photoConfig,
        generation_progress: { step: "started", step_index: 0, total_steps: 4, message: "Starting…", percent: 0 },
      } as any).select().single();
      if (error) throw error;
      navigate(`/generating/${ss.id}`);
    } catch (err: any) {
      toast.error(err.message || "Could not start generation");
      setLoading(false);
    }
  };

  const topOptions = [
    { id: "auto" as StyleChoice, label: "Let AI decide", desc: "AdRise picks the best style based on your data.", Icon: Wand2 },
    { id: "story" as StyleChoice, label: "Story mode", desc: "White canvas, lowercase, founder-voice storytelling.", Icon: FileText },
  ];

  return (
    <>
      <SEO title="New slideshow" description="Generate a slideshow." />
      <div className="container py-8 max-w-2xl">
        <h1 className="font-display text-3xl font-bold mb-2">New slideshow</h1>
        <p className="text-muted-foreground mb-6">The AI handles everything by default. Override the style if you want.</p>

        <Card className="p-6 shadow-card space-y-6">
          <div className="space-y-3">
            <div className="text-sm font-semibold">Style</div>

            {/* Top row: AI decide + Story mode */}
            <div className="grid grid-cols-2 gap-3">
              {topOptions.map((opt) => {
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

            {/* Photo slides — full width toggle */}
            <button
              type="button"
              onClick={() => setStyleChoice(styleChoice === "photo" ? "auto" : "photo")}
              className={`w-full text-left rounded-xl border-2 p-4 transition ${styleChoice === "photo" ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "border-border hover:border-muted-foreground"}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ImageIcon className="h-5 w-5" />
                  <div>
                    <div className="font-semibold text-sm">Photo slides</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Uses uploaded or stock photos.</div>
                  </div>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${styleChoice === "photo" ? "rotate-180" : ""}`} />
              </div>
            </button>

            {/* Photo sub-options — expands when photo selected */}
            {styleChoice === "photo" && (
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-5">

                {/* Layout picker */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPhotoLayout("one")}
                    className={`rounded-lg border-2 p-3 text-left transition ${photoLayout === "one" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"}`}
                  >
                    <div className="font-semibold text-sm">Use one image</div>
                    <div className="text-xs text-muted-foreground mt-1">Same image on every slide.</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoLayout("hvc")}
                    className={`rounded-lg border-2 p-3 text-left transition ${photoLayout === "hvc" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"}`}
                  >
                    <div className="font-semibold text-sm">Hook · Value · CTA</div>
                    <div className="text-xs text-muted-foreground mt-1">Different image per section.</div>
                  </button>
                </div>

                {/* One image picker */}
                {photoLayout === "one" && (
                  <ImagePicker
                    label="Image"
                    slot={oneSlot}
                    onUpdate={setOneSlot}
                    stockImages={stockImages}
                    ownImages={ownImages}
                  />
                )}

                {/* HVC pickers */}
                {photoLayout === "hvc" && (
                  <div className="space-y-5">
                    <ImagePicker label="Hook slide" slot={hookSlot} onUpdate={setHookSlot} stockImages={stockImages} ownImages={ownImages} />
                    <div className="border-t border-border" />
                    <ImagePicker label="Value slides" slot={valueSlot} onUpdate={setValueSlot} stockImages={stockImages} ownImages={ownImages} />
                    <div className="border-t border-border" />
                    <ImagePicker label="CTA slide" slot={ctaSlot} onUpdate={setCtaSlot} stockImages={stockImages} ownImages={ownImages} />
                  </div>
                )}
              </div>
            )}

            {styleChoice !== "auto" && (
              <p className="text-[11px] text-muted-foreground">
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
