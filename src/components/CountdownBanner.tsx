import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const KEY = "adrise:discount_end";

function getEnd(): number {
  const existing = localStorage.getItem(KEY);
  if (existing) {
    const n = parseInt(existing, 10);
    if (!isNaN(n) && n > Date.now()) return n;
  }
  const end = Date.now() + 7 * 24 * 60 * 60 * 1000;
  localStorage.setItem(KEY, String(end));
  return end;
}

function getUnits(ms: number) {
  if (ms <= 0) return { d: "00", h: "00", m: "00", s: "00" };
  const total = Math.floor(ms / 1000);
  return {
    d: String(Math.floor(total / 86400)).padStart(2, "0"),
    h: String(Math.floor((total % 86400) / 3600)).padStart(2, "0"),
    m: String(Math.floor((total % 3600) / 60)).padStart(2, "0"),
    s: String(total % 60).padStart(2, "0"),
  };
}

const BEBAS = "'Bebas Neue', 'Arial Black', sans-serif";

export function CountdownBanner() {
  const { user } = useAuth();
  const [end] = useState(getEnd);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const { d, h, m, s } = getUnits(end - now);
  const target = user ? "/billing" : "/auth?mode=signup";

  return (
    <Link to={target} style={{ display: "inline-flex", alignItems: "center", gap: 14, textDecoration: "none" }}>
      <span style={{
        color: "rgba(255,255,255,0.38)",
        fontSize: "0.65rem",
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        95% off ends in
      </span>
      <div style={{ display: "flex", gap: 5 }}>
        {[{ v: d, l: "D" }, { v: h, l: "H" }, { v: m, l: "M" }, { v: s, l: "S" }].map(({ v, l }) => (
          <div key={l} style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: 7,
            padding: "5px 9px",
            textAlign: "center",
            minWidth: 38,
          }}>
            <div style={{
              fontFamily: BEBAS,
              fontSize: "1.35rem",
              color: "#ff3355",
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
            }}>
              {v}
            </div>
            <div style={{
              fontSize: "0.48rem",
              color: "rgba(255,255,255,0.28)",
              letterSpacing: "0.14em",
              marginTop: 2,
              fontFamily: "'DM Sans', sans-serif",
            }}>
              {l}
            </div>
          </div>
        ))}
      </div>
    </Link>
  );
}
