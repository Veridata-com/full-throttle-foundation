import { useEffect, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";
import { Logo } from "@/components/Logo";

const ResetPassword = () => {
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase parses recovery token from URL hash automatically and fires PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pwd.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (pwd !== pwd2) { toast.error("Passwords do not match"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated");
    navigate("/dashboard");
  };

  return (
    <>
      <SEO title="Reset password" description="Set a new password for your AdRise account." />
      <div className="min-h-screen flex items-center justify-center bg-gradient-dark p-4">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 justify-center mb-8">
            <Logo className="h-10 w-10 invert" />
            <span className="font-display text-2xl font-bold text-white">AdRise</span>
          </div>
          <Card className="p-8">
            <h1 className="font-display text-2xl font-bold mb-1">Set a new password</h1>
            <p className="text-sm text-muted-foreground mb-6">Pick something strong you'll remember.</p>
            {!ready ? (
              <p className="text-sm text-muted-foreground">Verifying reset link…</p>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label>New password</Label>
                  <Input type="password" required minLength={6} value={pwd} onChange={(e) => setPwd(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Confirm password</Label>
                  <Input type="password" required minLength={6} value={pwd2} onChange={(e) => setPwd2(e.target.value)} />
                </div>
                <Button type="submit" className="w-full shadow-glow" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />} Update password
                </Button>
              </form>
            )}
          </Card>
        </div>
      </div>
    </>
  );
};

export default ResetPassword;
