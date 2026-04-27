import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Palette, Type, Sparkles, Layers } from "lucide-react";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";
import { generatePalette, isValidHex } from "@/lib/designed/colors";
import { DEFAULT_BRAND, FONT_OPTIONS, WEIGHT_OPTIONS, type BrandIdentity } from "@/lib/designed/brand";
import { ensureFontLoaded } from "@/lib/designed/renderer";
import { DesignedSlidePreview } from "@/components/designed/DesignedSlidePreview";

type EditableBrand = Omit<BrandIdentity, "id" | "user_id" | "created_at" | "updated_at"> & {
  id?: string;
};

const Brand = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [brand, setBrand] = useState<EditableBrand>({ ...DEFAULT_BRAND });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("brand_identity").select("*").eq("user_id", user.id).maybeSingle();
      if (data) setBrand(data as any);
      setLoading(false);
    })();
  }, [user]);

  const updatePrimary = (hex: string) => {
    if (!isValidHex(hex)) {
      setBrand((b) => ({ ...b, primary_color: hex }));
      return;
    }
    const palette = generatePalette(hex);
    setBrand((b) => ({
      ...b,
      primary_color: hex,
      secondary_color: palette.secondary_color,
      accent_muted: palette.accent_muted,
    }));
  };

  useEffect(() => {
    ensureFontLoaded(brand.heading_font, [brand.heading_weight, "400", "600", "800"]);
    if (brand.body_font !== brand.heading_font) ensureFontLoaded(brand.body_font, [brand.body_weight, "400", "600"]);
  }, [brand.heading_font, brand.body_font, brand.heading_weight, brand.body_weight]);

  const save = async () => {
    if (!user) return;
    if (!brand.brand_name.trim()) {
      toast.error("Brand name is required");
      return;
    }
    if (!isValidHex(brand.primary_color)) {
      toast.error("Primary color must be a hex like #FF3B5C");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        ...brand,
        user_id: user.id,
        brand_name: brand.brand_name.trim(),
      };
      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;
      const { error } = await supabase
        .from("brand_identity")
        .upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
      toast.success("Brand identity saved");
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const previewBrand: BrandIdentity = useMemo(
    () => ({
      ...(brand as any),
      id: brand.id || "preview",
      user_id: user?.id || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
    [brand, user]
  );

  if (loading) {
    return (
      <div className="container py-16 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <SEO title="Brand Identity" description="Set up your visual style for designed slides." />
      <div className="container py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-2 gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-2">
              <Palette className="h-7 w-7" /> Your Brand Identity
            </h1>
            <p className="text-muted-foreground mt-1">
              Set up your visual style. Every designed slideshow you generate will match this identity.
            </p>
          </div>
          <Button onClick={save} disabled={saving} size="lg" className="shadow-glow">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save brand identity
          </Button>
        </div>

        <div className="grid lg:grid-cols-[1fr_440px] gap-6 mt-6">
          <div className="space-y-6">
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">STEP 1</span>
                <h2 className="font-display text-xl font-bold">Brand basics</h2>
              </div>
              <div className="space-y-2">
                <Label>Brand name</Label>
                <Input
                  value={brand.brand_name}
                  onChange={(e) => setBrand({ ...brand, brand_name: e.target.value })}
                  placeholder="ShipFast"
                />
              </div>
              <div className="space-y-2">
                <Label>Website URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  value={brand.brand_url || ""}
                  onChange={(e) => setBrand({ ...brand, brand_url: e.target.value })}
                  placeholder="shipfast.app"
                />
              </div>
              <div className="space-y-2">
                <Label>Tagline <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  value={brand.brand_tagline || ""}
                  onChange={(e) => setBrand({ ...brand, brand_tagline: e.target.value })}
                  placeholder="Ship your SaaS in days, not months"
                />
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">STEP 2</span>
                <h2 className="font-display text-xl font-bold flex items-center gap-2">
                  <Palette className="h-5 w-5" /> Brand color
                </h2>
              </div>
              <div className="space-y-2">
                <Label>Primary brand color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={isValidHex(brand.primary_color) ? brand.primary_color : "#FF3B5C"}
                    onChange={(e) => updatePrimary(e.target.value.toUpperCase())}
                    className="h-12 w-16 rounded-md border border-border cursor-pointer bg-transparent"
                  />
                  <Input
                    value={brand.primary_color}
                    onChange={(e) => updatePrimary(e.target.value.toUpperCase())}
                    className="font-mono w-36"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 pt-2">
                <Swatch label="Primary" color={brand.primary_color} onChange={updatePrimary} />
                <Swatch label="Secondary" color={brand.secondary_color || "#000"} onChange={(c) => setBrand({ ...brand, secondary_color: c })} />
                <Swatch label="Muted" color={brand.accent_muted || "#000"} onChange={(c) => setBrand({ ...brand, accent_muted: c })} />
                <Swatch label="Dark BG" color={brand.background_dark} onChange={(c) => setBrand({ ...brand, background_dark: c })} />
                <Swatch label="Light BG" color={brand.background_light} onChange={(c) => setBrand({ ...brand, background_light: c })} />
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">STEP 3</span>
                <h2 className="font-display text-xl font-bold flex items-center gap-2">
                  <Type className="h-5 w-5" /> Typography
                </h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Heading font</Label>
                  <Select value={brand.heading_font} onValueChange={(v) => setBrand({ ...brand, heading_font: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FONT_OPTIONS.map((f) => (<SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Heading weight</Label>
                  <Select value={brand.heading_weight} onValueChange={(v) => setBrand({ ...brand, heading_weight: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{WEIGHT_OPTIONS.map((w) => (<SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Body font</Label>
                  <Select value={brand.body_font} onValueChange={(v) => setBrand({ ...brand, body_font: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FONT_OPTIONS.map((f) => (<SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Body weight</Label>
                  <Select value={brand.body_weight} onValueChange={(v) => setBrand({ ...brand, body_weight: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{WEIGHT_OPTIONS.map((w) => (<SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>

              <div
                className="rounded-lg p-5 mt-2"
                style={{ background: brand.slide_mood === "light" ? brand.background_light : brand.background_dark, color: brand.slide_mood === "light" ? brand.text_on_light : brand.text_on_dark }}
              >
                <div style={{ fontFamily: `'${brand.heading_font}', sans-serif`, fontWeight: brand.heading_weight, fontSize: 32, lineHeight: 1.1 }}>
                  Heading sample
                </div>
                <div style={{ fontFamily: `'${brand.body_font}', sans-serif`, fontWeight: brand.body_weight, fontSize: 16, marginTop: 8, opacity: 0.6 }}>
                  Body text in your brand voice with the chosen body font.
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <div className="w-5 h-5 rounded" style={{ background: brand.primary_color }} />
                  <span style={{ fontFamily: `'${brand.body_font}', sans-serif`, fontWeight: 600, fontSize: 14 }}>Brand color</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">STEP 4</span>
                <h2 className="font-display text-xl font-bold flex items-center gap-2">
                  <Layers className="h-5 w-5" /> Style preferences
                </h2>
              </div>

              <div className="space-y-2">
                <Label>Slide mood</Label>
                <div className="flex gap-2">
                  {(["dark", "light", "mixed"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setBrand({ ...brand, slide_mood: m })}
                      className={`flex-1 py-2 rounded-md border-2 text-sm font-medium capitalize transition ${brand.slide_mood === m ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground"}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Corner style</Label>
                <div className="flex gap-2">
                  {(["none", "subtle", "rounded"] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setBrand({ ...brand, corner_radius: c })}
                      className={`flex-1 py-2 rounded-md border-2 text-sm font-medium capitalize transition ${brand.corner_radius === c ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground"}`}
                    >
                      {c === "none" ? "Sharp" : c === "subtle" ? "Subtle" : "Rounded"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <Label>Design elements</Label>
                <ToggleRow label="Icons / pictograms" value={brand.use_icons} onChange={(v) => setBrand({ ...brand, use_icons: v })} />
                <ToggleRow label="Line dividers" value={brand.use_dividers} onChange={(v) => setBrand({ ...brand, use_dividers: v })} />
                <ToggleRow label="Slide numbers" value={brand.use_numbers} onChange={(v) => setBrand({ ...brand, use_numbers: v })} />
                <ToggleRow label="Brand watermark (small name in corner)" value={brand.use_brand_watermark} onChange={(v) => setBrand({ ...brand, use_brand_watermark: v })} />
              </div>
            </Card>
          </div>

          <div className="lg:sticky lg:top-6 lg:self-start space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
              <Sparkles className="h-4 w-4" /> LIVE PREVIEW
            </div>
            <div className="space-y-3">
              <DesignedSlidePreview
                brand={previewBrand}
                spec={{
                  template: "title_card",
                  variables: {
                    label: "THE HARD TRUTH",
                    heading: brand.brand_tagline || "your saas isn't failing because of the product.",
                    subtext: "it's failing because nobody sees it.",
                  },
                }}
                height={420}
              />
              <DesignedSlidePreview
                brand={previewBrand}
                spec={{
                  template: "big_number",
                  variables: { number: "73%", unit: "OF FOUNDERS", context: "never post a single piece of content about their product." },
                }}
                height={420}
              />
              <DesignedSlidePreview
                brand={previewBrand}
                spec={{
                  template: "cta_card",
                  icon: "rocket",
                  variables: {
                    cta_heading: "stop building. start posting.",
                    cta_text: "Try it free",
                    brand_url: brand.brand_url || "yourbrand.com",
                  },
                }}
                height={420}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

function Swatch({ label, color, onChange }: { label: string; color: string; onChange: (hex: string) => void }) {
  return (
    <label className="flex flex-col items-center gap-1 cursor-pointer">
      <input
        type="color"
        value={isValidHex(color) ? color : "#000000"}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="h-10 w-16 rounded-md border border-border cursor-pointer bg-transparent"
      />
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-[10px] font-mono text-muted-foreground">{color}</span>
    </label>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

export default Brand;
