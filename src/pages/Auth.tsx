import { useState, FormEvent, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";
import { Logo } from "@/components/Logo";

type Mode = "login" | "signup" | "forgot";

const Auth = () => {
  const [params] = useSearchParams();
  const initial: Mode = params.get("mode") === "signup" ? "signup" : params.get("mode") === "forgot" ? "forgot" : "login";
  const [mode, setMode] = useState<Mode>(initial);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupSent, setSignupSent] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user && mode !== "forgot") navigate("/dashboard", { replace: true });
  }, [user, navigate, mode]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/onboarding` },
        });
        if (error) throw error;
        // If email confirmation is required, session will be null
        if (!data.session) {
          setSignupSent(true);
          toast.success("Check your email to verify your account.");
        } else {
          toast.success("Account created!");
          navigate("/onboarding");
        }
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Reset link sent. Check your inbox.");
        setMode("login");
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO title={mode === "signup" ? "Sign up" : mode === "forgot" ? "Reset password" : "Log in"} description="Sign in to AdRise." />
      <div className="min-h-screen flex items-center justify-center bg-gradient-dark p-4">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 justify-center mb-8">
            <Logo className="h-10 w-10 invert" />
            <span className="font-display text-2xl font-bold text-white">AdRise</span>
          </Link>
          <Card className="p-8">
            <h1 className="font-display text-2xl font-bold mb-1">
              {mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Welcome back"}
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              {mode === "signup" ? "Start generating slideshows in seconds." : mode === "forgot" ? "We'll email you a reset link." : "Log in to your AdRise account."}
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@brand.com" />
              </div>
              {mode !== "forgot" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {mode === "login" && (
                      <button type="button" className="text-xs text-primary hover:underline" onClick={() => setMode("forgot")}>
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
                </div>
              )}
              <Button type="submit" className="w-full shadow-glow" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Log in"}
              </Button>
            </form>
            <p className="text-sm text-center mt-6 text-muted-foreground">
              {mode === "forgot" ? (
                <button type="button" className="text-primary font-medium hover:underline" onClick={() => setMode("login")}>
                  Back to log in
                </button>
              ) : (
                <>
                  {mode === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
                  <button type="button" className="text-primary font-medium hover:underline" onClick={() => setMode(mode === "signup" ? "login" : "signup")}>
                    {mode === "signup" ? "Log in" : "Sign up"}
                  </button>
                </>
              )}
            </p>
          </Card>
          <p className="text-xs text-center mt-6 text-white/60">
            By continuing you agree to our <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </>
  );
};

export default Auth;
