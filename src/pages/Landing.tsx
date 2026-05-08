import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, LogOut, Megaphone } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { CountdownBanner } from "@/components/CountdownBanner";
import { Logo } from "@/components/Logo";
import { FeedbackDialog } from "@/components/FeedbackDialog";

const STATS = [
  { v: "827K+", l: "Average views per slideshow" },
  { v: "3.2M", l: "Best single slideshow" },
  { v: "3 days", l: "Average time to first customer" },
  { v: "96%", l: "Gross margin per slideshow" },
];

const Landing = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const handleSignOut = async () => { await signOut(); navigate("/"); };

  return (
    <>
      <SEO
        title="AdRise — TikTok slideshows that get you views and leads. One click."
        description="You built something great. AdRise gets it in front of people. One click generates TikTok slideshows that drive views and leads, no marketing skills needed."
        canonical="/"
      />
      <div className="min-h-screen bg-white text-foreground">

        {/* Header */}
        <header className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur-sm">
          <div className="container flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <Logo className="h-8 w-8" />
              <span className="font-display text-xl font-bold">AdRise</span>
            </Link>
            <nav className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                <Link to="/release-notes"><Megaphone className="h-4 w-4 mr-1" />Release notes</Link>
              </Button>
              <FeedbackDialog variant="ghost" size="sm" />
              {user ? (
                <>
                  <Button asChild><Link to="/dashboard">Dashboard</Link></Button>
                  <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" asChild><Link to="/auth">Log in</Link></Button>
                  <Button asChild><Link to="/auth?mode=signup">Get started</Link></Button>
                </>
              )}
            </nav>
          </div>
        </header>

        {/* Hero: pain first */}
        <section className="relative pt-10 pb-24 overflow-hidden bg-white">
          <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[700px] rounded-full bg-gradient-hero opacity-[0.06] blur-3xl" aria-hidden />

          <div className="relative z-10 container">
            <div className="mb-8 flex justify-center"><CountdownBanner /></div>

            <div className="text-center max-w-4xl mx-auto">
              <p className="text-muted-foreground text-base md:text-lg font-medium mb-5 tracking-wide">
                For builders, founders and creators who hate marketing
              </p>
              <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter mb-6 animate-fade-in leading-[1.05]">
                You built something great.<br />
                <span className="text-gradient">Now get it seen.</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground animate-fade-in max-w-2xl mx-auto mb-3">
                AdRise generates TikTok slideshows for your product in one click. No marketing skills. No hours wasted. Just views and leads.
              </p>
              <p className="text-sm text-muted-foreground mb-10">
                It also learns from every post and gets better on its own.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16">
                <Button size="lg" className="text-base h-12 px-8 shadow-glow" asChild>
                  <Link to="/auth?mode=signup">Generate my first slideshow <ArrowRight className="ml-1 h-4 w-4" /></Link>
                </Button>
                <Button size="lg" variant="outline" className="text-base h-12 px-8" asChild>
                  <Link to="#pricing">See pricing</Link>
                </Button>
              </div>

              {/* How simple it is */}
              <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
                {[
                  { n: "1", t: "Upload product photos" },
                  { n: "2", t: "Click generate" },
                  { n: "3", t: "Post and get views" },
                ].map((step) => (
                  <div key={step.n} className="rounded-2xl border border-border/60 bg-white p-5 shadow-card text-center">
                    <div className="font-display text-2xl font-bold text-gradient mb-2">{step.n}</div>
                    <div className="text-sm font-medium text-foreground">{step.t}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Proof: stats */}
        <section className="border-t py-20 bg-white">
          <div className="container max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">What people are actually getting</h2>
              <p className="text-muted-foreground text-sm">Real numbers from real AdRise users.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {STATS.map((s) => (
                <div key={s.l} className="group rounded-2xl border border-border/60 bg-white p-6 text-center shadow-card hover:border-primary/40 hover:-translate-y-1 transition-all duration-300">
                  <div className="font-display text-4xl md:text-5xl font-bold text-gradient mb-2 leading-none">{s.v}</div>
                  <div className="text-sm text-muted-foreground mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Price reveal */}
        <section className="relative bg-foreground text-background overflow-hidden py-24 text-center">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
            <div className="h-[400px] w-[600px] rounded-full bg-gradient-hero opacity-20 blur-3xl" />
          </div>

          <div className="relative z-10 container max-w-3xl">
            <Badge className="mb-6 border border-white/20 text-white/70 bg-white/10" variant="outline">
              Limited-time early beta offer
            </Badge>

            <p className="text-white/50 text-base md:text-lg font-medium mb-3 uppercase tracking-widest">
              Was <span className="line-through text-white/40">$19 / month</span>
            </p>

            <div className="font-display font-bold text-gradient leading-none mb-4" style={{ fontSize: "clamp(5rem, 18vw, 10rem)" }}>
              $0.99
            </div>

            <p className="text-white/60 text-lg mb-2">Your first month. No tricks.</p>
            <p className="text-white/40 text-sm mb-10">Then $19/mo. Cancel any time, no questions asked.</p>

            <Button size="lg" className="text-base h-12 px-10 shadow-glow text-primary-foreground bg-gradient-primary hover:opacity-90" asChild>
              <Link to="/auth?mode=signup">Start for $0.99 <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>

            <p className="mt-6 text-white/30 text-xs">
              You already saw the results. For less than a coffee, there is no reason not to try.
            </p>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="container py-20 border-t">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-3">Pricing</Badge>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">Start for almost nothing</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              First month is $0.99. See results. Then decide if $19 per month is worth it. It will be.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <Card className="p-8 shadow-card relative">
              <span className="absolute -top-3 left-6 bg-warning text-warning-foreground text-xs font-bold px-3 py-1 rounded-full">
                EARLY BETA · 95% OFF
              </span>
              <h3 className="font-display text-2xl font-bold mb-1">Starter</h3>
              <p className="text-muted-foreground mb-6">For solo builders getting started</p>
              <div className="mb-2 flex items-baseline gap-2">
                <span className="text-5xl font-bold font-display">$0.99</span>
                <span className="text-muted-foreground line-through text-lg">$19</span>
                <span className="text-muted-foreground text-sm">first month</span>
              </div>
              <p className="text-xs text-muted-foreground mb-6">Then $19/mo. Cancel any time.</p>
              <ul className="space-y-3 mb-8 text-sm">
                {["1 workspace", "50 slideshows / month", "500 image uploads", "All AI features", "ZIP export"].map((feat) => (
                  <li key={feat} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success shrink-0" />{feat}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/auth?mode=signup">Get Starter for $0.99</Link>
              </Button>
            </Card>

            <Card className="p-8 shadow-glow border-primary border-2 relative">
              <span className="absolute -top-3 right-6 bg-gradient-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                POPULAR · 60% OFF
              </span>
              <h3 className="font-display text-2xl font-bold mb-1">Pro</h3>
              <p className="text-muted-foreground mb-6">For teams shipping content daily</p>
              <div className="mb-2 flex items-baseline gap-2">
                <span className="text-5xl font-bold font-display">$19.60</span>
                <span className="text-muted-foreground line-through text-lg">$49</span>
                <span className="text-muted-foreground text-sm">/mo</span>
              </div>
              <p className="text-xs text-muted-foreground mb-6">First month, then $49/mo.</p>
              <ul className="space-y-3 mb-8 text-sm">
                {["5 workspaces", "Unlimited slideshows", "Unlimited uploads", "Priority AI processing", "ZIP export", "Priority support"].map((feat) => (
                  <li key={feat} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success shrink-0" />{feat}
                  </li>
                ))}
              </ul>
              <Button className="w-full shadow-glow" asChild>
                <Link to="/auth?mode=signup">Get Pro</Link>
              </Button>
            </Card>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            No contracts. No lock-in. Cancel any time from your account settings.
          </p>
        </section>

        {/* Footer */}
        <footer className="border-t py-12">
          <div className="container flex flex-col md:flex-row justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Logo className="h-5 w-5" />
              <p>© {new Date().getFullYear()} AdRise. All rights reserved.</p>
            </div>
            <div className="flex gap-6">
              <Link to="/release-notes" className="hover:text-foreground transition-colors">Release notes</Link>
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Landing;
