import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Image as ImageIcon, Wand2, Check, ArrowRight, LogOut, Megaphone, Sparkles, TrendingUp, Zap, BarChart2 } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { CountdownBanner } from "@/components/CountdownBanner";
import { Logo } from "@/components/Logo";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import featureLibrary from "@/assets/feature-library.png";
import featureEditor from "@/assets/feature-editor.png";

const STATS = [
  { v: "827K+", l: "Average views per slideshow" },
  { v: "3.2M", l: "Best single slideshow" },
  { v: "3 days", l: "Average time to first customer" },
  { v: "96%", l: "Gross margin per slideshow" },
];

const STEPS = [
  {
    n: "01",
    t: "We get to know your brand",
    d: "Drop in product photos and tell us what you sell. AdRise reads your visuals, tone, and angles and builds a brain specific to your brand. Not a generic template.",
  },
  {
    n: "02",
    t: "It writes slideshows like a real creator",
    d: "Hooks that feel human, not like a marketer. Captions native to TikTok. Story-style, problem/solution, POV, listicles — each one testing a different theory about what will hit.",
  },
  {
    n: "03",
    t: "You post. We watch every number.",
    d: "Views, watch time, saves, shares, link clicks. Every slideshow becomes a tiny experiment. AdRise logs what worked at the hook level, the slide level, the visual level.",
  },
  {
    n: "04",
    t: "The algorithm adjusts itself",
    d: "When a hook style outperforms the rest, the next batch leans into it. When a slide order kills retention, it stops using it. You don't read dashboards — the system just gets smarter.",
  },
  {
    n: "05",
    t: "Results compound",
    d: "Week one is decent. Week four is a different planet. By 30 slideshows in, AdRise knows your audience better than most agencies — and it keeps getting sharper while you sleep.",
  },
];

