import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";
import { Card as _Card } from "@/components/ui/card";
import { UsageWidgetExpanded } from "@/components/UsageWidget";

const Billing = () => {
  const { profile, refreshProfile } = useAuth();
  const [params, setParams] = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(true);

  useEffect(() => {
    const isSuccess = !!params.get("success");
    if (isSuccess) { toast.success("Payment received — syncing your subscription…"); params.delete("success"); setParams(params, { replace: true }); }
    if (params.get("canceled")) { toast.info("Checkout canceled"); params.delete("canceled"); setParams(params, { replace: true }); }

    let cancelled = false;
    (async () => {
      const maxAttempts = isSuccess ? 10 : 1;
      for (let i = 0; i < maxAttempts; i++) {
        if (cancelled) return;
        try {
          const { data } = await supabase.functions.invoke("check-subscription", { body: {} });
          await refreshProfile();
          if (!isSuccess || (data?.plan && data.plan !== "none")) break;
        } catch {}
        if (i < maxAttempts - 1) await new Promise(r => setTimeout(r, 2000));
      }
      if (!cancelled) setSyncing(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkout = async (plan: "starter" | "pro") => {
    setLoading(plan);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", { body: { plan, origin: window.location.origin } });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
      else throw new Error(data?.error || "Failed");
    } catch (err: any) {
      toast.error(err.message || "Checkout failed");
      setLoading(null);
    }
  };

  const portal = async () => {
    setLoading("portal");
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", { body: { origin: window.location.origin } });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
      else throw new Error(data?.error || "Failed");
    } catch (err: any) {
      toast.error(err.message || "Portal unavailable");
      setLoading(null);
    }
  };

  const plans = [
    { id: "starter" as const, name: "Starter", price: "0.99", original: "19.00", renewal: "19", betaTag: "EARLY BETA · $0.99 first month", features: ["1 workspace", "50 slideshows / month", "500 image uploads", "All AI features"] },
    { id: "pro" as const, name: "Pro", price: "19.60", original: "49.00", renewal: "49", popular: true, betaTag: "60% OFF first month", features: ["5 workspaces", "Unlimited slideshows", "Unlimited uploads", "Priority AI", "Priority support"] },
  ];

  const currentPlan = profile?.plan || "none";

  return (
    <>
      <SEO title="Billing" description="Manage your AdRise subscription." />
      <div className="container py-8 max-w-3xl">
        <h1 className="font-display text-3xl font-bold mb-2">Billing</h1>
        <p className="text-muted-foreground mb-6">
          Current plan: <Badge className="ml-1 capitalize">{currentPlan}</Badge>
          {syncing && <Loader2 className="inline h-3 w-3 animate-spin ml-2" />}
        </p>

        <Card className="p-6 mb-6 shadow-card">
          <UsageWidgetExpanded />
        </Card>

        <div className="mb-6 rounded-lg border-2 border-warning/40 bg-warning/5 p-4 text-center">
          <p className="text-sm font-semibold text-warning">🔥 Limited-time early-beta offer: Starter $0.99 first month · Pro 60% off</p>
        </div>

        {currentPlan !== "none" && (
          <Card className="p-5 mb-6 flex items-center justify-between gap-4 flex-wrap shadow-card">
            <div>
              <p className="font-semibold">Manage your subscription</p>
              <p className="text-sm text-muted-foreground">Update payment method, view invoices, or cancel.</p>
            </div>
            <Button variant="outline" onClick={portal} disabled={loading !== null}>
              {loading === "portal" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              Open customer portal
            </Button>
          </Card>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          {plans.map((p) => (
            <Card key={p.id} className={`p-6 relative ${p.popular ? "border-primary border-2 shadow-glow" : "shadow-card"} ${currentPlan === p.id ? "ring-2 ring-primary" : ""}`}>
              <span className="absolute -top-3 left-4 bg-warning text-warning-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">{p.betaTag}</span>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display text-xl font-bold">{p.name}</h3>
                {currentPlan === p.id && <Badge className="bg-success text-success-foreground">Active</Badge>}
              </div>
              <div className="mt-2 mb-1 flex items-baseline gap-2">
                <span className="text-3xl font-bold font-display">${p.price}</span>
                <span className="text-muted-foreground line-through text-sm">${p.original}</span>
                <span className="text-muted-foreground text-sm">first month</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Then ${p.renewal}/mo. Cancel anytime.</p>
              <ul className="space-y-2 mb-6 text-sm">
                {p.features.map((f) => <li key={f} className="flex gap-2 items-center"><Check className="h-4 w-4 text-success" />{f}</li>)}
              </ul>
              <Button className="w-full" variant={currentPlan === p.id ? "outline" : "default"} disabled={loading !== null || currentPlan === p.id} onClick={() => checkout(p.id)}>
                {loading === p.id && <Loader2 className="h-4 w-4 animate-spin" />}
                {currentPlan === p.id ? "Current plan" : `Choose ${p.name}`}
              </Button>
            </Card>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-6 text-center">Cancel anytime.</p>
      </div>
    </>
  );
};

export default Billing;
