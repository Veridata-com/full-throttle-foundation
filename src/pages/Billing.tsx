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

const Billing = () => {
  const { profile, refreshProfile } = useAuth();
  const [params, setParams] = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await supabase.functions.invoke("check-subscription", { body: {} });
        await refreshProfile();
      } catch {}
      finally { setSyncing(false); }
    })();
    if (params.get("success")) { toast.success("Subscription activated!"); params.delete("success"); setParams(params); }
    if (params.get("canceled")) { toast.info("Checkout canceled"); params.delete("canceled"); setParams(params); }
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
    { id: "starter" as const, name: "Starter", price: 7.60, original: 19, features: ["1 workspace", "50 slideshows / month", "500 image uploads", "All AI features"] },
    { id: "pro" as const, name: "Pro", price: 19.60, original: 49, popular: true, features: ["5 workspaces", "Unlimited slideshows", "Unlimited uploads", "Priority AI", "Priority support"] },
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

        <div className="mb-6 rounded-lg border-2 border-primary/40 bg-primary/5 p-4 text-center">
          <p className="text-sm font-semibold text-primary">🔥 Limited time: 60% off all plans</p>
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
              <span className="absolute -top-3 left-4 bg-success text-success-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">60% OFF</span>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display text-xl font-bold">{p.name}</h3>
                {currentPlan === p.id && <Badge className="bg-success text-success-foreground">Active</Badge>}
              </div>
              <div className="mb-4 flex items-baseline gap-2">
                <span className="text-3xl font-bold font-display">${p.price}</span>
                <span className="text-muted-foreground line-through text-sm">${p.original}</span>
                <span className="text-muted-foreground text-sm">/mo</span>
              </div>
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