const Landing = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const handleSignOut = async () => { await signOut(); navigate("/"); };

  return (
    <>
      <SEO
        title="AdRise — TikTok slideshows that convert, in one click"
        description="AdRise generates TikTok slideshows for your product, tracks performance, and self-optimizes so your results compound over time."
        canonical="/"
      />
      <div className="min-h-screen bg-white text-foreground">

        {/* ── Header ── */}
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

        {/* ── SECTION 1: Proof / Results Hero ── */}
        <section className="relative pt-10 pb-20 overflow-hidden bg-white">
          {/* Background glow blobs */}
          <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[700px] rounded-full bg-gradient-hero opacity-[0.07] blur-3xl" aria-hidden />

          <div className="relative z-10 container">
            <div className="mb-6 flex justify-center"><CountdownBanner /></div>

            <div className="text-center max-w-4xl mx-auto mb-14">
              <Badge className="mb-5 bg-warning/15 text-warning border border-warning/30" variant="outline">
                <Sparkles className="h-3 w-3 mr-1" />Early beta · Real results, live in the wild
              </Badge>
              <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter mb-5 animate-fade-in leading-tight">
                One click.<br />
                <span className="text-gradient">Insane TikTok results.</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground animate-fade-in max-w-2xl mx-auto">
                AdRise writes, generates, and self-optimizes your TikTok slideshows. These aren't made-up numbers — they're what our users are actually seeing.
              </p>
            </div>

            {/* BIG stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto mb-12">
              {STATS.map((s) => (
                <div key={s.l} className="group rounded-2xl border border-border/60 bg-white p-6 text-center shadow-card hover:border-primary/40 hover:-translate-y-1 transition-all duration-300">
                  <div className="font-display text-4xl md:text-5xl font-bold text-gradient mb-2 leading-none">{s.v}</div>
                  <div className="text-sm text-muted-foreground mt-1">{s.l}</div>
                </div>
              ))}
            </div>

            {/* Loom demo video — proof they can watch */}
            <div className="relative max-w-4xl mx-auto rounded-2xl overflow-hidden border border-border/60 shadow-glow bg-card mb-10">
              <div className="relative" style={{ paddingBottom: "56.25%", height: 0 }}>
                <iframe
                  src="https://www.loom.com/embed/3ff4dc9d2cb040a9a184e4eef18f60f0"
                  title="AdRise demo — see the results live"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-in">
              <Button size="lg" className="text-base h-12 px-8 shadow-glow" asChild>
                <Link to="/auth?mode=signup">Start creating <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base h-12 px-8" asChild>
                <Link to="#pricing">See pricing</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ── SECTION 2: Price reveal — dark, high-contrast ── */}
        <section className="relative bg-foreground text-background overflow-hidden py-24 text-center">
          {/* Subtle gradient glow behind the price */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
            <div className="h-[400px] w-[600px] rounded-full bg-gradient-hero opacity-20 blur-3xl" />
          </div>

          <div className="relative z-10 container max-w-3xl">
            <Badge className="mb-6 border border-white/20 text-white/70 bg-white/10" variant="outline">
              Limited-time early beta offer
            </Badge>

            <p className="text-white/50 text-lg md:text-xl font-medium mb-3 tracking-wide uppercase">
              Was <span className="line-through text-white/40">$19 / month</span>
            </p>

            <div className="font-display font-bold text-gradient leading-none mb-4" style={{ fontSize: "clamp(5rem, 18vw, 10rem)" }}>
              $0.99
            </div>

            <p className="text-white/60 text-lg mb-2">Your first month. No tricks, no hidden fees.</p>
            <p className="text-white/40 text-sm mb-10">Then $19/mo — cancel any time, no questions asked.</p>

            <Button size="lg" className="text-base h-12 px-10 shadow-glow text-primary-foreground bg-gradient-primary hover:opacity-90" asChild>
              <Link to="/auth?mode=signup">Get started for $0.99 <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>

            <p className="mt-6 text-white/30 text-xs">
              You're seeing real results. You know it works. For less than a cup of coffee, there's no reason not to try.
            </p>
          </div>
        </section>

        {/* ── SECTION 3: How it works ── */}
        <section className="container py-20 border-t">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <Badge variant="outline" className="mb-3">How it works</Badge>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">
              It's like hiring a creative team that never sleeps
            </h2>
            <p className="text-muted-foreground">
              Here's exactly what happens after you upload your first product photos.
            </p>
          </div>

          <ol className="relative max-w-3xl mx-auto space-y-4">
            {STEPS.map((step) => (
              <li key={step.n} className="relative rounded-2xl border border-border/60 bg-white p-6 md:p-8 shadow-card">
                <div className="flex items-start gap-5">
                  <div className="font-display text-3xl md:text-4xl font-bold text-gradient shrink-0 w-14 leading-none pt-1">{step.n}</div>
                  <div>
                    <h3 className="font-display text-xl md:text-2xl font-bold mb-2">{step.t}</h3>
                    <p className="text-muted-foreground leading-relaxed">{step.d}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>

          <div className="text-center mt-12">
            <Button size="lg" className="text-base h-12 px-8 shadow-glow" asChild>
              <Link to="/auth?mode=signup">Let AdRise start learning your brand <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </section>

        {/* ── SECTION 4: Features ── */}
        <section className="container py-16 border-t">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-3">Features</Badge>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">Everything you need to go viral</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Every slideshow you post is a datapoint that helps AdRise find your highest-converting format.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-10">
            {[
              {
                icon: ImageIcon,
                title: "Smart image library",
                desc: "Upload once. AI auto-tags and sorts every image so you can find it fast and reuse it across slideshows.",
                img: featureLibrary,
                alt: "AdRise image library with auto-tagged folders",
              },
              {
                icon: Wand2,
                title: "AI writes the script",
                desc: "Hooks, value props, and CTAs tuned for TikTok-native, human voice. Sounds like a creator, not a brand.",
                img: featureEditor,
                alt: "AdRise slideshow editor with AI-generated TikTok hook",
              },
            ].map((f, i) => (
              <div key={f.title} className="group relative">
                <div className="absolute -inset-1 rounded-3xl bg-gradient-primary opacity-0 group-hover:opacity-30 blur-2xl transition-opacity duration-500" aria-hidden />
                <div className="relative h-full rounded-3xl border border-border/60 bg-card/60 backdrop-blur-xl p-7 shadow-card overflow-hidden flex flex-col transition-all duration-500 hover:-translate-y-1 hover:border-primary/40">
                  <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-gradient-primary opacity-20 blur-3xl" aria-hidden />
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow mb-5">
                    <f.icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <h3 className="relative font-display text-xl font-bold mb-2">{f.title}</h3>
                  <p className="relative text-muted-foreground mb-6">{f.desc}</p>
                  <div className="relative mt-auto">
                    <div className="absolute inset-x-4 -bottom-2 h-12 bg-primary/30 blur-2xl rounded-full" aria-hidden />
                    <div
                      className="relative rounded-xl overflow-hidden border border-border/80 bg-background shadow-2xl transition-transform duration-500 group-hover:-translate-y-2"
                      style={{ transform: `rotate(${i % 2 === 0 ? -1.5 : 1.5}deg)` }}
                    >
                      <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/60 border-b border-border/60">
                        <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
                        <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
                        <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
                      </div>
                      <div className="bg-background">
                        <img src={f.img} alt={f.alt} loading="lazy" className="w-full h-auto block" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Third feature: self-learning */}
          <div className="group relative max-w-full">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-primary opacity-0 group-hover:opacity-20 blur-2xl transition-opacity duration-500" aria-hidden />
            <div className="relative rounded-3xl border border-border/60 bg-card/60 backdrop-blur-xl p-8 shadow-card overflow-hidden transition-all duration-500 hover:border-primary/40">
              <div className="pointer-events-none absolute -top-24 right-1/3 h-56 w-56 rounded-full bg-gradient-primary opacity-10 blur-3xl" aria-hidden />
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
                  <BarChart2 className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-xl font-bold mb-2">Self-learning performance engine</h3>
                  <p className="text-muted-foreground">
                    AdRise tracks every post you publish — views, watch time, saves, shares. It finds patterns in what performs, then bakes those patterns into every new slideshow it generates. You post. It learns. Results compound automatically.
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <Button variant="outline" asChild>
                    <Link to="/auth?mode=signup">Try it free <ArrowRight className="ml-1 h-4 w-4" /></Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 5: Pricing (repeated) ── */}
        <section id="pricing" className="container py-20 border-t">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-3">Pricing</Badge>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">Start for the price of nothing</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              First month is $0.99. See results. Then decide if it's worth $19/month — it will be.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Starter */}
            <Card className="p-8 shadow-card relative">
              <span className="absolute -top-3 left-6 bg-warning text-warning-foreground text-xs font-bold px-3 py-1 rounded-full">
                EARLY BETA · 95% OFF
              </span>
              <h3 className="font-display text-2xl font-bold mb-1">Starter</h3>
              <p className="text-muted-foreground mb-6">For solo creators getting started</p>
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

            {/* Pro */}
            <Card className="p-8 shadow-glow border-primary border-2 relative">
              <span className="absolute -top-3 right-6 bg-gradient-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                POPULAR · 60% OFF
              </span>
              <h3 className="font-display text-2xl font-bold mb-1">Pro</h3>
              <p className="text-muted-foreground mb-6">For teams shipping ads daily</p>
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

        {/* ── Footer ── */}
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
