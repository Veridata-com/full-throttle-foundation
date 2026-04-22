import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Image as ImageIcon, Wand2, Download, Check, ArrowRight, LogOut } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { CountdownBanner } from "@/components/CountdownBanner";
import { Logo } from "@/components/Logo";
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
            <div className="mb-8"><CountdownBanner /></div>
            <h1 className="font-display text-4xl md:text-7xl font-bold tracking-tighter mb-6 animate-fade-in">
              Make your SaaS profitable with <span className="text-gradient">converting organic TikTok slideshows.</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg md:text-xl text-muted-foreground mb-10 animate-fade-in">
              Drop your slideshow images. Our AI writes hooks, picks angles, and lays out scroll-stopping slideshows that convert. No designer. No agency. No bullshit.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-in">
              <Button size="lg" className="text-base h-12 px-8 shadow-glow" asChild>
                <Link to="/auth?mode=signup">Start creating <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base h-12 px-8" asChild>
                <a href="#pricing">See pricing</a>
              </Button>
            </div>
          </div>
        </section>

        <section className="container py-20 border-t">
          <div className="text-center mb-14">
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">Built to ship, not fiddle</h2>
            <p className="text-muted-foreground text-lg">From upload to posted, in minutes.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: ImageIcon, title: "Smart image library", desc: "Upload once. AI auto-tags and sorts every image so you can find it fast.", img: featureLibrary, alt: "AdRise image library with auto-tagged folders" },
              { icon: Wand2, title: "AI writes the script", desc: "Hooks, value props, and CTAs. Tuned for TikTok-native, human voice.", img: featureEditor, alt: "AdRise slideshow editor with AI-generated TikTok hook" },
              { icon: Download, title: "Export & post", desc: "1080x1920 PNGs, zipped and ready for TikTok, Reels, or Shorts.", img: featureExport, alt: "Exported AdRise slideshow ZIP file ready to post" },
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
          <div className="text-center mb-12">
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">Simple, honest pricing</h2>
            <p className="text-muted-foreground text-lg">Limited time launch discount. Cancel anytime.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <Card className="p-8 shadow-card relative">
              <span className="absolute -top-3 left-6 bg-success text-success-foreground text-xs font-bold px-3 py-1 rounded-full">60% OFF</span>
              <h3 className="font-display text-2xl font-bold mb-1">Starter</h3>
              <p className="text-muted-foreground mb-6">For solo creators getting going</p>
              <div className="mb-6 flex items-baseline gap-2">
                <span className="text-5xl font-bold font-display">$7.60</span>
                <span className="text-muted-foreground line-through">$19</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              <ul className="space-y-3 mb-8 text-sm">
                {["1 workspace", "50 slideshows / month", "500 image uploads", "All AI features", "ZIP export"].map(f => (
                  <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-success" />{f}</li>
                ))}
              </ul>
              <Button variant="outline" className="w-full" asChild><Link to="/auth?mode=signup">Get Starter</Link></Button>
            </Card>
            <Card className="p-8 shadow-glow border-primary border-2 relative">
              <span className="absolute -top-3 right-6 bg-gradient-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">POPULAR · 60% OFF</span>
              <h3 className="font-display text-2xl font-bold mb-1">Pro</h3>
              <p className="text-muted-foreground mb-6">For teams shipping ads daily</p>
              <div className="mb-6 flex items-baseline gap-2">
                <span className="text-5xl font-bold font-display">$19.60</span>
                <span className="text-muted-foreground line-through">$49</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
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
