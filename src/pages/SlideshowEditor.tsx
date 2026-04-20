import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fabric } from "fabric";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Download, Save, ArrowLeft, Type } from "lucide-react";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";

interface SlideLayout {
  headline: { x: number; y: number; fontSize: number; color: string; stroke: string; strokeWidth: number; fontWeight: number; textAlign: string; maxWidth: number };
  subtext: { x: number; y: number; fontSize: number; color: string; stroke: string; strokeWidth: number; fontWeight: number; textAlign: string; maxWidth: number };
}

interface Slide {
  id: string;
  type: "hook" | "value" | "cta";
  headline: string;
  subtext: string | null;
  image_id: string;
  layout: SlideLayout;
}

const CANVAS_W = 1080;
const CANVAS_H = 1920;
const DISPLAY_W = 360;
// Clean caption font stack — system UI sans, regular weight, like reference reels
const CAPTION_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Segoe UI", system-ui, sans-serif';

function addCaption(canvas: fabric.Canvas | fabric.StaticCanvas, slide: Slide, opts?: { interactive?: boolean }) {
  const h = slide.layout.headline;
  const text = new fabric.Textbox(slide.headline || "", {
    left: h.x,
    top: h.y,
    width: h.maxWidth,
    fontSize: h.fontSize,
    fill: h.color || "#FFFFFF",
    fontFamily: CAPTION_FONT,
    fontWeight: 400,
    textAlign: "center",
    originX: "center",
    originY: "center",
    lineHeight: 1.15,
    // Soft drop shadow for legibility on busy photos — no stroke, no outline
    shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.55)", blur: 14, offsetX: 0, offsetY: 2 }),
    selectable: !!opts?.interactive,
    evented: !!opts?.interactive,
    editable: !!opts?.interactive,
    lockUniScaling: true,
  });
  (text as any).set("data", { role: "headline" });
  canvas.add(text);
  return text;
}

const SlideshowEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const [slideshow, setSlideshow] = useState<any>(null);
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const [activeIdx, setActiveIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [headlineText, setHeadlineText] = useState("");
  const [headlineSize, setHeadlineSize] = useState(64);

  // Load slideshow + signed image URLs
  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const { data: ss, error } = await supabase.from("slideshows").select("*").eq("id", id).single();
      if (error || !ss) { toast.error("Not found"); navigate("/slideshows"); return; }
      setSlideshow(ss);

      const ids: string[] = ss.image_ids || [];
      if (ids.length) {
        const { data: imgs } = await supabase.from("images").select("id, storage_path").in("id", ids);
        const map: Record<string, string> = {};
        await Promise.all((imgs || []).map(async (i: any) => {
          const { data } = await supabase.storage.from("product-images").createSignedUrl(i.storage_path, 3600);
          if (data?.signedUrl) map[i.id] = data.signedUrl;
        }));
        setImageMap(map);
      }
      setLoading(false);
    })();
  }, [user, id, navigate]);

  // Init fabric canvas
  useEffect(() => {
    if (!canvasRef.current || fabricRef.current) return;
    const c = new fabric.Canvas(canvasRef.current, {
      width: CANVAS_W, height: CANVAS_H, backgroundColor: "#000",
    });
    fabricRef.current = c;
    return () => { c.dispose(); fabricRef.current = null; };
  }, []);

  const slides: Slide[] = slideshow?.slides || [];
  const active = slides[activeIdx];

  // Render the active slide on canvas
  const renderSlide = useCallback(async (slide: Slide) => {
    const canvas = fabricRef.current;
    if (!canvas || !slide) return;
    canvas.clear();
    canvas.backgroundColor = "#000";

    const url = imageMap[slide.image_id];
    if (url) {
      await new Promise<void>((resolve) => {
        fabric.Image.fromURL(url, (img) => {
          if (!img) return resolve();
          const scale = Math.max(CANVAS_W / (img.width || 1), CANVAS_H / (img.height || 1));
          img.scale(scale);
          img.set({
            left: CANVAS_W / 2, top: CANVAS_H / 2, originX: "center", originY: "center",
            selectable: false, evented: false,
          });
          canvas.add(img);
          resolve();
        }, { crossOrigin: "anonymous" });
      });
    }

    addCaption(canvas, slide, { interactive: true });
    canvas.renderAll();
    setHeadlineText(slide.headline || "");
    setHeadlineSize(slide.layout.headline.fontSize);
  }, [imageMap]);

  useEffect(() => {
    if (active) renderSlide(active);
  }, [active, renderSlide]);

  // Capture current canvas state into a Slide
  const captureLayout = (): Slide | null => {
    if (!active || !fabricRef.current) return null;
    const objs = fabricRef.current.getObjects();
    const headline = objs.find((o: any) => o.data?.role === "headline") as fabric.Textbox | undefined;
    const updated: Slide = { ...active, subtext: null };
    if (headline) {
      updated.headline = headline.text || "";
      updated.layout = {
        ...updated.layout,
        headline: {
          ...updated.layout.headline,
          x: Math.round(headline.left || 0),
          y: Math.round(headline.top || 0),
          fontSize: Math.round((headline.fontSize || 0) * (headline.scaleX || 1)),
          maxWidth: Math.round((headline.width || 0) * (headline.scaleX || 1)),
        },
      };
    }
    return updated;
  };

  const persistSlides = async (next: Slide[]) => {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase.from("slideshows").update({ slides: next as any }).eq("id", id);
    setSaving(false);
    if (error) toast.error(error.message);
  };

  const saveCurrent = async () => {
    const updated = captureLayout();
    if (!updated) return;
    const next = [...slides]; next[activeIdx] = updated;
    setSlideshow({ ...slideshow, slides: next });
    await persistSlides(next);
    toast.success("Saved");
  };

  const updateHeadline = (value: string) => {
    if (!fabricRef.current) return;
    const obj = fabricRef.current.getObjects().find((o: any) => o.data?.role === "headline") as fabric.Textbox | undefined;
    if (obj) { obj.set("text", value); fabricRef.current.renderAll(); }
    setHeadlineText(value);
  };

  const updateHeadlineSize = (size: number) => {
    setHeadlineSize(size);
    if (!fabricRef.current) return;
    const obj = fabricRef.current.getObjects().find((o: any) => o.data?.role === "headline") as fabric.Textbox | undefined;
    if (obj) { obj.set({ fontSize: size, scaleX: 1, scaleY: 1 }); fabricRef.current.renderAll(); }
  };

  const exportZip = async () => {
    if (!slideshow) return;
    setExporting(true);
    const zip = new JSZip();
    try {
      const currentUpdated = captureLayout();
      const workingSlides = currentUpdated ? slides.map((s, i) => i === activeIdx ? currentUpdated : s) : slides;

      const offCanvas = new fabric.StaticCanvas(null as any, { width: CANVAS_W, height: CANVAS_H });

      for (let i = 0; i < workingSlides.length; i++) {
        const slide = workingSlides[i];
        offCanvas.clear();
        offCanvas.backgroundColor = "#000";

        const url = imageMap[slide.image_id];
        if (url) {
          await new Promise<void>((resolve) => {
            fabric.Image.fromURL(url, (img) => {
              if (!img) return resolve();
              const scale = Math.max(CANVAS_W / (img.width || 1), CANVAS_H / (img.height || 1));
              img.scale(scale);
              img.set({ left: CANVAS_W / 2, top: CANVAS_H / 2, originX: "center", originY: "center" });
              offCanvas.add(img);
              resolve();
            }, { crossOrigin: "anonymous" });
          });
        }

        addCaption(offCanvas, slide);
        offCanvas.renderAll();
        const dataUrl = offCanvas.toDataURL({ format: "png", quality: 1 });
        const base64 = dataUrl.split(",")[1];
        zip.file(`slide-${String(i + 1).padStart(2, "0")}.png`, base64, { base64: true });
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${(slideshow.title || "slideshow").replace(/[^a-z0-9]+/gi, "-")}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success("Exported!");
    } catch (e: any) {
      toast.error(e.message || "Export failed");
    } finally { setExporting(false); }
  };

  if (loading || !slideshow) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <>
      <SEO title={slideshow.title || "Editor"} />
      <div className="container py-6">
        <header className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button size="sm" variant="ghost" onClick={() => navigate("/slideshows")}><ArrowLeft className="h-4 w-4" /></Button>
            <Input value={slideshow.title} onChange={e => setSlideshow({ ...slideshow, title: e.target.value })} onBlur={async () => { await supabase.from("slideshows").update({ title: slideshow.title }).eq("id", id); }} className="font-display font-bold text-lg max-w-xs border-0 bg-transparent focus-visible:ring-1" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={saveCurrent} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
            </Button>
            <Button size="sm" className="shadow-glow" onClick={exportZip} disabled={exporting}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export ZIP
            </Button>
          </div>
        </header>

        <div className="grid lg:grid-cols-[160px_1fr_300px] gap-6">
          {/* Slide thumbnails */}
          <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible">
            {slides.map((s, i) => (
              <button key={s.id} onClick={async () => { await saveCurrent(); setActiveIdx(i); }}
                className={`flex-shrink-0 aspect-[9/16] w-20 lg:w-full rounded-lg border-2 overflow-hidden bg-black relative text-left transition-all ${i === activeIdx ? "border-primary shadow-glow" : "border-border hover:border-primary/40"}`}>
                {imageMap[s.image_id] && <img src={imageMap[s.image_id]} alt="" className="object-cover w-full h-full opacity-70" />}
                <div className="absolute inset-x-0 top-0 p-1 text-[10px] font-bold text-white bg-black/60 truncate">{i + 1}. {s.type}</div>
              </button>
            ))}
          </div>

          {/* Canvas */}
          <Card className="p-4 shadow-card flex items-center justify-center bg-muted/30">
            <div style={{ width: DISPLAY_W, height: DISPLAY_W * (CANVAS_H / CANVAS_W) }} className="relative overflow-hidden">
              <div style={{ transform: `scale(${DISPLAY_W / CANVAS_W})`, transformOrigin: "top left", width: CANVAS_W, height: CANVAS_H }}>
                <canvas ref={canvasRef} />
              </div>
            </div>
          </Card>

          {/* Inspector */}
          <Card className="p-5 shadow-card space-y-4 h-fit">
            <h3 className="font-display font-bold flex items-center gap-2"><Type className="h-4 w-4" /> Slide {activeIdx + 1}</h3>
            <div className="space-y-2">
              <Label>Caption</Label>
              <Textarea value={headlineText} onChange={e => updateHeadline(e.target.value)} rows={4} placeholder="Use a line break between sentences for a soft pause." />
            </div>
            <div className="space-y-2">
              <Label>Caption size: {headlineSize}px</Label>
              <Slider value={[headlineSize]} min={32} max={120} step={2} onValueChange={v => updateHeadlineSize(v[0])} />
            </div>
            <p className="text-xs text-muted-foreground">Drag the caption on the canvas to reposition. Click Save when done.</p>
          </Card>
        </div>
      </div>
    </>
  );
};

export default SlideshowEditor;
