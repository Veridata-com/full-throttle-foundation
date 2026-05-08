import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, ArrowRight, LogOut, Megaphone } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { CountdownBanner } from "@/components/CountdownBanner";

const C = {
  bg:      "#08080f",
  bg2:     "#0d0d1b",
  red:     "#ff3355",
  redGlow: "rgba(255,51,85,0.22)",
  redSub:  "rgba(255,51,85,0.12)",
  redBdr:  "rgba(255,51,85,0.28)",
  border:  "rgba(255,255,255,0.07)",
  card:    "rgba(255,255,255,0.04)",
  text:    "#ffffff",
  muted:   "rgba(255,255,255,0.42)",
  line:    "rgba(255,51,85,0.45)",
};

const BEBAS = "'Bebas Neue', 'Arial Black', sans-serif";

const Label = ({ children }: { children: string }) => (
  <p style={{ color: C.muted, fontSize: "0.68rem", letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 12 }}>
    {children}
  </p>
);

const SectionHead = ({ children }: { children: string }) => (
  <h2 style={{ fontFamily: BEBAS, fontSize: "clamp(2.6rem, 6vw, 5rem)", letterSpacing: "0.02em", color: C.text, marginBottom: 56 }}>
    {children}
  </h2>
);

const CTAButton = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <Button size="lg" asChild style={{ background: C.red, boxShadow: `0 0 28px ${C.redGlow}`, height: 52, padding: "0 2rem", fontSize: "1rem", fontWeight: 600, border: "none" }}>
    <Link to={to}>{children}</Link>
  </Button>
);

/* Vertical frame line — reused for both sides */
const FrameLine = ({ side }: { side: "left" | "right" }) => (
  <div
    className="hidden md:block"
    aria-hidden
    style={{
      position: "absolute",
      top: 0,
      bottom: 0,
      [side]: "15%",
      width: 1,
      pointerEvents: "none",
      zIndex: 4,
      background: `linear-gradient(to bottom, transparent 0px, ${C.line} 80px, ${C.line} calc(100% - 80px), transparent 100%)`,
    }}
  />
);

