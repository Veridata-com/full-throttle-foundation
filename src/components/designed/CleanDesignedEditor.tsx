// Editor for clean_designed slideshows. Renders templates live via DesignedSlidePreview,
// lets the user edit each template's variables (text fields), and on save re-renders the
// PNG with html2canvas, re-uploads, and writes a new signed URL into slides[i].image_url.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Save, Download, Loader2, Image as ImageIcon, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";
import { DesignedSlidePreview } from "@/components/designed/DesignedSlidePreview";
import { renderAndUploadSlide, renderSlideToPng, resolveSlideHtml, type SlideSpec } from "@/lib/designed/renderer";
import { TEMPLATES } from "@/lib/designed/templates";
import type { BrandIdentity } from "@/lib/designed/brand";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface CleanSlide {
  id: string;
  type: "hook" | "value" | "cta";
  template: string;
  icon: string | null;
  mood_override: "dark" | "light" | null;
  variables: Record<string, any>;
  image_url: string | null;
  storage_path?: string | null;
  is_clean_designed?: boolean;
}

const C = {
  bg: "#0A0A0A", panel: "#111111", border: "#2A2A2A",
  itemActive: "#1A1A1A", panelHover: "#161616",
  accent: "#FF3B5C", muted: "#A0A0A0", mutedDim: "#505050",
  text: "#FFFFFF", ok: "#22C55E",
};

interface Props {
  slideshow: any;
  brand: BrandIdentity;
  onBack: () => void;
  refresh: () => void;
}

