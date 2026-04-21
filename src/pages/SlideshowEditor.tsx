import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fabric } from "fabric";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Download, Save, ArrowLeft, Image as ImageIcon, Plus, RotateCcw, Type, Palette, Sliders, X } from "lucide-react";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";
import { useIsMobile } from "@/hooks/use-mobile";

interface Slide {
  id: string;
  type: "hook" | "value" | "cta";
  text?: string | null;
  // legacy fields (read for back-compat, no longer written)
  headline?: string;
  subtext?: string | null;
  image_id: string;
  layout?: any;
  fabric_state?: any;
}

const CANVAS_W = 1080;
const CANVAS_H = 1920;
const MEME_FONT = '"Arial Black", "Helvetica Neue Black", "Helvetica Black", Arial, sans-serif';

const FILL_SWATCHES = ["#FFFFFF", "#000000", "#FFE500", "#FF3B5C"];
const STROKE_SWATCHES = ["#000000", "#FFFFFF", "#FFE500", "#FF3B5C"];

const C = {
  bg: "#0A0A0A",
  panel: "#111111",
  panelHover: "#161616",
  itemActive: "#1A1A1A",
  border: "#2A2A2A",
  borderHover: "#505050",
  accent: "#FF3B5C",
  accentHover: "#E8304F",
  muted: "#A0A0A0",
  mutedDim: "#505050",
  text: "#FFFFFF",
  ok: "#22C55E",
};

// Legacy slides may have headline + subtext. Merge into one text block.
function slideToText(s: Slide): string {
  if (typeof s.text === "string" && s.text.length) return s.text;
  const parts = [s.headline, s.subtext].filter(Boolean) as string[];
  return parts.join("\n") || "tap to edit your text here.";
}

// Disable Fabric per-object caching globally — biggest fix for glitching on CSS-scaled canvas.
(fabric.Object.prototype as any).objectCaching = false;
(fabric.IText.prototype as any).objectCaching = false;

const MAX_CHARS_PER_LINE = 35;

function wrapTextToMaxChars(text: string, maxChars = MAX_CHARS_PER_LINE): string {
  const inputLines = (text || "").split("\n");
  const out: string[] = [];
  for (const line of inputLines) {
    if (line.length <= maxChars) { out.push(line); continue; }
    const words = line.split(" ");
    let cur = "";
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (test.length <= maxChars) cur = test;
      else { if (cur) out.push(cur); cur = w; }
    }
    if (cur) out.push(cur);
  }
  return out.join("\n");
}

function calculateOptimalFontSize(_text: string): number {
  // Fixed preset size for generated slideshow text.
  return 46;
}

function makeShadow() {
  return new fabric.Shadow({ color: "rgba(0,0,0,0.9)", blur: 16, offsetX: 3, offsetY: 3 });
}

function buildText(value: string, opts?: { top?: number; fontSize?: number; wrap?: boolean }) {
  const wrapped = opts?.wrap === false ? (value || "") : wrapTextToMaxChars(value || "");
  const fontSize = opts?.fontSize ?? calculateOptimalFontSize(wrapped);
  return new fabric.IText(wrapped, {
    left: CANVAS_W / 2,
    top: opts?.top ?? 1100,
    originX: "center",
    originY: "center",
    fontFamily: MEME_FONT,
    fontWeight: "900",
    fontSize,
    fill: "#FFFFFF",
    stroke: "#000000",
    strokeWidth: 10,
    paintFirst: "stroke",
    textAlign: "center",
    width: 900,
    lineHeight: 1.35,
    shadow: makeShadow(),
    editable: true,
    selectable: true,
    hasControls: true,
    hasBorders: true,
    lockScalingFlip: true,
    splitByGrapheme: false,
  });
}

const SlideshowEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const slidesRef = useRef<Slide[]>([]);
  const activeIdxRef = useRef(0);
  const imageMapRef = useRef<Record<string, string>>({});

  const [slideshow, setSlideshow] = useState<any>(null);
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const [activeIdx, setActiveIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savingLabel, setSavingLabel] = useState<string>("");
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [titleEditing, setTitleEditing] = useState(false);
  const [title, setTitle] = useState("");

  // Inspector state
  const [hasSelection, setHasSelection] = useState(false);
  const [slideText, setSlideText] = useState("");
  const [fontSize, setFontSize] = useState(80);
  const [fill, setFill] = useState("#FFFFFF");
  const [stroke, setStroke] = useState("#000000");

  const isMobile = useIsMobile();
  const [mobileSheet, setMobileSheet] = useState<null | "text" | "size" | "color">(null);

  // Keep refs in sync for use in cleanup / async paths
  useEffect(() => { activeIdxRef.current = activeIdx; }, [activeIdx]);
  useEffect(() => { imageMapRef.current = imageMap; }, [imageMap]);
  useEffect(() => { slidesRef.current = slideshow?.slides || []; }, [slideshow]);

  // Load slideshow + signed image URLs
  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const { data: ss, error } = await supabase.from("slideshows").select("*").eq("id", id).single();
      if (error || !ss) { toast.error("Not found"); navigate("/slideshows"); return; }
      setSlideshow(ss);
      setTitle(ss.title || "Untitled");
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

  const renderThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slides: Slide[] = slideshow?.slides || [];
  const active = slides[activeIdx];

  // Helper to get the primary text object
  const findTextObject = (canvas: fabric.Canvas): fabric.IText | undefined =>
    canvas.getObjects().find((o) => o.type === "i-text") as fabric.IText | undefined;

  // Sync inspector from currently selected object
  const syncInspectorFrom = (obj?: fabric.Object | null) => {
    if (!obj || obj.type !== "i-text") { setHasSelection(false); return; }
    const t = obj as fabric.IText;
    setHasSelection(true);
    setSlideText(t.text || "");
    setFontSize(Math.round(((t.fontSize as number) || 80)));
    setFill(((t.fill as string) || "#FFFFFF").toUpperCase());
    setStroke(((t.stroke as string) || "#000000").toUpperCase());
  };

  // (Re)init the canvas every time the active slide changes
  useEffect(() => {
    if (loading || !canvasRef.current || !active) return;

    // Dispose any prior canvas
    if (fabricRef.current) {
      try { fabricRef.current.dispose(); } catch { /* noop */ }
      fabricRef.current = null;
    }

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: CANVAS_W,
      height: CANVAS_H,
      selection: true,
      preserveObjectStacking: true,
      backgroundColor: "#1a1a1a",
    });
    fabricRef.current = canvas;

    let disposed = false;

    // Load background image (cover)
    const url = imageMapRef.current[active.image_id];
    if (url) {
      fabric.Image.fromURL(
        url,
        (img) => {
          if (disposed || !fabricRef.current || !img) return;
          const s = Math.max(CANVAS_W / (img.width || 1), CANVAS_H / (img.height || 1));
          img.set({
            scaleX: s, scaleY: s,
            left: CANVAS_W / 2, top: CANVAS_H / 2,
            originX: "center", originY: "center",
            selectable: false, evented: false,
          });
          fabricRef.current.setBackgroundImage(img, fabricRef.current.renderAll.bind(fabricRef.current));
        },
        { crossOrigin: "anonymous" }
      );
    }

    // Restore saved fabric_state OR create fresh text object
    const restoreOrCreate = () => {
      if (active.fabric_state && active.fabric_state.objects && active.fabric_state.objects.length) {
        const textObjs = active.fabric_state.objects.filter((o: any) => o.type === "i-text" || o.type === "IText");
        fabric.util.enlivenObjects(textObjs, (objs: fabric.Object[]) => {
          if (disposed || !fabricRef.current) return;
          objs.forEach((o) => {
            (o as any).set({ selectable: true, evented: true, editable: true });
            fabricRef.current!.add(o);
          });
          const t = findTextObject(fabricRef.current);
          if (t) { setSlideText(t.text || ""); setFontSize(Math.round((t.fontSize as number) || 80)); }
          fabricRef.current.renderAll();
        }, "fabric");
      } else {
        const raw = slideToText(active);
        const wrapped = wrapTextToMaxChars(raw);
        const fs = calculateOptimalFontSize(wrapped);
        const t = buildText(wrapped, { fontSize: fs, wrap: false });
        canvas.add(t);
        setSlideText(wrapped);
        setFontSize(fs);
        canvas.renderAll();
      }
    };
    restoreOrCreate();

    // Selection wiring
    canvas.on("selection:created", (e: any) => syncInspectorFrom(e.selected?.[0]));
    canvas.on("selection:updated", (e: any) => syncInspectorFrom(e.selected?.[0]));
    canvas.on("selection:cleared", () => setHasSelection(false));

    // Disable shadow during inline editing — biggest perf killer per keystroke.
    canvas.on("text:editing:entered", (e: any) => {
      const t = e.target; if (!t) return;
      (t as any)._savedShadow = t.shadow;
      t.set("shadow", null);
      canvas.requestRenderAll();
    });
    canvas.on("text:editing:exited", (e: any) => {
      const t = e.target; if (!t) return;
      t.set("shadow", (t as any)._savedShadow || makeShadow());
      canvas.requestRenderAll();
    });

    return () => {
      disposed = true;
      try { canvas.dispose(); } catch { /* noop */ }
      if (fabricRef.current === canvas) fabricRef.current = null;
    };
  }, [activeIdx, loading, active?.id, imageMap]);

  // Responsive scale via Fabric's CSS-only setDimensions so pointer coords stay correct.
  useEffect(() => {
    const scale = () => {
      const stage = stageRef.current; const wrap = wrapperRef.current;
      if (!stage || !wrap) return;
      const availH = Math.max(0, stage.clientHeight - 16);
      const availW = Math.max(0, stage.clientWidth - 16);
      if (!availH || !availW) return;
      const s = Math.min(availH / CANVAS_H, availW / CANVAS_W);
      const cssW = CANVAS_W * s;
      const cssH = CANVAS_H * s;
      // Wrapper holds the CSS-sized canvas so flex centering works.
      wrap.style.width = `${cssW}px`;
      wrap.style.height = `${cssH}px`;
      wrap.style.transform = "none";
      // Tell Fabric the new CSS size — it remaps pointer events to internal 1080x1920 space.
      if (fabricRef.current) {
        try {
          fabricRef.current.setDimensions({ width: `${cssW}px`, height: `${cssH}px` }, { cssOnly: true });
          fabricRef.current.calcOffset();
        } catch { /* noop */ }
      }
    };
    scale();
    window.addEventListener("resize", scale);
    const ro = new ResizeObserver(scale);
    if (stageRef.current) ro.observe(stageRef.current);
    return () => { window.removeEventListener("resize", scale); ro.disconnect(); };
  }, [loading, activeIdx]);

  // Build the next slides array reflecting current canvas state
  const captureCurrentSlides = (): Slide[] => {
    const canvas = fabricRef.current;
    const cur = slidesRef.current;
    if (!canvas || !cur[activeIdxRef.current]) return cur;
    const state = canvas.toJSON();
    const t = findTextObject(canvas);
    const next = [...cur];
    next[activeIdxRef.current] = {
      ...next[activeIdxRef.current],
      text: t?.text ?? next[activeIdxRef.current].text ?? slideToText(next[activeIdxRef.current]),
      fabric_state: state,
    };
    return next;
  };

  const persistCurrent = useCallback(async (label = "Saving…", silent = false) => {
    if (!fabricRef.current || !id) return;
    if (!silent) { setSaving(true); setSavingLabel(label); }
    const next = captureCurrentSlides();
    setSlideshow((s: any) => ({ ...s, slides: next }));
    const { error } = await supabase.from("slideshows").update({ slides: next as any }).eq("id", id);
    if (!silent) setSaving(false);
    if (error) {
      if (!silent) toast.error("Save failed — try again");
    } else if (!silent) {
      setSavingLabel("Saved");
      setTimeout(() => setSavingLabel(""), 1500);
    }
  }, [id]);

  // Auto-save every 30s
  useEffect(() => {
    const t = setInterval(() => persistCurrent("Saving…", true), 30000);
    return () => clearInterval(t);
  }, [persistCurrent]);

  const switchTo = async (i: number) => {
    if (i === activeIdx) return;
    // Save current slide silently before swapping
    const next = captureCurrentSlides();
    setSlideshow((s: any) => ({ ...s, slides: next }));
    supabase.from("slideshows").update({ slides: next as any }).eq("id", id!).then(({ error }) => {
      if (error) console.error(error);
    });
    setActiveIdx(i);
  };

  // Inspector handlers
  const onTextChange = (v: string) => {
    setSlideText(v);
    const c = fabricRef.current; if (!c) return;
    const t = findTextObject(c); if (!t) return;
    t.set("text", v);
    if (renderThrottleRef.current) clearTimeout(renderThrottleRef.current);
    renderThrottleRef.current = setTimeout(() => { c.requestRenderAll(); }, 50);
  };
  const onSizeChange = (v: number) => {
    setFontSize(v);
    const c = fabricRef.current; if (!c) return;
    const t = (c.getActiveObject() as fabric.IText | undefined) || findTextObject(c);
    if (!t) return;
    t.set({ fontSize: v, scaleX: 1, scaleY: 1 } as any); c.renderAll();
  };
  const onFillChange = (color: string) => {
    setFill(color.toUpperCase());
    const c = fabricRef.current; if (!c) return;
    const t = (c.getActiveObject() as fabric.IText | undefined) || findTextObject(c);
    if (!t) return;
    t.set("fill", color); c.renderAll();
  };
  const onStrokeChange = (color: string) => {
    setStroke(color.toUpperCase());
    const c = fabricRef.current; if (!c) return;
    const t = (c.getActiveObject() as fabric.IText | undefined) || findTextObject(c);
    if (!t) return;
    t.set("stroke", color); c.renderAll();
  };

  const addTextBlock = () => {
    const c = fabricRef.current; if (!c) return;
    const t = buildText("new text block", { top: CANVAS_H / 2, fontSize: 72 });
    c.add(t); c.setActiveObject(t); c.renderAll();
    setHasSelection(true); setSlideText("new text block"); setFontSize(72); setFill("#FFFFFF"); setStroke("#000000");
  };

  const resetStyle = () => {
    const c = fabricRef.current; if (!c) return;
    const t = (c.getActiveObject() as fabric.IText | undefined) || findTextObject(c);
    if (!t) return;
    t.set({ fontSize: 80, fill: "#FFFFFF", stroke: "#000000", strokeWidth: 10, scaleX: 1, scaleY: 1, fontFamily: MEME_FONT, fontWeight: "900" } as any);
    c.renderAll();
    setFontSize(80); setFill("#FFFFFF"); setStroke("#000000");
  };

  const downloadPNG = async () => {
    const c = fabricRef.current; if (!c) { toast.error("Canvas not ready"); return; }
    c.discardActiveObject(); c.renderAll();
    await new Promise((r) => requestAnimationFrame(r));
    const url = c.toDataURL({ format: "png", quality: 1, multiplier: 1 });
    const a = document.createElement("a");
    a.href = url; a.download = `adrise-slide-${activeIdx + 1}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast.success("Slide downloaded!");
  };

  const exportZip = async () => {
    if (!slideshow) return;
    setExporting(true);
    try {
      // Save current slide first
      const working = captureCurrentSlides();
      setSlideshow((s: any) => ({ ...s, slides: working }));
      await supabase.from("slideshows").update({ slides: working as any }).eq("id", id!);

      const zip = new JSZip();
      const off = new fabric.StaticCanvas(null as any, { width: CANVAS_W, height: CANVAS_H, backgroundColor: "#1a1a1a" });

      for (let i = 0; i < working.length; i++) {
        const slide = working[i];
        off.clear();
        off.backgroundColor = "#1a1a1a";

        const url = imageMap[slide.image_id];
        if (url) {
          await new Promise<void>((resolve) => {
            fabric.Image.fromURL(url, (img) => {
              if (!img) return resolve();
              const s = Math.max(CANVAS_W / (img.width || 1), CANVAS_H / (img.height || 1));
              img.set({ scaleX: s, scaleY: s, left: CANVAS_W / 2, top: CANVAS_H / 2, originX: "center", originY: "center" });
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
          off.add(buildText(slideToText(slide)));
        }
        off.renderAll();
        await new Promise((r) => requestAnimationFrame(r));
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
    } catch (e: any) {
      toast.error(e.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  if (loading || !slideshow) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: C.bg }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: C.accent }} />
      </div>
    );
  }

  const Swatch = ({ color, active, onClick }: { color: string; active: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      className="h-7 w-7 rounded-full transition-transform hover:scale-110"
      style={{
        background: color,
        border: `2px solid ${active ? "#FFFFFF" : "transparent"}`,
        boxShadow: active ? "none" : `inset 0 0 0 1px ${C.border}`,
        cursor: "pointer",
      }}
      aria-label={color}
    />
  );

  const MobileTabBtn = ({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) => (
    <button
      onClick={onClick}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
        background: "transparent", border: "none", color: C.muted,
        padding: "6px 0", borderRadius: 8, cursor: "pointer",
      }}
    >
      {icon}
      <span style={{ fontSize: 11, fontWeight: 500 }}>{label}</span>
    </button>
  );

  const secondaryBtn: React.CSSProperties = {
    background: "transparent",
    border: `1px solid ${C.border}`,
    color: C.muted,
    borderRadius: 8,
    padding: "0 16px",
    height: 36,
    fontSize: 14,
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
    transition: "all 0.15s",
  };
  const primaryBtn: React.CSSProperties = {
    background: C.accent,
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "0 16px",
    height: 36,
    fontSize: 14,
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
    transition: "all 0.15s",
  };

  const slideHasText = (s: Slide) => {
    if (s.fabric_state?.objects?.length) return true;
    const txt = (s.text || s.headline || s.subtext || "").trim();
    return txt.length > 0 && txt !== "tap to edit your text here.";
  };

  return (
    <>
      <SEO title={slideshow.title || "Editor"} />
      <div className="flex flex-col" style={{ background: C.bg, color: C.text, height: "100vh", overflow: "hidden" }}>
        {isMobile ? (
          /* ============== MOBILE LAYOUT ============== */
          <>
            {/* Compact top bar */}
            <header
              className="flex items-center justify-between flex-shrink-0"
              style={{ height: 52, padding: "0 12px", background: C.panel, borderBottom: `1px solid ${C.border}` }}
            >
              <button
                onClick={() => navigate("/slideshows")}
                style={{ color: C.text, background: "transparent", border: "none", padding: 8, borderRadius: 6, display: "flex", alignItems: "center" }}
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              {titleEditing ? (
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={async () => {
                    setTitleEditing(false);
                    setSlideshow((s: any) => ({ ...s, title }));
                    await supabase.from("slideshows").update({ title }).eq("id", id!);
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                  style={{ flex: 1, minWidth: 0, margin: "0 8px", background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 14, fontWeight: 600, outline: "none" }}
                />
              ) : (
                <button
                  onClick={() => setTitleEditing(true)}
                  style={{ flex: 1, minWidth: 0, margin: "0 8px", color: C.text, fontSize: 14, fontWeight: 600, background: "transparent", border: "none", padding: "6px 10px", borderRadius: 6, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {title || "Untitled"}
                </button>
              )}

              <div className="flex items-center gap-1">
                <button
                  onClick={() => persistCurrent()}
                  disabled={saving}
                  style={{ color: C.muted, background: "transparent", border: "none", padding: 8, borderRadius: 6, display: "flex", alignItems: "center" }}
                  aria-label="Save"
                >
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                </button>
                <button
                  onClick={exportZip}
                  disabled={exporting}
                  style={{ color: "#fff", background: C.accent, border: "none", padding: "8px 10px", borderRadius: 8, display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 600 }}
                  aria-label="Export"
                >
                  {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                </button>
              </div>
            </header>

            {savingLabel && (
              <div style={{ fontSize: 11, color: C.mutedDim, textAlign: "center", padding: "4px 0", flexShrink: 0 }}>{savingLabel}</div>
            )}

            {/* Canvas area */}
            <main className="flex-1 min-h-0 flex flex-col" style={{ background: C.bg }}>
              <div ref={stageRef} className="flex-1 flex items-center justify-center overflow-hidden" style={{ padding: 8 }}>
                <div style={{ position: "relative" }}>
                  <div ref={wrapperRef} style={{ width: CANVAS_W, height: CANVAS_H, position: "relative" }}>
                    <canvas ref={canvasRef} id="fabric-canvas" />
                  </div>
                </div>
              </div>
            </main>

            {/* Bottom slide strip */}
            <div
              className="flex-shrink-0 overflow-x-auto"
              style={{ background: C.panel, borderTop: `1px solid ${C.border}`, padding: "8px 8px", display: "flex", gap: 6, scrollbarWidth: "thin" }}
            >
              {slides.map((s, i) => {
                const isActive = i === activeIdx;
                const hasText = slideHasText(s);
                return (
                  <button
                    key={s.id}
                    onClick={() => switchTo(i)}
                    style={{
                      flexShrink: 0,
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "8px 12px", borderRadius: 8,
                      background: isActive ? C.itemActive : "transparent",
                      border: `1px solid ${isActive ? C.borderHover : C.border}`,
                      cursor: "pointer",
                      minWidth: 80,
                    }}
                  >
                    <span style={{
                      width: 22, height: 22, borderRadius: 5,
                      background: isActive ? C.accent : "#1A1A1A",
                      color: isActive ? "#fff" : C.muted,
                      fontSize: 11, fontWeight: 700,
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>{i + 1}</span>
                    <span style={{ color: C.text, fontSize: 12, textTransform: "capitalize" }}>{s.type}</span>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: hasText ? C.ok : C.mutedDim, flexShrink: 0 }} />
                  </button>
                );
              })}
            </div>

            {/* Mobile action bar */}
            <div
              className="flex-shrink-0"
              style={{ background: C.panel, borderTop: `1px solid ${C.border}`, padding: "8px 12px", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}
            >
              <MobileTabBtn icon={<Type className="h-5 w-5" />} label="Text" onClick={() => setMobileSheet("text")} />
              <MobileTabBtn icon={<Sliders className="h-5 w-5" />} label="Size" onClick={() => setMobileSheet("size")} />
              <MobileTabBtn icon={<Palette className="h-5 w-5" />} label="Color" onClick={() => setMobileSheet("color")} />
              <MobileTabBtn icon={<Plus className="h-5 w-5" />} label="Add" onClick={addTextBlock} />
              <MobileTabBtn icon={<ImageIcon className="h-5 w-5" />} label="PNG" onClick={downloadPNG} />
            </div>

            {/* Mobile bottom-sheet */}
            {mobileSheet && (
              <>
                <div
                  onClick={() => setMobileSheet(null)}
                  style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40 }}
                />
                <div
                  style={{
                    position: "fixed", left: 0, right: 0, bottom: 0,
                    background: C.panel, borderTop: `1px solid ${C.border}`,
                    borderTopLeftRadius: 16, borderTopRightRadius: 16,
                    padding: "16px 16px 24px",
                    zIndex: 41,
                    maxHeight: "70vh", overflowY: "auto",
                  }}
                >
                  <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text, textTransform: "capitalize" }}>
                      {mobileSheet === "text" && "Slide text"}
                      {mobileSheet === "size" && `Font size: ${fontSize}px`}
                      {mobileSheet === "color" && "Colors"}
                    </div>
                    <button
                      onClick={() => setMobileSheet(null)}
                      style={{ color: C.muted, background: "transparent", border: "none", padding: 4, borderRadius: 6, display: "flex" }}
                      aria-label="Close"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {mobileSheet === "text" && (
                    <>
                      <textarea
                        value={slideText}
                        onChange={(e) => onTextChange(e.target.value)}
                        placeholder="your slide text here…"
                        style={{
                          width: "100%", minHeight: 140,
                          background: "#1A1A1A", border: `1px solid ${C.border}`, borderRadius: 8,
                          color: "#fff", fontSize: 15, lineHeight: 1.5, padding: 12,
                          resize: "vertical", fontFamily: "inherit", outline: "none",
                        }}
                      />
                      <div style={{ color: C.mutedDim, fontSize: 12, marginTop: 6 }}>
                        line breaks between sentences = TikTok rhythm
                      </div>
                    </>
                  )}

                  {mobileSheet === "size" && (
                    <input
                      type="range" min={40} max={120} step={2} value={fontSize}
                      onChange={(e) => onSizeChange(parseInt(e.target.value))}
                      style={{ width: "100%", accentColor: C.accent, marginTop: 8 }}
                    />
                  )}

                  {mobileSheet === "color" && (
                    <>
                      <div style={{ fontSize: 11, letterSpacing: "0.08em", color: C.mutedDim, textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>Text fill</div>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
                        {FILL_SWATCHES.map((c) => (
                          <Swatch key={c} color={c} active={fill === c.toUpperCase()} onClick={() => onFillChange(c)} />
                        ))}
                        <input type="color" value={fill} onChange={(e) => onFillChange(e.target.value)}
                          style={{ width: 32, height: 32, borderRadius: "50%", border: `1px solid ${C.border}`, cursor: "pointer", background: "transparent", padding: 0 }}
                        />
                      </div>
                      <div style={{ fontSize: 11, letterSpacing: "0.08em", color: C.mutedDim, textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>Outline</div>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
                        {STROKE_SWATCHES.map((c) => (
                          <Swatch key={c} color={c} active={stroke === c.toUpperCase()} onClick={() => onStrokeChange(c)} />
                        ))}
                        <input type="color" value={stroke} onChange={(e) => onStrokeChange(e.target.value)}
                          style={{ width: 32, height: 32, borderRadius: "50%", border: `1px solid ${C.border}`, cursor: "pointer", background: "transparent", padding: 0 }}
                        />
                      </div>
                      <button style={{ ...secondaryBtn, width: "100%", justifyContent: "center" }} onClick={resetStyle}>
                        <RotateCcw className="h-4 w-4" /> Reset to defaults
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </>
        ) : (
          /* ============== DESKTOP LAYOUT ============== */
          <>
            <header
              className="flex items-center justify-between flex-shrink-0"
              style={{ height: 56, padding: "0 16px", background: C.panel, borderBottom: `1px solid ${C.border}` }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => navigate("/slideshows")}
                  style={{ color: C.muted, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: 8, borderRadius: 6 }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
                  aria-label="Back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                {titleEditing ? (
                  <input
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={async () => {
                      setTitleEditing(false);
                      setSlideshow((s: any) => ({ ...s, title }));
                      await supabase.from("slideshows").update({ title }).eq("id", id!);
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                    style={{ background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 10px", fontSize: 15, fontWeight: 600, outline: "none", minWidth: 240 }}
                  />
                ) : (
                  <button
                    onClick={() => setTitleEditing(true)}
                    style={{ color: C.text, fontSize: 15, fontWeight: 600, background: "transparent", border: "none", cursor: "pointer", padding: "4px 10px", borderRadius: 6 }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = C.itemActive)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {title || "Untitled"}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {savingLabel && <span style={{ fontSize: 12, color: C.mutedDim, marginRight: 8 }}>{savingLabel}</span>}
                <button style={secondaryBtn} onClick={() => persistCurrent()} disabled={saving}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.borderHover; e.currentTarget.style.color = C.text; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
                </button>
                <button style={secondaryBtn} onClick={downloadPNG}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.borderHover; e.currentTarget.style.color = C.text; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}>
                  <ImageIcon className="h-4 w-4" /> Download PNG
                </button>
                <button style={primaryBtn} onClick={exportZip} disabled={exporting}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.accentHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = C.accent)}>
                  {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export ZIP
                </button>
              </div>
            </header>

            <div className="flex-1 flex min-h-0">
              <aside className="flex-shrink-0 overflow-y-auto" style={{ width: 220, background: C.panel, borderRight: `1px solid ${C.border}` }}>
                <div style={{ padding: "16px 16px 8px", fontSize: 11, letterSpacing: "0.08em", color: C.mutedDim, textTransform: "uppercase", fontWeight: 600 }}>
                  Slides
                </div>
                <div>
                  {slides.map((s, i) => {
                    const isActive = i === activeIdx;
                    const hasText = slideHasText(s);
                    return (
                      <button
                        key={s.id}
                        onClick={() => switchTo(i)}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          width: "calc(100% - 16px)", margin: "2px 8px",
                          padding: "10px 12px", borderRadius: 8,
                          background: isActive ? C.itemActive : "transparent",
                          border: "none", cursor: "pointer", textAlign: "left",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = C.panelHover; }}
                        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                      >
                        <span style={{
                          width: 24, height: 24, borderRadius: 6,
                          background: isActive ? C.accent : "#1A1A1A",
                          color: isActive ? "#fff" : C.muted,
                          fontSize: 12, fontWeight: 600,
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          {i + 1}
                        </span>
                        <span style={{ color: C.text, fontSize: 14, flex: 1, textTransform: "capitalize" }}>{s.type}</span>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: hasText ? C.ok : C.mutedDim, flexShrink: 0 }} />
                      </button>
                    );
                  })}
                </div>
              </aside>

              <main className="flex-1 min-w-0 flex flex-col" style={{ background: C.bg }}>
                <div ref={stageRef} className="flex-1 flex items-center justify-center overflow-hidden" style={{ padding: 12 }}>
                  <div style={{ position: "relative" }}>
                    <div ref={wrapperRef} style={{ width: CANVAS_W, height: CANVAS_H, position: "relative" }}>
                      <canvas ref={canvasRef} id="fabric-canvas" />
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: C.mutedDim, textAlign: "center", padding: 12, flexShrink: 0 }}>
                  Click text to select · drag to reposition · double-click to type directly on canvas
                </div>
              </main>

              <aside className="flex-shrink-0 overflow-y-auto flex flex-col" style={{ width: 300, background: C.panel, borderLeft: `1px solid ${C.border}`, padding: 20 }}>
                <div>
                  <div style={{ fontSize: 11, letterSpacing: "0.08em", color: C.mutedDim, textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>Slide text</div>
                  <textarea
                    value={slideText}
                    onChange={(e) => onTextChange(e.target.value)}
                    placeholder="your slide text appears here. edit it or type directly on the canvas."
                    style={{
                      width: "100%", minHeight: 160,
                      background: "#1A1A1A", border: `1px solid ${C.border}`, borderRadius: 8,
                      color: "#FFFFFF", fontSize: 15, lineHeight: 1.6, padding: 12,
                      resize: "vertical", fontFamily: "inherit", outline: "none",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = C.accent)}
                    onBlur={(e) => (e.target.style.borderColor = C.border)}
                  />
                  <div style={{ color: C.mutedDim, fontSize: 12, marginTop: 6 }}>
                    use line breaks between sentences for the TikTok rhythm
                  </div>
                </div>

                <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 20, paddingTop: 20 }}>
                  <div style={{ color: C.muted, fontSize: 13, marginBottom: 4 }}>font size: {fontSize}px</div>
                  <input
                    type="range" min={40} max={120} step={2} value={fontSize}
                    onChange={(e) => onSizeChange(parseInt(e.target.value))}
                    style={{ width: "100%", accentColor: C.accent, marginTop: 8 }}
                  />
                </div>

                <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 20, paddingTop: 20 }}>
                  <div style={{ fontSize: 11, letterSpacing: "0.08em", color: C.mutedDim, textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>Text color</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {FILL_SWATCHES.map((c) => (
                      <Swatch key={c} color={c} active={fill === c.toUpperCase()} onClick={() => onFillChange(c)} />
                    ))}
                    <input
                      type="color" value={fill} onChange={(e) => onFillChange(e.target.value)}
                      style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${C.border}`, cursor: "pointer", background: "transparent", padding: 0 }}
                    />
                  </div>
                </div>

                <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 20, paddingTop: 20 }}>
                  <div style={{ fontSize: 11, letterSpacing: "0.08em", color: C.mutedDim, textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>Outline color</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {STROKE_SWATCHES.map((c) => (
                      <Swatch key={c} color={c} active={stroke === c.toUpperCase()} onClick={() => onStrokeChange(c)} />
                    ))}
                    <input
                      type="color" value={stroke} onChange={(e) => onStrokeChange(e.target.value)}
                      style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${C.border}`, cursor: "pointer", background: "transparent", padding: 0 }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: "auto", paddingTop: 24 }}>
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                    <button style={{ ...secondaryBtn, width: "100%", justifyContent: "center" }} onClick={addTextBlock}>
                      <Plus className="h-4 w-4" /> Add text block
                    </button>
                    <button style={{ ...secondaryBtn, width: "100%", justifyContent: "center" }} onClick={resetStyle}>
                      <RotateCcw className="h-4 w-4" /> Reset to defaults
                    </button>
                  </div>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default SlideshowEditor;
