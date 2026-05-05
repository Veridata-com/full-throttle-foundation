import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Pencil, Sparkles, BarChart3, Check, X, ArrowRight } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";

const ACCENT = "#FF3B5C";

const stats = [
  { num: "827K+", label: "Average views generated" },
  { num: "3.2M", label: "Best single slideshow" },
  { num: "96%", label: "Gross margin per slideshow" },
  { num: "3 days", label: "Average time to first customer" },
];

const steps = [
  {
    n: "01",
    icon: Pencil,
    title: "Type your topic",
    desc: "That's literally it. Tell AdRise what your product does or what problem it solves. The AI handles everything from here.",
  },
  {
    n: "02",
    icon: Sparkles,
    title: "AI writes and designs",
    desc: "AdRise picks the hook style, writes all the slide text, chooses the design, and renders your slides — automatically.",
  },
  {
    n: "03",
    icon: BarChart3,
    title: "It gets smarter every post",
    desc: "Connect your TikTok and AdRise tracks which hooks, slide counts and styles actually convert. Every slideshow is better than the last.",
  },
];

const insights = [
  "Question hooks outperformed statement hooks by 4x for SaaS audiences",
  "7-9 slides consistently outperforms 3-5 for educational content",
  "Clean designed slides get 2.3x more saves than AI-generated image slides",
  "Average engagement rate improves 60-80% after 10 tracked posts",
];

const resultCards = [
  {
    bg: "rgba(34,197,94,0.06)",
    border: "rgba(34,197,94,0.25)",
    emoji: "📈",
    metric: "34,200 views",
    quote: "switched hook style on week 3 — this was the first post after",
    who: "— adrise.app user",
  },
  {
    bg: "rgba(59,130,246,0.06)",
    border: "rgba(59,130,246,0.25)",
    emoji: "💰",
    metric: "3 paying customers",
    quote: "came from TikTok in month 1. never had organic conversions before.",
    who: "— SaaS founder, Netherlands",
  },
  {
    bg: "rgba(255,59,92,0.06)",
    border: "rgba(255,59,92,0.25)",
    emoji: "🔁",
    metric: "96% gross margin",
    quote: "$19/mo plan, AI costs under $0.80/month for a typical user",
    who: "— founder math breakdown",
  },
];

const comparisons = [
  ["You pick the hook", "AI picks and tests hooks"],
  ["Same template every time", "Learns your best-performing format"],
  ["No idea what worked", "Tracks every post automatically"],
  ["You manually optimize", "System improves with each post"],
  ["Generic output", "Personalized to your audience"],
];

const starterFeatures = [
  "75 images in library",
  "40 slideshows per month",
  "Self-learning AI optimization",
  "TikTok performance tracking",
  "Clean designed slides",
  "Export as PNG / ZIP",
];

const proFeatures = [
  "Everything in Starter",
  "Unlimited images",
  "Unlimited slideshows",
  "Full AI autopilot mode (Tier 3)",
  "Priority generation",
  "Advanced analytics",
];

const faqs = [
  {
    q: "Do I need to know TikTok to use this?",
    a: "No. AdRise handles the content creation. You just download the slides and post them. The AI even learns which formats work best for your audience over time.",
  },
  {
    q: "What does \"self-learning\" actually mean?",
    a: "Every slideshow you generate gets tracked. When you connect your TikTok and log your posts, AdRise pulls the view and engagement data, figures out what worked, and applies those learnings to the next generation. The more you use it, the better it gets.",
  },
  {
    q: "How are the slides created?",
    a: "You type a topic. The AI writes all the copy, picks the design style, chooses the hook format, renders the slides, and delivers them ready to post. No design skills needed.",
  },
  {
    q: "Why is the first month $0.99?",
    a: "We want you to experience the product before committing. $0.99 removes all friction. If you don't love it after a month, cancel — no hard feelings.",
  },
  {
    q: "What TikTok format are the slides?",
    a: "All slides are 1080×1920px (9:16 portrait), the standard TikTok format. Exported as individual PNGs in a ZIP file.",
  },
  {
    q: "Is there a free plan?",
    a: "No. We don't have a free tier — it keeps the product focused on users who are serious about growing their SaaS. The $0.99 first month is the trial.",
  },
];

const heroSlides = [
  {
    grad: "linear-gradient(135deg,#FF3B5C 0%,#FF7A8E 100%)",
    label: "HOOK",
    text: "Why your SaaS isn't growing on TikTok",
  },
  {
    grad: "linear-gradient(135deg,#0A0A0A 0%,#3B3B3B 100%)",
    label: "INSIGHT",
    text: "It's not the algorithm. It's your hook.",
  },
  {
    grad: "linear-gradient(135deg,#3B82F6 0%,#22C55E 100%)",
    label: "CTA",
    text: "Try AdRise → first month $0.99",
  },
];

