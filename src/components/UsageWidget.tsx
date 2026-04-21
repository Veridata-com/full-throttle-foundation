import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PLAN_LIMITS } from "@/hooks/usePlanLimits";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface UsageData {
  images_uploaded: number;
  slideshows_generated: number;
}

function fillColor(pct: number) {
  if (pct >= 0.9) return "bg-destructive";
  if (pct >= 0.7) return "bg-amber-500";
  return "bg-success";
}

function PlanBadge({ plan }: { plan: "none" | "starter" | "pro" }) {
  const isPro = plan === "pro";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold capitalize border",
        isPro
          ? "bg-primary/10 text-primary border-primary/20"
          : "bg-muted text-muted-foreground border-border",
      )}
    >
      {plan === "none" ? "Free" : plan}
    </span>
  );
}

function useUsage() {
  const { user, profile } = useAuth();
  const [usage, setUsage] = useState<UsageData>({ images_uploaded: 0, slideshows_generated: 0 });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    const ps = (() => {
      const d = new Date(); d.setDate(1);
      return d.toISOString().slice(0, 10);
    })();
    let active = true;
    supabase
      .from("usage")
      .select("images_uploaded, slideshows_generated")
      .eq("user_id", user.id)
      .eq("period_start", ps)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setUsage({
          images_uploaded: data?.images_uploaded || 0,
          slideshows_generated: data?.slideshows_generated || 0,
        });
        setLoaded(true);
      });
    return () => { active = false; };
  }, [user]);

  const plan = profile?.plan || "none";
  const limits = PLAN_LIMITS[plan];
  return { usage, plan, limits, loaded };
}

interface RowProps {
  label: string;
  used: number;
  limit: number;
  isPro: boolean;
  size?: "sm" | "lg";
}
function Row({ label, used, limit, isPro, size = "sm" }: RowProps) {
  const pct = isPro ? 1 : Math.min(used / Math.max(limit, 1), 1);
  const barH = size === "lg" ? "h-2" : "h-1";
  return (
    <div className={size === "lg" ? "space-y-2" : "space-y-1"}>
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground/80">
          {isPro ? "Unlimited" : `${used} / ${limit}`}
        </span>
      </div>
      <div className={cn("w-full rounded-full bg-muted overflow-hidden", barH)}>
        <div
          className={cn("h-full rounded-full transition-all", isPro ? "bg-success" : fillColor(pct))}
          style={{ width: `${Math.max(pct * 100, isPro ? 100 : 4)}%` }}
        />
      </div>
    </div>
  );
}

/* ---------------- Compact (sidebar) ---------------- */
export function UsageWidgetCompact() {
  const { user, profile } = useAuth();
  const { usage, plan, limits, loaded } = useUsage();
  if (!user || !profile) return null;
  const isPro = plan === "pro";
  const isStarter = plan === "starter";
  const pastDue = (profile as any)?.plan_status === "past_due";

  return (
    <div className="space-y-2.5 px-2 py-3 border-t border-sidebar-border">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Plan</span>
        <PlanBadge plan={plan} />
      </div>

      {pastDue ? (
        <div className="flex items-center gap-1.5 text-[12px] text-destructive">
          <AlertTriangle className="h-3 w-3" /> Payment issue
        </div>
      ) : loaded ? (
        <>
          <Row label="Images" used={usage.images_uploaded} limit={limits.images === Infinity ? 9999 : limits.images} isPro={isPro} />
          <Row label="Slideshows" used={usage.slideshows_generated} limit={limits.slideshows === Infinity ? 9999 : limits.slideshows} isPro={isPro} />
        </>
      ) : (
        <div className="h-10" />
      )}

      {(isStarter || plan === "none") && (
        <Link
          to="/billing"
          className="block text-[12px] font-semibold text-primary hover:underline pt-1"
        >
          Upgrade →
        </Link>
      )}
    </div>
  );
}

/* ---------------- Expanded (billing) ---------------- */
export function UsageWidgetExpanded() {
  const { profile } = useAuth();
  const { usage, plan, limits, loaded } = useUsage();
  if (!profile) return null;
  const isPro = plan === "pro";
  const pastDue = (profile as any)?.plan_status === "past_due";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Usage this month</h3>
        <PlanBadge plan={plan} />
      </div>

      {pastDue && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
          <AlertTriangle className="h-4 w-4" /> Payment issue — please update your billing.
        </div>
      )}

      {loaded ? (
        <div className="space-y-4">
          <Row label="Images uploaded" used={usage.images_uploaded} limit={limits.images === Infinity ? 9999 : limits.images} isPro={isPro} size="lg" />
          <Row label="Slideshows generated" used={usage.slideshows_generated} limit={limits.slideshows === Infinity ? 9999 : limits.slideshows} isPro={isPro} size="lg" />
        </div>
      ) : (
        <div className="h-16" />
      )}

      <p className="text-[12px] text-muted-foreground">Usage resets on the 1st of each month.</p>
    </div>
  );
}