export function CleanDesignedEditor({ slideshow, brand, onBack, refresh }: Props) {
  const navigate = useNavigate();
  const [slides, setSlides] = useState<CleanSlide[]>(slideshow.slides || []);
  const [activeIdx, setActiveIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [title, setTitle] = useState(slideshow.title || "Untitled");
  const [titleEditing, setTitleEditing] = useState(false);
  const [dirty, setDirty] = useState<Set<number>>(new Set());

  const active = slides[activeIdx];
  const tpl = active ? TEMPLATES[active.template as keyof typeof TEMPLATES] : null;

  const spec: SlideSpec | null = active ? {
    template: active.template as any,
    icon: active.icon,
    mood_override: active.mood_override,
    variables: active.variables || {},
  } : null;

  const updateVariable = (key: string, value: any) => {
    setSlides((prev) => {
      const next = [...prev];
      next[activeIdx] = { ...next[activeIdx], variables: { ...next[activeIdx].variables, [key]: value } };
      return next;
    });
    setDirty((d) => new Set(d).add(activeIdx));
  };

  const updateListItem = (key: string, idx: number, field: string, value: any) => {
    setSlides((prev) => {
      const next = [...prev];
      const list = Array.isArray(next[activeIdx].variables[key]) ? [...next[activeIdx].variables[key]] : [];
      list[idx] = { ...list[idx], [field]: value };
      next[activeIdx] = { ...next[activeIdx], variables: { ...next[activeIdx].variables, [key]: list } };
      return next;
    });
    setDirty((d) => new Set(d).add(activeIdx));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const next = [...slides];
      const toRender = Array.from(dirty);
      for (const i of toRender) {
        const s = next[i];
        const path = `${slideshow.user_id}/clean/${slideshow.id}/${i}-${Date.now()}.png`;
        const { url, storage_path } = await renderAndUploadSlide(
          { template: s.template as any, icon: s.icon, mood_override: s.mood_override, variables: s.variables },
          brand,
          path
        );
        next[i] = { ...s, image_url: url, storage_path };
      }
      setSlides(next);
      const { error } = await supabase.from("slideshows").update({ slides: next as any, title }).eq("id", slideshow.id);
      if (error) throw error;
      setDirty(new Set());
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const exportZip = async () => {
    setExporting(true);
    try {
      const zip = new JSZip();
      for (let i = 0; i < slides.length; i++) {
        const s = slides[i];
        const html = resolveSlideHtml({
          brand,
          spec: { template: s.template as any, icon: s.icon, mood_override: s.mood_override, variables: s.variables },
        });
        const blob = await renderSlideToPng(html, brand);
        const buf = await blob.arrayBuffer();
        zip.file(`slide-${String(i + 1).padStart(2, "0")}.png`, buf);
      }
      const out = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(out);
      a.download = `${(title || "slideshow").replace(/[^a-z0-9]+/gi, "-")}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success("Exported");
    } catch (e: any) {
      toast.error(e.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const downloadCurrentPng = async () => {
    if (!spec) return;
    setExporting(true);
    try {
      const html = resolveSlideHtml({ brand, spec });
      const blob = await renderSlideToPng(html, brand);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `slide-${activeIdx + 1}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      toast.success("Downloaded");
    } catch (e: any) {
      toast.error(e.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  if (!active || !tpl) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: C.bg, color: C.text }}>
        <div className="text-center">
          <p className="mb-4">No slides yet.</p>
          <Button onClick={onBack} variant="outline">Back</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO title={title} />
      <div className="flex flex-col" style={{ background: C.bg, color: C.text, height: "calc(100dvh - 3.5rem)", overflow: "hidden" }}>
        {/* Top bar */}
        <header className="flex items-center justify-between flex-shrink-0" style={{ height: 56, padding: "0 16px", background: C.panel, borderBottom: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={onBack} style={{ color: C.muted, background: "transparent", border: "none", padding: 8, borderRadius: 6 }}>
              <ArrowLeft className="h-5 w-5" />
            </button>
            {titleEditing ? (
              <input
                autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
                onBlur={() => setTitleEditing(false)}
                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                style={{ background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 10px", fontSize: 15, fontWeight: 600, outline: "none", minWidth: 240 }}
              />
            ) : (
              <button onClick={() => setTitleEditing(true)} style={{ color: C.text, fontSize: 15, fontWeight: 600, background: "transparent", border: "none", padding: "4px 10px" }}>{title}</button>
            )}
            <span className="text-xs" style={{ color: C.mutedDim }}>· clean designed</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate("/brand")}>
              Brand
            </Button>
            <Button size="sm" variant="outline" onClick={downloadCurrentPng} disabled={exporting}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />} PNG
            </Button>
            <Button size="sm" onClick={saveAll} disabled={saving || dirty.size === 0}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save{dirty.size > 0 ? ` (${dirty.size})` : ""}
            </Button>
            <Button size="sm" onClick={exportZip} disabled={exporting} className="shadow-glow">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export ZIP
            </Button>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 flex min-h-0">
          {/* Slide list */}
          <aside className="flex-shrink-0 overflow-y-auto" style={{ width: 220, background: C.panel, borderRight: `1px solid ${C.border}` }}>
            <div style={{ padding: "16px 16px 8px", fontSize: 11, letterSpacing: "0.08em", color: C.mutedDim, textTransform: "uppercase", fontWeight: 600 }}>Slides</div>
            <div>
              {slides.map((s, i) => {
                const isActive = i === activeIdx;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveIdx(i)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      width: "calc(100% - 16px)", margin: "2px 8px",
                      padding: "10px 12px", borderRadius: 8,
                      background: isActive ? C.itemActive : "transparent",
                      border: "none", cursor: "pointer", textAlign: "left",
                    }}
                  >
                    <span style={{
                      width: 24, height: 24, borderRadius: 6,
                      background: isActive ? C.accent : "#1A1A1A",
                      color: isActive ? "#fff" : C.muted,
                      fontSize: 12, fontWeight: 600,
                      display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>{i + 1}</span>
                    <span style={{ color: C.text, fontSize: 13, flex: 1, textTransform: "capitalize" }}>{s.template.replace(/_/g, " ")}</span>
                    {dirty.has(i) && <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent }} />}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Preview */}
          <main className="flex-1 min-w-0 flex flex-col items-center justify-center" style={{ background: C.bg, padding: 24, overflow: "auto" }}>
            <DesignedSlidePreview brand={brand} spec={spec!} height={Math.min(720, window.innerHeight - 200)} />
            <div className="text-xs mt-3" style={{ color: C.mutedDim }}>
              Edit text in the right panel — preview updates live
            </div>
          </main>

          {/* Variable editor */}
          <aside className="flex-shrink-0 overflow-y-auto" style={{ width: 340, background: C.panel, borderLeft: `1px solid ${C.border}`, padding: 20 }}>
            <div className="space-y-1 mb-4">
              <div style={{ fontSize: 11, letterSpacing: "0.08em", color: C.mutedDim, textTransform: "uppercase", fontWeight: 600 }}>Template</div>
              <div className="text-sm font-semibold capitalize">{tpl.layout_type.replace(/_/g, " ")}</div>
            </div>

            <div className="space-y-4">
              {tpl.variables.map((v) => {
                const value = active.variables?.[v.key];
                if (v.type === "list") {
                  const list: any[] = Array.isArray(value) ? value : [];
                  return (
                    <div key={v.key} className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider" style={{ color: C.mutedDim }}>{v.label}</Label>
                      {list.map((item, idx) => (
                        <div key={idx} className="rounded-md border p-2 space-y-2" style={{ background: C.itemActive, borderColor: C.border }}>
                          <Input
                            value={item.item_title || ""}
                            placeholder="Title"
                            onChange={(e) => updateListItem(v.key, idx, "item_title", e.target.value)}
                            style={{ background: C.bg, color: C.text, borderColor: C.border }}
                          />
                          <Textarea
                            value={item.item_description || ""}
                            placeholder="Description"
                            rows={2}
                            onChange={(e) => updateListItem(v.key, idx, "item_description", e.target.value)}
                            style={{ background: C.bg, color: C.text, borderColor: C.border }}
                          />
                        </div>
                      ))}
                    </div>
                  );
                }
                return (
                  <div key={v.key} className="space-y-1">
                    <Label className="text-xs uppercase tracking-wider" style={{ color: C.mutedDim }}>{v.label}</Label>
                    {v.multiline ? (
                      <Textarea
                        value={value ?? ""}
                        rows={3}
                        onChange={(e) => updateVariable(v.key, e.target.value)}
                        style={{ background: C.itemActive, color: C.text, borderColor: C.border }}
                      />
                    ) : (
                      <Input
                        type={v.type === "number" ? "number" : "text"}
                        value={value ?? ""}
                        onChange={(e) => updateVariable(v.key, v.type === "number" ? Number(e.target.value) : e.target.value)}
                        style={{ background: C.itemActive, color: C.text, borderColor: C.border }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t" style={{ borderColor: C.border }}>
              <p className="text-xs" style={{ color: C.mutedDim }}>
                Brand colors and fonts are pulled from your <a href="/brand" className="underline" style={{ color: C.accent }}>brand identity</a>.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
