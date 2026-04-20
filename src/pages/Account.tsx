import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, Layers, LogOut } from "lucide-react";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";

const Account = () => {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDisplayName(profile?.display_name || ""); }, [profile]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    await refreshProfile();
    toast.success("Saved");
  };

  return (
    <>
      <SEO title="Account" description="Manage your AdRise account." />
      <div className="container py-8 max-w-2xl">
        <h1 className="font-display text-3xl font-bold mb-6">Account</h1>

        <Card className="p-6 space-y-4 shadow-card mb-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>Display name</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Plan</Label>
            <div className="flex items-center gap-3">
              <Badge className="capitalize">{profile?.plan || "none"}</Badge>
              <Button size="sm" variant="outline" asChild><Link to="/billing"><CreditCard className="h-3.5 w-3.5" /> Manage billing</Link></Button>
            </div>
          </div>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Save</Button>
        </Card>

        <Card className="p-6 shadow-card mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Workspaces</h2>
              <p className="text-sm text-muted-foreground">Product brand settings live inside each workspace.</p>
            </div>
            <Button variant="outline" asChild><Link to="/workspaces/settings"><Layers className="h-4 w-4" /> Manage</Link></Button>
          </div>
        </Card>

        <Card className="p-6 shadow-card border-destructive/30">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Sign out</h2>
              <p className="text-sm text-muted-foreground">End this session.</p>
            </div>
            <Button variant="outline" onClick={signOut}><LogOut className="h-4 w-4" /> Sign out</Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">To permanently delete your account, email <a className="underline" href="mailto:support@adrise.app">support@adrise.app</a>.</p>
        </Card>
      </div>
    </>
  );
};

export default Account;