const Landing = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const handleSignOut = async () => { await signOut(); navigate("/"); };

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  return (
    <>
      <SEO
        title="AdRise — TikTok slideshows that sell. One click."
        description="Upload your product. Click generate. Get views and leads. No marketing skills needed."
        canonical="/"
      />

      {/* Root wrapper: position:relative so frame lines span full page height */}
      <div style={{ background: C.bg, color: C.text, fontFamily: "'DM Sans', sans-serif", position: "relative" }}>

        {/* Full-page vertical frame lines */}
        <FrameLine side="left" />
        <FrameLine side="right" />

        {/* ─── Header ─── */}
        <header style={{ borderBottom: `1px solid ${C.border}`, background: `${C.bg}e8`, backdropFilter: "blur(14px)" }} className="sticky top-0 z-50">
          <div className="container flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <Logo className="h-8 w-8" />
              <span style={{ fontFamily: BEBAS, fontSize: "1.5rem", letterSpacing: "0.05em", color: C.text }}>AdRise</span>
            </Link>
            <nav className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild style={{ color: C.muted }}>
                <Link to="/release-notes"><Megaphone className="h-4 w-4 mr-1" />Release notes</Link>
              </Button>
              {user ? (
                <>
                  <CTAButton to="/dashboard">Dashboard</CTAButton>
                  <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out" style={{ color: C.muted }}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" asChild style={{ color: C.muted }}><Link to="/auth">Log in</Link></Button>
                  <CTAButton to="/auth?mode=signup">Start for $0.99</CTAButton>
                </>
              )}
            </nav>
          </div>
        </header>

        {/* ─── BLOCK 1: Hero ─── */}
        <section style={{ position: "relative", overflow: "hidden", minHeight: "calc(100vh - 64px)" }} className="flex items-center">

          {/* Space fabric grid */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden>
            <div style={{
              position: "absolute",
              bottom: 0,
              left: "-35%",
              right: "-35%",
              height: "115%",
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)
              `,
              backgroundSize: "52px 52px",
              transform: "perspective(290px) rotateX(60deg)",
              transformOrigin: "50% 100%",
              WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.55) 28%, black 58%)",
              maskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.55) 28%, black 58%)",
              opacity: 0.62,
            }} />
          </div>

          {/* 3-column layout — side cols match frame lines at 15% */}
          <div style={{ width: "100%", minHeight: "calc(100vh - 64px)", display: "grid", gridTemplateColumns: "15% 1fr 15%" }} className="relative z-10">

            {/* Left side col */}
            <div className="hidden md:flex" style={{ alignItems: "center", justifyContent: "center" }}>
              <span style={{
                writingMode: "vertical-rl",
                textOrientation: "mixed",
                transform: "rotate(180deg)",
                fontSize: "0.58rem",
                letterSpacing: "0.26em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.13)",
                userSelect: "none",
              }}>
                TikTok Marketing
              </span>
            </div>

            {/* Center col — hero content */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "56px 24px" }}>
              <div style={{ marginBottom: 26 }}><CountdownBanner /></div>

              <h1 style={{
                fontFamily: BEBAS,
                fontSize: "clamp(2.6rem, 5.5vw, 4rem)",
                letterSpacing: "0.02em",
                lineHeight: 0.93,
                color: C.text,
                marginBottom: "1rem",
              }}>
                TikTok ads<br />
                <span style={{ color: C.red }}>that actually sell.</span>
              </h1>

              <p style={{ color: C.muted, fontSize: "clamp(0.85rem, 1.4vw, 0.97rem)", maxWidth: 340, margin: "0 auto 1.75rem" }}>
                Upload your product. One click. Views and leads. No skills, no hours wasted.
              </p>

              {/* Three selling-point cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, width: "100%", maxWidth: 460, margin: "0 auto 1.75rem" }}>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "15px 8px" }}>
                  <div style={{ fontFamily: BEBAS, fontSize: "clamp(1.7rem, 2.8vw, 2.4rem)", color: C.red, lineHeight: 1 }}>827K+</div>
                  <div style={{ color: C.muted, fontSize: "0.62rem", marginTop: 4, letterSpacing: "0.08em", textTransform: "uppercase" }}>avg views</div>
                </div>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "15px 8px" }}>
                  <div style={{ fontFamily: BEBAS, fontSize: "clamp(1.7rem, 2.8vw, 2.4rem)", color: C.red, lineHeight: 1 }}>1 CLICK</div>
                  <div style={{ color: C.muted, fontSize: "0.62rem", marginTop: 4, letterSpacing: "0.08em", textTransform: "uppercase" }}>under 60 sec</div>
                </div>
                <div style={{ background: C.redSub, border: `1px solid ${C.redBdr}`, borderRadius: 14, padding: "15px 8px" }}>
                  <div style={{ fontFamily: BEBAS, fontSize: "clamp(1.7rem, 2.8vw, 2.4rem)", color: C.red, lineHeight: 1 }}>$0.99</div>
                  <div style={{ color: C.muted, fontSize: "0.62rem", marginTop: 4, letterSpacing: "0.08em", textTransform: "uppercase" }}>to start</div>
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
                <CTAButton to="/auth?mode=signup">Start for $0.99 <ArrowRight className="ml-2 h-4 w-4" /></CTAButton>
                <Button size="lg" variant="outline" asChild style={{ height: 52, padding: "0 1.5rem", fontSize: "0.95rem", borderColor: C.border, color: C.muted, background: "transparent" }}>
                  <Link to="#pricing">See plans</Link>
                </Button>
              </div>
            </div>

            {/* Right side col */}
            <div className="hidden md:flex" style={{ alignItems: "center", justifyContent: "center" }}>
              <span style={{
                writingMode: "vertical-rl",
                fontSize: "0.58rem",
                letterSpacing: "0.26em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.13)",
                userSelect: "none",
              }}>
                Powered by AdRise
              </span>
            </div>
          </div>
        </section>

        {/* ─── BLOCK 2: Results ─── */}
        <section style={{ borderTop: `1px solid ${C.border}`, padding: "96px 0", background: C.bg2 }}>
          <div className="container max-w-4xl mx-auto text-center px-4">
            <Label>Real results. Real users.</Label>
            <SectionHead>The numbers</SectionHead>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14">
              {[
                { big: "827K", accent: "+",     label: "Average views per post" },
                { big: "3.2M", accent: "",      label: "Best single slideshow" },
                { big: "3",   accent: " days",  label: "Avg. to first customer" },
                { big: "96",  accent: "%",      label: "Gross margin" },
              ].map((s) => (
                <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "28px 12px" }}>
                  <div style={{ fontFamily: BEBAS, fontSize: "clamp(2.8rem, 4.5vw, 4rem)", lineHeight: 1, color: C.text }}>
                    {s.big}<span style={{ color: C.red }}>{s.accent}</span>
                  </div>
                  <div style={{ color: C.muted, fontSize: "0.75rem", marginTop: 10, letterSpacing: "0.04em" }}>{s.label}</div>
                </div>
              ))}
            </div>

            <CTAButton to="/auth?mode=signup">Get these results <ArrowRight className="ml-2 h-4 w-4" /></CTAButton>
          </div>
        </section>

        {/* ─── BLOCK 3: Easy ─── */}
        <section style={{ borderTop: `1px solid ${C.border}`, padding: "96px 0", background: C.bg }}>
          <div className="container max-w-4xl mx-auto text-center px-4">
            <Label>Zero marketing skills needed</Label>
            <SectionHead>Done in under 60 seconds</SectionHead>

            <div className="flex flex-col md:flex-row items-stretch gap-3 mb-14">
              {[
                { n: "01", title: "Upload",   sub: "Drop in product photos",       time: "~10 sec" },
                { n: "02", title: "Generate", sub: "One click. AI does the rest",  time: "~30 sec" },
                { n: "03", title: "Post",     sub: "Download and post to TikTok",  time: "~20 sec" },
              ].map((step, i) => (
                <div key={step.n} className="flex flex-col md:flex-row items-center gap-3 flex-1">
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 24, padding: "32px 20px", flex: 1, width: "100%" }} className="text-center">
                    <div style={{ fontFamily: BEBAS, fontSize: "4.5rem", color: C.red, lineHeight: 1, marginBottom: 8 }}>{step.n}</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 700, color: C.text, marginBottom: 6 }}>{step.title}</div>
                    <div style={{ color: C.muted, fontSize: "0.83rem", marginBottom: 16 }}>{step.sub}</div>
                    <div style={{ display: "inline-block", background: C.redSub, border: `1px solid ${C.redBdr}`, borderRadius: 100, padding: "4px 14px", fontSize: "0.72rem", color: C.red, fontWeight: 700, letterSpacing: "0.07em" }}>
                      {step.time}
                    </div>
                  </div>
                  {i < 2 && (
                    <div style={{ color: C.muted, fontSize: "1.4rem", flexShrink: 0 }} className="rotate-90 md:rotate-0" aria-hidden>
                      →
                    </div>
                  )}
                </div>
              ))}
            </div>

            <CTAButton to="/auth?mode=signup">Try it in 60 seconds <ArrowRight className="ml-2 h-4 w-4" /></CTAButton>
          </div>
        </section>

        {/* ─── BLOCK 4: Price ─── */}
        <section style={{ borderTop: `1px solid ${C.border}`, padding: "96px 0", background: C.bg2 }}>
          <div className="container max-w-2xl mx-auto text-center px-4">
            <Label>Early beta pricing</Label>
            <SectionHead>Less than a coffee</SectionHead>

            <div style={{ marginBottom: 8 }}>
              <span style={{ color: C.muted, fontSize: "1.1rem", textDecoration: "line-through", marginRight: 12 }}>$19 / month</span>
              <span style={{ background: C.redSub, border: `1px solid ${C.redBdr}`, borderRadius: 100, padding: "3px 12px", fontSize: "0.72rem", color: C.red, fontWeight: 700, letterSpacing: "0.07em" }}>95% OFF</span>
            </div>

            <div style={{ position: "relative", display: "inline-block" }}>
              <div style={{ fontFamily: BEBAS, fontSize: "clamp(7rem, 22vw, 13rem)", color: C.red, lineHeight: 0.88, letterSpacing: "0.01em" }}>
                $0.99
              </div>
              <div style={{ position: "absolute", bottom: -10, left: "50%", transform: "translateX(-50%)", width: 280, height: 60, background: `radial-gradient(ellipse, ${C.redGlow} 0%, transparent 70%)`, pointerEvents: "none" }} aria-hidden />
            </div>

            <p style={{ color: C.muted, fontSize: "0.9rem", marginTop: 24, marginBottom: 40 }}>
              Your first month. No tricks. Cancel any time.
            </p>

            <CTAButton to="/auth?mode=signup">Start for $0.99 <ArrowRight className="ml-2 h-4 w-4" /></CTAButton>
            <p style={{ color: C.muted, fontSize: "0.72rem", marginTop: 14 }}>Then $19/mo.</p>
          </div>
        </section>

        {/* ─── Pricing plans ─── */}
        <section id="pricing" style={{ background: "#ffffff", padding: "80px 0" }}>
          <div className="container max-w-3xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-3 text-foreground">Pick your plan</h2>
              <p className="text-muted-foreground">No contracts. Cancel any time.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-8 shadow-card relative">
                <span className="absolute -top-3 left-6 bg-warning text-warning-foreground text-xs font-bold px-3 py-1 rounded-full">95% OFF</span>
                <h3 className="font-display text-2xl font-bold mb-1">Starter</h3>
                <p className="text-muted-foreground mb-6">For solo builders</p>
                <div className="mb-2 flex items-baseline gap-2">
                  <span className="text-5xl font-bold font-display">$0.99</span>
                  <span className="text-muted-foreground line-through text-lg">$19</span>
                  <span className="text-muted-foreground text-sm">first month</span>
                </div>
                <p className="text-xs text-muted-foreground mb-6">Then $19/mo.</p>
                <ul className="space-y-3 mb-8 text-sm">
                  {["1 workspace", "50 slideshows / month", "500 image uploads", "All AI features", "ZIP export"].map((f) => (
                    <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-success shrink-0" />{f}</li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/auth?mode=signup">Get Starter for $0.99</Link>
                </Button>
              </Card>

              <Card className="p-8 shadow-glow border-primary border-2 relative">
                <span className="absolute -top-3 right-6 bg-gradient-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">POPULAR · 60% OFF</span>
                <h3 className="font-display text-2xl font-bold mb-1">Pro</h3>
                <p className="text-muted-foreground mb-6">For teams shipping daily</p>
                <div className="mb-2 flex items-baseline gap-2">
                  <span className="text-5xl font-bold font-display">$19.60</span>
                  <span className="text-muted-foreground line-through text-lg">$49</span>
                  <span className="text-muted-foreground text-sm">/mo</span>
                </div>
                <p className="text-xs text-muted-foreground mb-6">First month, then $49/mo.</p>
                <ul className="space-y-3 mb-8 text-sm">
                  {["5 workspaces", "Unlimited slideshows", "Unlimited uploads", "Priority AI processing", "ZIP export", "Priority support"].map((f) => (
                    <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-success shrink-0" />{f}</li>
                  ))}
                </ul>
                <Button className="w-full shadow-glow" asChild>
                  <Link to="/auth?mode=signup">Get Pro</Link>
                </Button>
              </Card>
            </div>
          </div>
        </section>

        {/* ─── Footer ─── */}
        <footer style={{ borderTop: `1px solid ${C.border}`, padding: "48px 0", background: C.bg }}>
          <div className="container flex flex-col md:flex-row justify-between gap-4 text-sm" style={{ color: C.muted }}>
            <div className="flex items-center gap-2">
              <Logo className="h-5 w-5" />
              <p>© {new Date().getFullYear()} AdRise. All rights reserved.</p>
            </div>
            <div className="flex gap-6">
              <Link to="/release-notes" className="hover:text-white transition-colors">Release notes</Link>
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Landing;
