import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";

const Account = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [brandVoice, setBrandVoice] = useState(profile?.brand_voice || "");
  const [audience, setAudience] = useState(profile?.target_audience || "");
  const [cta, setCta] = useState(profile?.default_cta || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: displayName, brand_voice: brandVoice, target_audience: audience, default_cta: cta,
    }).eq("id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    await refreshProfile();
    toast.success("Profile saved");
  };

  return (
    <>
      <SEO title="Account" description="Manage your AdRise account and brand defaults." />
      <div className="container py-8 max-w-2xl">
        <h1 className="font-display text-3xl font-bold mb-2">Account</h1>
        <p className="text-muted-foreground mb-6">Brand defaults are auto-applied to new slideshows.</p>
        <Card className="p-6 space-y-4 shadow-card">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>Display name</Label>
            <Input value={displayName} onChange={e => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Brand voice</Label>
            <Textarea value={brandVoice} onChange={e => setBrandVoice(e.target.value)} rows={3} placeholder="e.g. Direct, playful, Gen Z slang. No corporate." />
          </div>
          <div className="space-y-2">
            <Label>Default audience</Label>
            <Textarea value={audience} onChange={e => setAudience(e.target.value)} rows={2} placeholder="e.g. 18-25 skincare buyers" />
          </div>
          <div className="space-y-2">
            <Label>Default CTA</Label>
            <Input value={cta} onChange={e => setCta(e.target.value)} placeholder="Shop now" />
          </div>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Save changes</Button>
        </Card>
      </div>
    </>
  );
};

export default Account;
