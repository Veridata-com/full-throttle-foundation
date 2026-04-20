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

const SlideshowEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const [slideshow, setSlideshow] = useState<any>(null);
  const [imageMap, setImageMap] = useState<Record<string, string>>({}); // image_id -> signed url
  const [activeIdx, setActiveIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [headlineText, setHeadlineText] = useState("");
  const [subtextText, setSubtextText] = useState("");
  const [headlineSize, setHeadlineSize] = useState(88);

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

          // dark gradient overlay for text legibility
          const overlay = new fabric.Rect({
            left: 0, top: CANVAS_H * 0.15, width: CANVAS_W, height: CANVAS_H * 0.55,
            fill: new fabric.Gradient({
              type: "linear",
              coords: { x1: 0, y1: 0, x2: 0, y2: CANVAS_H * 0.55 },
              colorStops: [
                { offset: 0, color: "rgba(0,0,0,0.7)" },
                { offset: 1, color: "rgba(0,0,0,0)" },
              ],
            }) as any,
            selectable: false, evented: false,
          });
          canvas.add(overlay);
          resolve();
        }, { crossOrigin: "anonymous" });
      });
    }

    const headline = new fabric.Textbox(slide.headline, {
      left: slide.layout.headline.x,
      top: slide.layout.headline.y,
      width: slide.layout.headline.maxWidth,
      fontSize: slide.layout.headline.fontSize,
      fill: slide.layout.headline.color,
      stroke: slide.layout.headline.stroke,
      strokeWidth: slide.layout.headline.strokeWidth,
      paintFirst: "stroke",
      fontFamily: "Syne, system-ui, sans-serif",
      fontWeight: slide.layout.headline.fontWeight,
      textAlign: slide.layout.headline.textAlign as any,
      originX: "center", originY: "center",
      lockUniScaling: true,
    });
    headline.set("data", { role: "headline" });
    canvas.add(headline);

    if (slide.subtext) {
      const sub = new fabric.Textbox(slide.subtext, {
        left: slide.layout.subtext.x,
        top: slide.layout.subtext.y,
        width: slide.layout.subtext.maxWidth,
        fontSize: slide.layout.subtext.fontSize,
        fill: slide.layout.subtext.color,
        stroke: slide.layout.subtext.stroke,
        strokeWidth: slide.layout.subtext.strokeWidth,
        paintFirst: "stroke",
        fontFamily: "DM Sans, system-ui, sans-serif",
        fontWeight: slide.layout.subtext.fontWeight,
        textAlign: slide.layout.subtext.textAlign as any,
        originX: "center", originY: "center",
        lockUniScaling: true,
      });
      sub.set("data", { role: "subtext" });
      canvas.add(sub);
    }

    canvas.renderAll();
    setHeadlineText(slide.headline);
    setSubtextText(slide.subtext || "");
    setHeadlineSize(slide.layout.headline.fontSize);
  }, [imageMap]);

  useEffect(() => {
    if (active) renderSlide(active);
  }, [active, renderSlide]);

  // Capture changes to slide layout from canvas
  const captureLayout = (): Slide | null => {
    if (!active || !fabricRef.current) return null;
    const objs = fabricRef.current.getObjects();
    const headline = objs.find((o: any) => o.data?.role === "headline") as fabric.Textbox | undefined;
    const sub = objs.find((o: any) => o.data?.role === "subtext") as fabric.Textbox | undefined;
    const updated: Slide = { ...active };
    if (headline) {
      updated.headline = headline.text || "";
      updated.layout.headline = {
        ...updated.layout.headline,
        x: Math.round(headline.left || 0),
        y: Math.round(headline.top || 0),
        fontSize: Math.round((headline.fontSize || 0) * (headline.scaleX || 1)),
        maxWidth: Math.round((headline.width || 0) * (headline.scaleX || 1)),
      };
    }
    if (sub) {
      updated.subtext = sub.text || "";
      updated.layout.subtext = {
        ...updated.layout.subtext,
        x: Math.round(sub.left || 0),
        y: Math.round(sub.top || 0),
        fontSize: Math.round((sub.fontSize || 0) * (sub.scaleX || 1)),
        maxWidth: Math.round((sub.width || 0) * (sub.scaleX || 1)),
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

  const updateText = (field: "headline" | "subtext", value: string) => {
    if (!fabricRef.current || !active) return;
    const objs = fabricRef.current.getObjects();
    const obj = objs.find((o: any) => o.data?.role === field) as fabric.Textbox | undefined;
    if (obj) { obj.set("text", value); fabricRef.current.renderAll(); }
    if (field === "headline") setHeadlineText(value); else setSubtextText(value);
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
      // Save current slide first
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
              const overlay = new fabric.Rect({
                left: 0, top: CANVAS_H * 0.15, width: CANVAS_W, height: CANVAS_H * 0.55,
                fill: new fabric.Gradient({
                  type: "linear",
                  coords: { x1: 0, y1: 0, x2: 0, y2: CANVAS_H * 0.55 },
                  colorStops: [{ offset: 0, color: "rgba(0,0,0,0.7)" }, { offset: 1, color: "rgba(0,0,0,0)" }],
                }) as any,
              });
              offCanvas.add(overlay);
              resolve();
            }, { crossOrigin: "anonymous" });
          });
        }

        const h = slide.layout.headline;
        offCanvas.add(new fabric.Textbox(slide.headline, {
          left: h.x, top: h.y, width: h.maxWidth, fontSize: h.fontSize, fill: h.color,
          stroke: h.stroke, strokeWidth: h.strokeWidth, paintFirst: "stroke",
          fontFamily: "Syne, system-ui, sans-serif", fontWeight: h.fontWeight,
          textAlign: h.textAlign as any, originX: "center", originY: "center",
        }));
        if (slide.subtext) {
          const s = slide.layout.subtext;
          offCanvas.add(new fabric.Textbox(slide.subtext, {
            left: s.x, top: s.y, width: s.maxWidth, fontSize: s.fontSize, fill: s.color,
            stroke: s.stroke, strokeWidth: s.strokeWidth, paintFirst: "stroke",
            fontFamily: "DM Sans, system-ui, sans-serif", fontWeight: s.fontWeight,
            textAlign: s.textAlign as any, originX: "center", originY: "center",
          }));
        }
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
            <div style={{ width: DISPLAY_W, height: DISPLAY_W * (CANVAS_H / CANVAS_W) }} className="relative">
              <div style={{ transform: `scale(${DISPLAY_W / CANVAS_W})`, transformOrigin: "top left", width: CANVAS_W, height: CANVAS_H }}>
                <canvas ref={canvasRef} />
              </div>
            </div>
          </Card>

          {/* Inspector */}
          <Card className="p-5 shadow-card space-y-4 h-fit">
            <h3 className="font-display font-bold flex items-center gap-2"><Type className="h-4 w-4" /> Slide {activeIdx + 1}</h3>
            <div className="space-y-2">
              <Label>Headline</Label>
              <Textarea value={headlineText} onChange={e => updateText("headline", e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Headline size: {headlineSize}px</Label>
              <Slider value={[headlineSize]} min={32} max={160} step={2} onValueChange={v => updateHeadlineSize(v[0])} />
            </div>
            <div className="space-y-2">
              <Label>Subtext</Label>
              <Textarea value={subtextText} onChange={e => updateText("subtext", e.target.value)} rows={3} placeholder="Optional supporting text" />
            </div>
            <p className="text-xs text-muted-foreground">Tip: drag text on the canvas to reposition. Click Save when done.</p>
          </Card>
        </div>
      </div>
    </>
  );
};

import { Textarea } from "@/components/ui/textarea";

export default SlideshowEditor;