const Landing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const ctaTarget = user ? "/dashboard" : "/auth?mode=signup";

  return (
    <>
      <SEO
        title="AdRise — Self-learning AI for viral TikTok slideshows"
        description="AdRise writes, designs and tracks your TikTok slideshows — and learns what actually converts your audience. Start for $0.99."
        canonical="/"
      />
      <div className="min-h-screen bg-white text-[#0A0A0A]">
        {/* NAVBAR */}
        <header
          className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-[#E5E7EB]"
          style={{ height: 64 }}
        >
          <div className="mx-auto flex h-full max-w-[1100px] items-center justify-between px-6 md:px-10">
            <Link to="/" className="flex items-center gap-2">
              <Logo className="h-7 w-7" />
              <span className="font-display text-lg font-bold">AdRise</span>
            </Link>
            <nav className="flex items-center gap-3 md:gap-5">
              <Link
                to="/auth"
                className="text-sm font-medium text-[#6B7280] hover:text-[#0A0A0A]"
              >
                Log in
              </Link>
              <Link
                to={ctaTarget}
                className="rounded-[10px] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
                style={{ background: ACCENT }}
              >
                Start for $0.99
              </Link>
            </nav>
          </div>
        </header>

        {/* HERO */}
        <section className="px-6 md:px-10 py-16 md:py-[120px]">
          <div className="mx-auto max-w-[1100px] text-center">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium"
              style={{
                background: "rgba(255,59,92,0.08)",
                color: ACCENT,
                border: "1px solid rgba(255,59,92,0.2)",
              }}
            >
              🧪 Early beta · Self-improving with every post
            </span>
            <h1 className="mt-6 font-display font-extrabold tracking-tight text-[40px] md:text-[64px] leading-[1.1]">
              The AI that makes your TikTok
              <br className="hidden md:inline" /> slideshows go viral — and learns
              <br className="hidden md:inline" /> what works for YOUR audience.
            </h1>
            <p className="mx-auto mt-6 max-w-[580px] text-lg md:text-xl leading-relaxed text-[#6B7280]">
              AdRise does everything, improves itself, gets you results.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to={ctaTarget}
                className="rounded-[10px] px-8 py-4 text-[17px] font-bold text-white transition hover:opacity-90"
                style={{ background: ACCENT }}
              >
                Start for $0.99 →
              </Link>
              <a
                href="#how-it-works"
                className="rounded-[10px] border-[1.5px] border-[#E5E7EB] px-8 py-4 text-[17px] font-bold text-[#6B7280] transition hover:bg-[#F9FAFB]"
              >
                See how it works ↓
              </a>
            </div>
            <p className="mt-4 text-[13px] text-[#9CA3AF]">
              First month $0.99 · Cancel anytime · No free tier
            </p>

            {/* Hero visual */}
            <div
              className="mx-auto mt-12 md:mt-16 max-w-[900px] overflow-hidden rounded-2xl border border-[#E5E7EB]"
              style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.08)" }}
            >
              <div className="grid grid-cols-3 gap-3 bg-[#F9FAFB] p-4 md:p-6">
                {heroSlides.map((s, i) => (
                  <div
                    key={i}
                    className="relative aspect-[9/16] overflow-hidden rounded-lg p-3 md:p-4 flex flex-col justify-between text-white"
                    style={{ background: s.grad }}
                  >
                    <span className="text-[10px] md:text-xs font-bold tracking-widest opacity-80">
                      {s.label}
                    </span>
                    <span className="text-sm md:text-xl font-extrabold leading-tight">
                      {s.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SOCIAL PROOF */}
        <section className="border-y border-[#E5E7EB] bg-white px-6 md:px-10 py-16 md:py-24">
          <div className="mx-auto max-w-[1100px]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-10 md:divide-x md:divide-[#E5E7EB]">
              {stats.map((s) => (
                <div key={s.label} className="px-4 text-center">
                  <div
                    className="font-display text-4xl md:text-5xl font-extrabold"
                    style={{ color: ACCENT }}
                  >
                    {s.num}
                  </div>
                  <div className="mt-1 text-[15px] text-[#6B7280]">{s.label}</div>
                </div>
              ))}
            </div>
            <p className="mt-8 text-center text-[13px] text-[#9CA3AF] italic">
              * Average results from long-term users. Your mileage will vary based on niche, posting frequency and product.
            </p>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="px-6 md:px-10 py-16 md:py-[120px]">
          <div className="mx-auto max-w-[1100px]">
            <p
              className="text-xs font-bold tracking-[0.2em] uppercase"
              style={{ color: ACCENT }}
            >
              How it works
            </p>
            <h2 className="mt-3 font-display text-3xl md:text-5xl font-extrabold tracking-tight max-w-[800px]">
              From topic to viral slideshow in under 60 seconds.
            </h2>
            <div className="mt-12 grid md:grid-cols-3 gap-6">
              {steps.map((s) => (
                <div
                  key={s.n}
                  className="rounded-xl border border-[#E5E7EB] bg-white p-8"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="rounded-md px-2 py-0.5 text-[13px] font-bold"
                      style={{
                        color: ACCENT,
                        background: "rgba(255,59,92,0.08)",
                      }}
                    >
                      {s.n}
                    </span>
                    <s.icon className="h-5 w-5" style={{ color: ACCENT }} />
                  </div>
                  <h3 className="mt-5 font-display text-xl font-bold">{s.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-[#6B7280]">
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* RESULTS */}
        <section className="px-6 md:px-10 py-16 md:py-[120px] border-t border-[#E5E7EB]">
          <div className="mx-auto max-w-[1100px] grid md:grid-cols-2 gap-12 md:gap-16">
            <div>
              <p
                className="text-xs font-bold tracking-[0.2em] uppercase"
                style={{ color: ACCENT }}
              >
                Real results
              </p>
              <h2 className="mt-3 font-display text-3xl md:text-5xl font-extrabold tracking-tight">
                What happens when the algorithm learns your audience.
              </h2>
              <h3 className="mt-6 font-display text-xl font-bold">
                The self-learning system isn't a gimmick.
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-[#6B7280]">
                Most TikTok tools give you a template. AdRise gives you a system
                that runs experiments on your behalf — testing hook styles, slide
                counts, and design approaches — then doubles down on what actually
                converts your specific audience.
              </p>
              <ul className="mt-6 space-y-3">
                {insights.map((i) => (
                  <li key={i} className="flex gap-3 text-[15px]">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#22C55E]" />
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-4">
              {resultCards.map((c, i) => (
                <div
                  key={i}
                  className="rounded-xl p-6"
                  style={{ background: c.bg, border: `1px solid ${c.border}` }}
                >
                  <div className="flex items-baseline gap-3">
                    <span className="text-[28px]">{c.emoji}</span>
                    <span className="text-2xl font-bold">{c.metric}</span>
                  </div>
                  <p className="mt-2 text-sm text-[#6B7280]">"{c.quote}"</p>
                  <p className="mt-2 text-[13px] text-[#9CA3AF]">{c.who}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* COMPARISON */}
        <section className="border-y border-[#E5E7EB] bg-white px-6 md:px-10 py-16 md:py-[120px]">
          <div className="mx-auto max-w-[900px]">
            <h2 className="text-center font-display text-3xl md:text-5xl font-extrabold tracking-tight">
              Most tools guess. AdRise experiments.
            </h2>
            <div className="mt-12 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
              <div className="grid grid-cols-2 border-b border-[#E5E7EB] bg-white">
                <div className="p-4 md:p-5 text-sm md:text-base font-semibold text-[#6B7280] border-r border-[#E5E7EB]">
                  Other tools
                </div>
                <div
                  className="p-4 md:p-5 text-sm md:text-base font-semibold"
                  style={{ color: ACCENT }}
                >
                  AdRise
                </div>
              </div>
              {comparisons.map(([a, b], i) => (
                <div
                  key={i}
                  className="grid grid-cols-2 border-b border-[#E5E7EB] last:border-b-0"
                  style={{ background: i % 2 === 1 ? "rgba(0,0,0,0.02)" : "white" }}
                >
                  <div className="flex items-center gap-2 p-4 md:p-5 text-sm md:text-base text-[#6B7280] border-r border-[#E5E7EB]">
                    <X className="h-4 w-4 shrink-0 text-[#EF4444]" />
                    {a}
                  </div>
                  <div className="flex items-center gap-2 p-4 md:p-5 text-sm md:text-base text-[#0A0A0A]">
                    <Check className="h-4 w-4 shrink-0 text-[#22C55E]" />
                    {b}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-[15px] text-[#6B7280]">
              After 10 posts: AI unlocks optimization mode.
              <br />
              After 25 posts: Full autopilot. You just type the topic.
            </p>
          </div>
        </section>

        {/* PRICING */}
        <section className="px-6 md:px-10 py-16 md:py-[120px]">
          <div className="mx-auto max-w-[1100px] text-center">
            <p
              className="text-xs font-bold tracking-[0.2em] uppercase"
              style={{ color: ACCENT }}
            >
              Pricing
            </p>
            <h2 className="mt-3 font-display text-3xl md:text-5xl font-extrabold tracking-tight">
              Start for less than a coffee.
            </h2>
            <p className="mt-4 text-[17px] text-[#6B7280]">
              First month is $0.99 on any plan. Cancel anytime.
            </p>

            <div className="mt-12 grid md:grid-cols-2 gap-6 max-w-[820px] mx-auto text-left">
              {/* Starter */}
              <div className="relative rounded-2xl border-[1.5px] border-[#E5E7EB] p-8 md:p-10 bg-white">
                <span className="inline-block rounded-full bg-[#22C55E] px-3 py-1 text-xs font-bold text-white">
                  First month $0.99
                </span>
                <h3 className="mt-5 font-display text-2xl font-bold">Starter</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-5xl font-extrabold font-display">$19</span>
                  <span className="text-[#6B7280]">/mo</span>
                </div>
                <ul className="mt-6 space-y-3">
                  {starterFeatures.map((f) => (
                    <li key={f} className="flex gap-2 text-[15px]">
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#22C55E]" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to={ctaTarget}
                  className="mt-8 block rounded-[10px] py-3.5 text-center text-[16px] font-bold text-white transition hover:opacity-90"
                  style={{ background: ACCENT }}
                >
                  Start for $0.99 →
                </Link>
              </div>

              {/* Pro */}
              <div
                className="relative rounded-2xl border-2 p-8 md:p-10 bg-white"
                style={{
                  borderColor: ACCENT,
                  boxShadow: "0 0 0 4px rgba(255,59,92,0.08)",
                }}
              >
                <div className="flex flex-wrap gap-2">
                  <span
                    className="inline-block rounded-full px-3 py-1 text-xs font-bold text-white"
                    style={{ background: ACCENT }}
                  >
                    Most popular
                  </span>
                  <span className="inline-block rounded-full bg-[#22C55E] px-3 py-1 text-xs font-bold text-white">
                    First month $0.99
                  </span>
                </div>
                <h3 className="mt-5 font-display text-2xl font-bold">Pro</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-5xl font-extrabold font-display">$49</span>
                  <span className="text-[#6B7280]">/mo</span>
                </div>
                <ul className="mt-6 space-y-3">
                  {proFeatures.map((f) => (
                    <li key={f} className="flex gap-2 text-[15px]">
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#22C55E]" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to={ctaTarget}
                  className="mt-8 block rounded-[10px] py-3.5 text-center text-[16px] font-bold text-white transition hover:opacity-90"
                  style={{ background: ACCENT }}
                >
                  Start for $0.99 →
                </Link>
              </div>
            </div>

            <p className="mt-8 text-[15px] text-[#6B7280]">
              Both plans include the self-learning algorithm.
              <br />
              The AI improves regardless of which plan you're on.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-6 md:px-10 py-16 md:py-[120px] border-t border-[#E5E7EB]">
          <div className="mx-auto max-w-[800px]">
            <h2 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight">
              Questions.
            </h2>
            <Accordion
              type="single"
              collapsible
              className="mt-10 rounded-xl border border-[#E5E7EB] divide-y divide-[#E5E7EB]"
            >
              {faqs.map((f, i) => (
                <AccordionItem
                  key={i}
                  value={`item-${i}`}
                  className="border-b-0 px-5 md:px-6"
                >
                  <AccordionTrigger className="text-left text-[16px] md:text-[17px] font-semibold py-5 hover:no-underline">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-[15px] leading-relaxed text-[#6B7280] pb-5">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="bg-[#0A0A0A] px-6 md:px-10 py-20 md:py-[120px]">
          <div className="mx-auto max-w-[900px] text-center">
            <h2 className="font-display text-4xl md:text-[52px] font-extrabold tracking-tight text-white leading-[1.1]">
              Your first viral slideshow is one topic away.
            </h2>
            <p className="mt-4 text-lg text-[#9CA3AF]">
              The AI writes it. Designs it. Learns from it. You just post.
            </p>
            <div className="mt-10">
              <Link
                to={ctaTarget}
                className="inline-flex items-center gap-2 rounded-[10px] px-9 py-4 text-[17px] font-bold text-white transition hover:opacity-90"
                style={{ background: ACCENT }}
              >
                Start for $0.99 <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <p className="mt-4 text-[13px] text-[#4B5563]">
              First month $0.99 · Cancel anytime · Starts improving after your
              first 10 posts
            </p>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-[#E5E7EB] bg-white px-6 md:px-10 py-10">
          <div className="mx-auto flex max-w-[1100px] flex-col md:flex-row items-center justify-between gap-4 text-sm text-[#6B7280]">
            <div className="flex items-center gap-2">
              <Logo className="h-6 w-6" />
              <span>© {new Date().getFullYear()} AdRise</span>
            </div>
            <div className="flex items-center gap-5">
              <Link to="/privacy" className="hover:text-[#0A0A0A]">
                Privacy Policy
              </Link>
              <Link to="/terms" className="hover:text-[#0A0A0A]">
                Terms of Service
              </Link>
              <span>adrise.app</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Landing;
