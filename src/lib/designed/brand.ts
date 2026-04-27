export interface BrandIdentity {
  id: string;
  user_id: string;
  brand_name: string;
  brand_tagline: string | null;
  brand_url: string | null;
  primary_color: string;
  secondary_color: string | null;
  background_dark: string;
  background_light: string;
  text_on_dark: string;
  text_on_light: string;
  accent_muted: string | null;
  heading_font: string;
  heading_weight: string;
  body_font: string;
  body_weight: string;
  slide_mood: "dark" | "light" | "mixed";
  corner_radius: "none" | "subtle" | "rounded";
  use_icons: boolean;
  use_dividers: boolean;
  use_numbers: boolean;
  use_brand_watermark: boolean;
  created_at: string;
  updated_at: string;
}

export const FONT_OPTIONS: { name: string; source: "google" | "fontshare"; cssName?: string }[] = [
  { name: "Inter", source: "google" },
  { name: "Syne", source: "google" },
  { name: "Space Grotesk", source: "google" },
  { name: "DM Sans", source: "google" },
  { name: "Outfit", source: "google" },
  { name: "Plus Jakarta Sans", source: "google" },
  { name: "Manrope", source: "google" },
  // Fontshare fonts (loaded via separate <link>):
  { name: "Clash Display", source: "fontshare", cssName: "Clash Display" },
  { name: "Satoshi", source: "fontshare" },
  { name: "General Sans", source: "fontshare" },
  { name: "Cabinet Grotesk", source: "fontshare" },
];

export const WEIGHT_OPTIONS = [
  { value: "400", label: "400 Regular" },
  { value: "500", label: "500 Medium" },
  { value: "600", label: "600 Semibold" },
  { value: "700", label: "700 Bold" },
  { value: "800", label: "800 Extrabold" },
  { value: "900", label: "900 Black" },
];

export const CORNER_RADIUS_PX: Record<string, { card: string; button: string }> = {
  none: { card: "0px", button: "0px" },
  subtle: { card: "8px", button: "10px" },
  rounded: { card: "20px", button: "999px" },
};

export const DEFAULT_BRAND: Omit<BrandIdentity, "id" | "user_id" | "created_at" | "updated_at"> = {
  brand_name: "Your Brand",
  brand_tagline: null,
  brand_url: null,
  primary_color: "#FF3B5C",
  secondary_color: "#FF8FA3",
  background_dark: "#0A0A0A",
  background_light: "#FAFAFA",
  text_on_dark: "#FFFFFF",
  text_on_light: "#111111",
  accent_muted: "#3D1520",
  heading_font: "Inter",
  heading_weight: "800",
  body_font: "Inter",
  body_weight: "400",
  slide_mood: "dark",
  corner_radius: "subtle",
  use_icons: true,
  use_dividers: true,
  use_numbers: true,
  use_brand_watermark: true,
};
