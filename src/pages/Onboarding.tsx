import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";

const Onboarding = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);

  const startCheckout = async (plan: "starter" | "pro") => {
    setLoading(plan);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan, origin: window.location.origin },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
      else throw new Error(data?.error || "Could not create checkout");
    } catch (err: any) {
      toast.error(err.message || "Could not start checkout. Please try again.");
      setLoading(null);
    }
  };


  const plans = [
    { id: "starter" as const, name: "Starter", price: "7.60", original: "19.00", renewal: "19", features: ["1 workspace", "50 slideshows / month", "500 image uploads", "All AI features"] },
    { id: "pro" as const, name: "Pro", price: "19.60", original: "49.00", renewal: "49", popular: true, features: ["5 workspaces", "Unlimited slideshows", "Unlimited uploads", "Priority AI", "Priority support"] },
  ];

  return (
    <>
      <SEO title="Choose your plan" description="Pick a plan to start AdRise." />
      <div className="min-h-screen bg-gradient-dark py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 text-white">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-glow mb-6">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-3">Pick your plan</h1>
            <p className="text-white/70 text-lg">🔥 Limited time: 60% off. Cancel anytime.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {plans.map((p) => (
              <Card key={p.id} className={`p-8 relative ${p.popular ? "border-primary border-2 shadow-glow" : "shadow-card"}`}>
                <span className="absolute -top-3 left-6 bg-success text-success-foreground text-xs font-bold px-3 py-1 rounded-full">60% OFF</span>
                {p.popular && <span className="absolute -top-3 right-6 bg-gradient-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">RECOMMENDED</span>}
                <h3 className="font-display text-2xl font-bold">{p.name}</h3>
                <div className="mt-4 mb-1 flex items-baseline gap-2">
                  <span className="text-5xl font-bold font-display">${p.price}</span>
                  <span className="text-muted-foreground line-through">${p.original}</span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
                <p className="text-xs text-muted-foreground mb-6">${p.price} first month, then ${p.renewal}/mo. Cancel anytime.</p>
                <ul className="space-y-2 mb-8 text-sm">
                  {p.features.map((f) => <li key={f} className="flex gap-2 items-center"><Check className="h-4 w-4 text-success" />{f}</li>)}
                </ul>
                <Button className={`w-full ${p.popular ? "shadow-glow" : ""}`} variant={p.popular ? "default" : "outline"} onClick={() => startCheckout(p.id)} disabled={loading !== null}>
                  {loading === p.id && <Loader2 className="h-4 w-4 animate-spin" />}
                  Choose {p.name}
                </Button>
              </Card>
            ))}
          </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Onboarding;
      </div>
    </>
  );
};

export default Onboarding;
