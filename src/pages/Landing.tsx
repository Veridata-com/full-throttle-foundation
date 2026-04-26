import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Image as ImageIcon, Wand2, Download, Check, ArrowRight, LogOut, Megaphone, Sparkles } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { CountdownBanner } from "@/components/CountdownBanner";
import { Logo } from "@/components/Logo";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import featureLibrary from "@/assets/feature-library.png";
import featureEditor from "@/assets/feature-editor.png";
import featureExport from "@/assets/feature-export.png";
import heroMobileBg from "@/assets/hero-mobile-bg.png";
import heroDesktopBg from "@/assets/hero-desktop-bg.png";

const Landing = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const handleSignOut = async () => { await signOut(); navigate("/"); };
  return (
    <>
      <SEO title="AdRise — Create on-brand product ads in seconds" description="Upload your product, choose your style, and generate beautiful on-brand ads in seconds with AdRise." canonical="/" />
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <Logo className="h-8 w-8" />
              <span className="font-display text-xl font-bold">AdRise</span>
            </Link>
            <nav className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                <Link to="/release-notes"><Megaphone className="h-4 w-4" />Release notes</Link>
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

        <section className="relative py-20 md:py-32 text-center overflow-hidden">
          {/* Mobile-only background image */}
          <div
            className="md:hidden absolute inset-0 z-0 bg-no-repeat bg-cover bg-center opacity-60"
            style={{ backgroundImage: `url(${heroMobileBg})` }}
            aria-hidden
          />
          <div className="md:hidden absolute inset-0 z-0 bg-gradient-to-b from-background/40 via-background/70 to-background" aria-hidden />

          {/* Desktop-only background image */}
          <div
            className="hidden md:block absolute inset-0 z-0 bg-no-repeat bg-cover bg-center opacity-70"
            style={{ backgroundImage: `url(${heroDesktopBg})` }}
            aria-hidden
          />
          <div className="hidden md:block absolute inset-0 z-0 bg-gradient-to-b from-background/30 via-background/60 to-background" aria-hidden />

          <div className="relative z-10 container">
            <div className="mb-6"><CountdownBanner /></div>
            <Badge className="mb-5 bg-warning/15 text-warning border border-warning/30" variant="outline">
              <Sparkles className="h-3 w-3 mr-1" />Early beta · Improving rapidly from your feedback
            </Badge>
            <h1 className="font-display text-4xl md:text-7xl font-bold tracking-tighter mb-6 animate-fade-in">
              First <span className="text-gradient">self-learning algorithm</span> that optimizes TikTok slideshow virality and conversion
            </h1>
            <p className="mx-auto max-w-2xl text-lg md:text-xl text-muted-foreground mb-4 animate-fade-in">
              AdRise creates your slideshows, tests different formats, tracks performance and finds exactly what works best for your product. Don't guess what works, let AdRise analyze and optimize your organic marketing.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-in">
              <Button size="lg" className="text-base h-12 px-8 shadow-glow" asChild>
                <Link to="/auth?mode=signup">Start creating <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base h-12 px-8" asChild>
                <a href="#demo">Watch the demo</a>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Overview */}
        <section className="container py-16 border-t">
          <div className="text-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">Everything you need to go viral</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Every slideshow you post is a datapoint that helps the AdRise algorithm find YOUR highest converting format.
            </p>
          </div>
        </section>

        {/* Demo + early beta context */}
        <section id="demo" className="container py-16 border-t">
          <div className="max-w-3xl mx-auto text-center mb-8">
            <Badge variant="outline" className="mb-3">Live demo</Badge>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">See AdRise in 2 minutes</h2>
            <p className="text-muted-foreground">
            We're in early beta; My name is Manasse, I am the founder of AdRise and I have extensive experience in UGC, social media analytics and machine learning. I also have a part-time occupation in marketing at a european software startup (Quodari). I use my skillset and combine it into creating the most converting TikTok slideshow system.
            </p>
          </div>
          <div className="relative max-w-4xl mx-auto rounded-2xl overflow-hidden border border-border/60 shadow-glow bg-card">
            <div className="relative" style={{ paddingBottom: "56.25%", height: 0 }}>
              <iframe
                src="https://www.loom.com/embed/3ff4dc9d2cb040a9a184e4eef18f60f0"
                title="AdRise demo"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button variant="outline" asChild><Link to="/release-notes"><Megaphone className="h-4 w-4" />See what's shipped & what's coming</Link></Button>
            <FeedbackDialog />
          </div>
        </section>

        <section className="container py-20 border-t">
          <div className="grid md:grid-cols-2 gap-8">
            {[
              { icon: ImageIcon, title: "Smart image library", desc: "Upload once. AI auto-tags and sorts every image so you can find it fast.", img: featureLibrary, alt: "AdRise image library with auto-tagged folders" },
              { icon: Wand2, title: "AI writes the script", desc: "Hooks, value props, and CTAs. Tuned for TikTok-native, human voice.", img: featureEditor, alt: "AdRise slideshow editor with AI-generated TikTok hook" },
            ].map((f, i) => (
              <div key={f.title} className="group relative">
                {/* glow */}
                <div className="absolute -inset-1 rounded-3xl bg-gradient-primary opacity-0 group-hover:opacity-30 blur-2xl transition-opacity duration-500" aria-hidden />
                <div className="relative h-full rounded-3xl border border-border/60 bg-card/60 backdrop-blur-xl p-7 shadow-card overflow-hidden flex flex-col transition-all duration-500 hover:-translate-y-1 hover:border-primary/40">
                  {/* subtle corner gradient */}
                  <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-gradient-primary opacity-20 blur-3xl" aria-hidden />

                  <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow mb-5">
                    <f.icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <h3 className="relative font-display text-xl font-bold mb-2">{f.title}</h3>
                  <p className="relative text-muted-foreground mb-6">{f.desc}</p>

                  {/* floating screenshot mockup */}
                  <div className="relative mt-auto">
                    <div className="absolute inset-x-4 -bottom-2 h-12 bg-primary/30 blur-2xl rounded-full" aria-hidden />
                    <div
                      className="relative rounded-xl overflow-hidden border border-border/80 bg-background shadow-2xl transition-transform duration-500 group-hover:-translate-y-2 group-hover:rotate-0"
                      style={{ transform: `rotate(${i % 2 === 0 ? -1.5 : 1.5}deg)` }}
                    >
                      {/* faux window chrome */}
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
        </section>

        <section id="pricing" className="container py-20 border-t">
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <Card className="p-8 shadow-card relative">
              <span className="absolute -top-3 left-6 bg-warning text-warning-foreground text-xs font-bold px-3 py-1 rounded-full">EARLY BETA · $0.99 first month</span>
              <h3 className="font-display text-2xl font-bold mb-1">Starter</h3>
              <p className="text-muted-foreground mb-6">For solo creators getting going</p>
              <div className="mb-2 flex items-baseline gap-2">
                <span className="text-5xl font-bold font-display">$0.99</span>
                <span className="text-muted-foreground line-through">$19</span>
                <span className="text-muted-foreground">first month</span>
              </div>
              <p className="text-xs text-muted-foreground mb-6">Then $19/mo. Limited-time offer for early beta adopters.</p>
              <ul className="space-y-3 mb-8 text-sm">
                {["1 workspace", "50 slideshows / month", "500 image uploads", "All AI features", "ZIP export"].map(f => (
                  <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-success" />{f}</li>
                ))}
              </ul>
              <Button variant="outline" className="w-full" asChild><Link to="/auth?mode=signup">Get Starter for $0.99</Link></Button>
            </Card>
            <Card className="p-8 shadow-glow border-primary border-2 relative">
              <span className="absolute -top-3 right-6 bg-gradient-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">POPULAR · 60% OFF</span>
              <h3 className="font-display text-2xl font-bold mb-1">Pro</h3>
              <p className="text-muted-foreground mb-6">For teams shipping ads daily</p>
              <div className="mb-2 flex items-baseline gap-2">
                <span className="text-5xl font-bold font-display">$19.60</span>
                <span className="text-muted-foreground line-through">$49</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              <p className="text-xs text-muted-foreground mb-6">First month, then $49/mo.</p>
              <ul className="space-y-3 mb-8 text-sm">
                {["5 workspaces", "Unlimited slideshows", "Unlimited uploads", "Priority AI processing", "ZIP export", "Priority support"].map(f => (
                  <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-success" />{f}</li>
                ))}
              </ul>
              <Button className="w-full shadow-glow" asChild><Link to="/auth?mode=signup">Get Pro</Link></Button>
            </Card>
          </div>
        </section>

        <footer className="border-t py-12">
          <div className="container flex flex-col md:flex-row justify-between gap-4 text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} AdRise. All rights reserved.</p>
            <div className="flex gap-6">
              <Link to="/release-notes" className="hover:text-foreground">Release notes</Link>
              <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
              <Link to="/terms" className="hover:text-foreground">Terms</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Landing;
