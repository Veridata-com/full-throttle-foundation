import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Zap } from "lucide-react";
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

function format(ms: number): string {
  if (ms <= 0) return "00d00h00m00s";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(d).padStart(2, "0")}d${String(h).padStart(2, "0")}h${String(m).padStart(2, "0")}m${String(sec).padStart(2, "0")}s`;
}

export function CountdownBanner() {
  const { user } = useAuth();
  const [end] = useState(getEnd);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const target = user ? "/billing" : "/auth?mode=signup";

  return (
    <Link
      to={target}
      className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary hover:bg-primary/20 hover:shadow-glow transition-all animate-fade-in"
    >
      <Zap className="h-3.5 w-3.5" />
      60% off all plans for <span className="font-mono tabular-nums">{format(end - now)}</span>
    </Link>
  );
}
