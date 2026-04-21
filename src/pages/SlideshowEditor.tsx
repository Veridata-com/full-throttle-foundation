import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fabric } from "fabric";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Download, Save, ArrowLeft, Image as ImageIcon, Plus, RotateCcw } from "lucide-react";
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
  fabric_state?: any;
}

const CANVAS_W = 1080;
const CANVAS_H = 1920;
const MEME_FONT = '"Arial Black", "Helvetica Neue", Helvetica, Arial, sans-serif';

const FILL_SWATCHES = ["#FFFFFF", "#000000", "#FFE500", "#FF3B5C"];
const STROKE_SWATCHES = ["#000000", "#FFFFFF", "#FFE500", "#FF3B5C"];

// Editor palette (hardcoded dark to match spec)
const C = {
  bg: "#0A0A0A",
  panel: "#111111",
  border: "#2A2A2A",
  accent: "#FF3B5C",
  muted: "#A0A0A0",
  text: "#FFFFFF",
};

function buildText(value: string, l: SlideLayout["headline"], role: "headline" | "subtext", interactive: boolean) {
  const t = new fabric.IText(value || "", {
    left: l.x,
    top: l.y,
    originX: "center",
    originY: "center",
    fontSize: l.fontSize,
    fontFamily: MEME_FONT,
    fontWeight: 900,
    fill: l.color,
    stroke: l.stroke,
    strokeWidth: l.strokeWidth,
    paintFirst: "stroke",
    textAlign: "center",
    lineHeight: 1.05,
    shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.6)", blur: 8, offsetX: 0, offsetY: 3 }),
    selectable: interactive,
    evented: interactive,
    editable: interactive,
    lockUniScaling: true,
  });
  (t as any).set("data", { role });
  return t;
}

const SlideshowEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  const [slideshow, setSlideshow] = useState<any>(null);
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const [activeIdx, setActiveIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savingLabel, setSavingLabel] = useState<string>("");
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Inspector state mirrors the active fabric object
  const [activeRole, setActiveRole] = useState<"headline" | "subtext" | "custom" | null>("headline");
  const [text, setText] = useState("");
  const [size, setSize] = useState(88);
  const [fill, setFill] = useState("#FFFFFF");
  const [stroke, setStroke] = useState("#000000");

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

  // Init fabric canvas once
  useEffect(() => {
    if (!canvasRef.current || fabricRef.current) return;
    const c = new fabric.Canvas(canvasRef.current, { width: CANVAS_W, height: CANVAS_H, backgroundColor: "#000", preserveObjectStacking: true });
    fabricRef.current = c;

    const syncFromActive = () => {
      const obj = c.getActiveObject() as fabric.IText | undefined;
      if (!obj) { setActiveRole(null); return; }
      const role = ((obj as any).data?.role as any) || "custom";
      setActiveRole(role);
      setText((obj as any).text || "");
      setSize(Math.round(((obj as any).fontSize || 0) * (obj.scaleX || 1)));
      setFill(((obj as any).fill as string) || "#FFFFFF");
      setStroke(((obj as any).stroke as string) || "#000000");
    };
    c.on("selection:created", syncFromActive);
    c.on("selection:updated", syncFromActive);
    c.on("selection:cleared", () => setActiveRole(null));

    return () => { c.dispose(); fabricRef.current = null; };
  }, []);

  // Responsive scale
  useEffect(() => {
    const calc = () => {
      const el = stageRef.current; if (!el) return;
      const w = el.clientWidth, h = el.clientHeight;
      setScale(Math.min(w / CANVAS_W, h / CANVAS_H));
    };
    calc();
    const ro = new ResizeObserver(calc);
    if (stageRef.current) ro.observe(stageRef.current);
    return () => ro.disconnect();
  }, [loading]);

  const slides: Slide[] = slideshow?.slides || [];
  const active = slides[activeIdx];

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
          const s = Math.max(CANVAS_W / (img.width || 1), CANVAS_H / (img.height || 1));
          img.scale(s);
          img.set({ left: CANVAS_W / 2, top: CANVAS_H / 2, originX: "center", originY: "center", selectable: false, evented: false });
          canvas.add(img); canvas.sendToBack(img);
          resolve();
        }, { crossOrigin: "anonymous" });
      });
    }

    if (slide.fabric_state?.objects?.length) {
      // Restore saved text objects only (image already added as background)
      const textObjs = slide.fabric_state.objects.filter((o: any) => o.type === "i-text" || o.type === "IText");
      await new Promise<void>((resolve) => {
        fabric.util.enlivenObjects(textObjs, (objs: fabric.Object[]) => {
          objs.forEach((o) => {
            (o as any).set({ selectable: true, evented: true, editable: true });
            canvas.add(o);
          });
          resolve();
        }, "fabric");
      });
    } else {
      canvas.add(buildText(slide.headline || "", slide.layout.headline, "headline", true));
      if (slide.subtext) canvas.add(buildText(slide.subtext, slide.layout.subtext, "subtext", true));
    }
    canvas.discardActiveObject();
    canvas.renderAll();
    setActiveRole(null);
  }, [imageMap]);

  useEffect(() => { if (active) renderSlide(active); }, [active?.id, renderSlide]);

  const captureFabricState = () => fabricRef.current ? fabricRef.current.toJSON(["data"]) : null;

  const persistCurrent = useCallback(async (label = "Saving…") => {
    if (!fabricRef.current || !active || !id) return;
    setSaving(true); setSavingLabel(label);
    const state = captureFabricState();
    const headlineObj = fabricRef.current.getObjects().find((o: any) => o.data?.role === "headline") as fabric.IText | undefined;
    const subtextObj = fabricRef.current.getObjects().find((o: any) => o.data?.role === "subtext") as fabric.IText | undefined;
    const updated: Slide = {
      ...active,
      headline: headlineObj?.text || active.headline,
      subtext: subtextObj?.text ?? active.subtext,
      fabric_state: state,
    };
    const next = [...slides]; next[activeIdx] = updated;
    setSlideshow((s: any) => ({ ...s, slides: next }));
    const { error } = await supabase.from("slideshows").update({ slides: next as any }).eq("id", id);
    setSaving(false);
    if (error) toast.error(error.message);
    else { setSavingLabel("Saved"); setTimeout(() => setSavingLabel(""), 1500); }
  }, [active, activeIdx, slides, id]);

  // Auto-save every 30s
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => persistCurrent("Auto-saving…"), 30000);
    return () => clearInterval(t);
  }, [active, persistCurrent]);

  const switchTo = async (i: number) => {
    if (i === activeIdx) return;
    await persistCurrent();
    setActiveIdx(i);
  };

  // Inspector handlers — mutate active object
  const withActive = (fn: (o: fabric.IText) => void) => {
    const c = fabricRef.current; if (!c) return;
    const o = c.getActiveObject() as fabric.IText | undefined; if (!o) return;
    fn(o); c.renderAll();
  };
  const onText = (v: string) => { setText(v); withActive((o) => o.set({ text: v })); };
  const onSize = (v: number) => { setSize(v); withActive((o) => o.set({ fontSize: v, scaleX: 1, scaleY: 1 })); };
  const onFill = (c: string) => { setFill(c); withActive((o) => o.set({ fill: c })); };
  const onStroke = (c: string) => { setStroke(c); withActive((o) => o.set({ stroke: c })); };

  const addTextBlock = () => {
    const c = fabricRef.current; if (!c) return;
    const t = buildText("New text", { x: CANVAS_W / 2, y: CANVAS_H / 2, fontSize: 80, color: "#FFFFFF", stroke: "#000000", strokeWidth: 8, fontWeight: 900, textAlign: "center", maxWidth: 900 }, "headline" as any, true);
    (t as any).set("data", { role: "custom" });
    c.add(t); c.setActiveObject(t); c.renderAll();
  };

  const resetStyle = () => withActive((o) => {
    const role = (o as any).data?.role;
    const l = role === "subtext" ? active?.layout.subtext : active?.layout.headline;
    if (!l) return;
    o.set({ fill: l.color, stroke: l.stroke, strokeWidth: l.strokeWidth, fontSize: l.fontSize, scaleX: 1, scaleY: 1, fontWeight: 900, fontFamily: MEME_FONT });
    setFill(l.color); setStroke(l.stroke); setSize(l.fontSize);
  });

  const downloadPNG = () => {
    const c = fabricRef.current; if (!c) return;
    c.discardActiveObject(); c.renderAll();
    const url = c.toDataURL({ format: "png", multiplier: 1 });
    const a = document.createElement("a");
    a.href = url; a.download = `slide-${activeIdx + 1}.png`; a.click();
    toast.success("Slide downloaded!");
  };

  const exportZip = async () => {
    if (!slideshow) return;
    setExporting(true);
    try {
      await persistCurrent();
      const zip = new JSZip();
      const off = new fabric.StaticCanvas(null as any, { width: CANVAS_W, height: CANVAS_H });
      const working: Slide[] = (slideshow.slides || []).map((s: Slide, i: number) => i === activeIdx ? { ...s, fabric_state: captureFabricState() } : s);

      for (let i = 0; i < working.length; i++) {
        const slide = working[i];
        off.clear();
        off.backgroundColor = "#000";
        const url = imageMap[slide.image_id];
        if (url) {
          await new Promise<void>((resolve) => {
            fabric.Image.fromURL(url, (img) => {
              if (!img) return resolve();
              const s = Math.max(CANVAS_W / (img.width || 1), CANVAS_H / (img.height || 1));
              img.scale(s);
              img.set({ left: CANVAS_W / 2, top: CANVAS_H / 2, originX: "center", originY: "center" });
              off.add(img);
              resolve();
            }, { crossOrigin: "anonymous" });
          });
        }
        if (slide.fabric_state?.objects?.length) {
          const textObjs = slide.fabric_state.objects.filter((o: any) => o.type === "i-text" || o.type === "IText");
          await new Promise<void>((resolve) => {
            fabric.util.enlivenObjects(textObjs, (objs: fabric.Object[]) => { objs.forEach((o) => off.add(o)); resolve(); }, "fabric");
          });
        } else {
          off.add(buildText(slide.headline || "", slide.layout.headline, "headline", false));
          if (slide.subtext) off.add(buildText(slide.subtext, slide.layout.subtext, "subtext", false));
        }
        off.renderAll();
        const dataUrl = off.toDataURL({ format: "png", quality: 1 });
        zip.file(`slide-${String(i + 1).padStart(2, "0")}.png`, dataUrl.split(",")[1], { base64: true });
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${(slideshow.title || "slideshow").replace(/[^a-z0-9]+/gi, "-")}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success("Exported!");
    } catch (e: any) { toast.error(e.message || "Export failed"); } finally { setExporting(false); }
  };

  if (loading || !slideshow) {
    return <div className="flex min-h-screen items-center justify-center" style={{ background: C.bg }}><Loader2 className="h-8 w-8 animate-spin" style={{ color: C.accent }} /></div>;
  }

  const Swatch = ({ color, active, onClick }: { color: string; active: boolean; onClick: () => void }) => (
    <button onClick={onClick} className="h-7 w-7 rounded-full transition-transform hover:scale-110" style={{ background: color, boxShadow: active ? `0 0 0 2px ${C.bg}, 0 0 0 4px ${C.text}` : `inset 0 0 0 1px ${C.border}` }} aria-label={color} />
  );

  return (
    <>
      <SEO title={slideshow.title || "Editor"} />
      <div className="min-h-screen flex flex-col" style={{ background: C.bg, color: C.text }}>
        {/* Toolbar */}
        <header className="flex items-center justify-between px-4 gap-3 flex-shrink-0" style={{ height: 56, borderBottom: `1px solid ${C.border}`, background: C.panel }}>
          <div className="flex items-center gap-2 min-w-0">
            <Button size="sm" variant="ghost" onClick={() => navigate("/slideshows")} style={{ color: C.text }} className="hover:bg-white/5"><ArrowLeft className="h-4 w-4" /></Button>
            <Input
              value={slideshow.title}
              onChange={e => setSlideshow({ ...slideshow, title: e.target.value })}
              onBlur={async () => { await supabase.from("slideshows").update({ title: slideshow.title }).eq("id", id); }}
              className="font-bold text-base max-w-xs border-0 bg-transparent focus-visible:ring-0"
              style={{ color: C.text }}
            />
          </div>
          <div className="flex items-center gap-3">
            {savingLabel && <span className="text-xs transition-opacity" style={{ color: C.muted }}>{savingLabel}</span>}
            <Button size="sm" variant="ghost" onClick={() => persistCurrent()} disabled={saving} style={{ color: C.text }} className="hover:bg-white/5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
            </Button>
            <Button size="sm" variant="ghost" onClick={downloadPNG} style={{ color: C.text }} className="hover:bg-white/5">
              <ImageIcon className="h-4 w-4" /> PNG
            </Button>
            <Button size="sm" onClick={exportZip} disabled={exporting} style={{ background: C.accent, color: "#fff" }} className="hover:opacity-90">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export ZIP
            </Button>
          </div>
        </header>

        <div className="flex-1 flex min-h-0">
          {/* Slides rail */}
          <aside className="flex-shrink-0 overflow-y-auto p-3 space-y-2" style={{ width: 200, background: C.panel, borderRight: `1px solid ${C.border}` }}>
            {slides.map((s, i) => (
              <button key={s.id} onClick={() => switchTo(i)}
                className="w-full aspect-[9/16] rounded-lg overflow-hidden relative text-left transition-all"
                style={{ border: `2px solid ${i === activeIdx ? C.accent : C.border}`, background: "#000" }}>
                {imageMap[s.image_id] && <img src={imageMap[s.image_id]} alt="" className="object-cover w-full h-full opacity-60" />}
                <div className="absolute inset-x-0 top-0 px-2 py-1 text-[10px] font-bold truncate" style={{ background: "rgba(0,0,0,0.7)", color: C.text }}>{i + 1}. {s.type}</div>
              </button>
            ))}
          </aside>

          {/* Canvas stage */}
          <main ref={stageRef} className="flex-1 min-w-0 flex items-center justify-center p-6 overflow-hidden" style={{ background: C.bg }}>
            <div style={{ width: CANVAS_W * scale, height: CANVAS_H * scale, position: "relative" }}>
              <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: CANVAS_W, height: CANVAS_H }}>
                <canvas ref={canvasRef} id="slideshow-canvas" />
              </div>
            </div>
          </main>

          {/* Inspector */}
          <aside className="flex-shrink-0 overflow-y-auto p-5 space-y-6" style={{ width: 280, background: C.panel, borderLeft: `1px solid ${C.border}` }}>
            <div>
              <div className="text-[11px] font-bold tracking-wider mb-2" style={{ color: C.muted }}>TEXT CONTENT</div>
              <Textarea
                value={text}
                onChange={e => onText(e.target.value)}
                rows={3}
                disabled={!activeRole}
                placeholder={activeRole ? "Type caption…" : "Select text on canvas"}
                className="resize-none"
                style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
              />
            </div>

            <div>
              <div className="text-[11px] font-bold tracking-wider mb-2 flex justify-between" style={{ color: C.muted }}>
                <span>TEXT SIZE</span><span style={{ color: C.text }}>{size}px</span>
              </div>
              <Slider value={[size]} min={20} max={200} step={2} onValueChange={v => onSize(v[0])} disabled={!activeRole} />
            </div>

            <div className="space-y-3">
              <div className="text-[11px] font-bold tracking-wider" style={{ color: C.muted }}>STYLE</div>
              <div>
                <div className="text-xs mb-2" style={{ color: C.muted }}>Fill</div>
                <div className="flex items-center gap-2">
                  {FILL_SWATCHES.map(c => <Swatch key={c} color={c} active={fill.toUpperCase() === c} onClick={() => onFill(c)} />)}
                  <input type="color" value={fill} onChange={e => onFill(e.target.value)} disabled={!activeRole}
                    className="h-7 w-7 rounded-full cursor-pointer bg-transparent border-0 p-0" />
                </div>
              </div>
              <div>
                <div className="text-xs mb-2" style={{ color: C.muted }}>Outline</div>
                <div className="flex items-center gap-2">
                  {STROKE_SWATCHES.map(c => <Swatch key={c} color={c} active={stroke.toUpperCase() === c} onClick={() => onStroke(c)} />)}
                  <input type="color" value={stroke} onChange={e => onStroke(e.target.value)} disabled={!activeRole}
                    className="h-7 w-7 rounded-full cursor-pointer bg-transparent border-0 p-0" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-bold tracking-wider" style={{ color: C.muted }}>ACTIONS</div>
              <Button size="sm" variant="outline" onClick={resetStyle} disabled={!activeRole} className="w-full justify-start" style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.text }}>
                <RotateCcw className="h-4 w-4" /> Reset style
              </Button>
              <Button size="sm" variant="outline" onClick={addTextBlock} className="w-full justify-start" style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.text }}>
                <Plus className="h-4 w-4" /> Add text block
              </Button>
            </div>

            <p className="text-[11px] leading-relaxed" style={{ color: C.muted }}>
              Drag to move. Double-click text to edit inline. Auto-saves every 30s.
            </p>
          </aside>
        </div>
      </div>
    </>
  );
};

export default SlideshowEditor;
