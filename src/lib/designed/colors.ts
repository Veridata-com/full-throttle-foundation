// Color utilities for brand palette generation.
// Auto-derive secondary, muted accent, and contrast colors from a single primary hex.

export function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToHex({ h, s, l }: { h: number; s: number; l: number }): string {
  const sNorm = Math.max(0, Math.min(100, s)) / 100;
  const lNorm = Math.max(0, Math.min(100, l)) / 100;
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = lNorm - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export interface DerivedPalette {
  secondary_color: string;
  accent_muted: string;
  background_dark: string;
  background_light: string;
  text_on_dark: string;
  text_on_light: string;
}

export function generatePalette(primaryHex: string): DerivedPalette {
  let hsl: { h: number; s: number; l: number };
  try {
    hsl = hexToHSL(primaryHex);
  } catch {
    hsl = { h: 350, s: 100, l: 60 };
  }
  return {
    secondary_color: hslToHex({ h: hsl.h, s: hsl.s * 0.6, l: Math.min(hsl.l + 22, 82) }),
    accent_muted: hslToHex({ h: hsl.h, s: Math.min(hsl.s * 0.45, 40), l: 14 }),
    background_dark: "#0A0A0A",
    background_light: "#FAFAFA",
    text_on_dark: "#FFFFFF",
    text_on_light: "#111111",
  };
}

export function isValidHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex.trim());
}
