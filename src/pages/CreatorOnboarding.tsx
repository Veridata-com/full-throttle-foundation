import { Helmet } from "react-helmet-async";
import logo from "@/assets/adrise-logo.png.asset.json";

interface VideoClip {
  title: string;
  src: string | null;
  poster?: string;
}

// Drop your MP4 URLs in here (replace nulls). Order is the playback sequence.
const CLIPS: (VideoClip & { comingSoon: string })[] = [
  { title: "Adrise introduction video", src: null, comingSoon: "video coming on july 5th 2026" },
  { title: "How to warm up your UGC account", src: null, comingSoon: "video coming on july 5th 2026" },
  { title: "How to find and copy viral content", src: null, comingSoon: "video coming on july 4th 2026" },
  { title: "How to repurpose your content", src: null, comingSoon: "video coming on july 4th 2026" },
  { title: "How to schedule your content", src: null, comingSoon: "video coming on july 4th 2026" },
  { title: "How to get a T-1 audience", src: null, comingSoon: "video coming on july 4th 2026" },
];

const DISCORD_URL = "https://discord.gg/25XNHvszJ";

export default function CreatorOnboarding() {
  return (
    <div
      className="relative min-h-screen bg-black text-white selection:bg-white selection:text-black"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
        backgroundPosition: "center top",
      }}
    >
      <Helmet>
        <title>Adrise — Creator Onboarding</title>
        <meta name="description" content="Welcome to the Adrise creator program. Watch the onboarding sequence and join the Discord." />
        <link rel="icon" href={logo.url} type="image/png" />
      </Helmet>

      {/* Radial vignette to fade grid edges */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, transparent 0%, rgba(0,0,0,0.4) 70%, #000 100%)",
        }}
      />

      <div className="relative">
      {/* Hero */}
      <header className="px-6 pt-24 pb-16 flex flex-col items-center text-center">
        <div className="relative mb-10">
          <div className="absolute inset-0 blur-3xl opacity-80 bg-white/30 rounded-full" />
          <img
            src={logo.url}
            alt="Adrise"
            className="relative h-24 w-24 md:h-28 md:w-28 rounded-full object-cover bg-white"
            style={{ filter: "drop-shadow(0 0 40px rgba(255,255,255,0.85))" }}
          />
        </div>
        <h1
          className="text-4xl md:text-6xl font-semibold tracking-tight"
          style={{ textShadow: "0 0 40px rgba(255,255,255,0.45), 0 0 80px rgba(255,255,255,0.2)" }}
        >
          Welcome, creator.
        </h1>
        <p
          className="mt-5 max-w-xl text-white/70 text-base md:text-lg leading-relaxed"
          style={{ textShadow: "0 0 24px rgba(255,255,255,0.25)" }}
        >
          A short onboarding sequence to get you up to speed. Watch top to bottom — it takes about 15 minutes.
        </p>
        <div className="mt-12 h-px w-24 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      </header>


      {/* Video sequence */}
      <main className="mx-auto max-w-3xl px-6 pb-24 space-y-12">
        {CLIPS.map((clip, i) => (
          <section key={i} className="group">
            <div className="flex items-baseline justify-between mb-4">
              <span className="text-xs tracking-[0.3em] text-white/40 font-mono">
                {String(i + 1).padStart(2, "0")} / {String(CLIPS.length).padStart(2, "0")}
              </span>
              <h2 className="text-lg md:text-xl font-medium tracking-tight">
                {clip.title}
              </h2>
            </div>
            <div
              className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] transition-all duration-500 group-hover:border-white/30"
              style={{ boxShadow: "0 0 0 rgba(255,255,255,0)" }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 0 60px rgba(255,255,255,0.12)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 0 0 rgba(255,255,255,0)")}
            >
              {clip.src ? (
                <video
                  controls
                  preload="metadata"
                  poster={clip.poster}
                  className="w-full aspect-video bg-black"
                  src={clip.src}
                />
              ) : (
                <div className="w-full aspect-video flex items-center justify-center text-white/30 text-sm font-mono">
                  {clip.comingSoon}
                </div>
              )}
            </div>
          </section>
        ))}
      </main>

      {/* CTA */}
      <section className="px-6 pb-32 flex flex-col items-center text-center">
        <div className="h-px w-24 bg-gradient-to-r from-transparent via-white/40 to-transparent mb-12" />
        <h2 className="text-3xl md:text-5xl font-semibold tracking-tight max-w-xl">
          You're in. Join the creator Discord.
        </h2>
        <p className="mt-5 max-w-md text-white/60 leading-relaxed">
          This is where briefs, payments, and the rest of the team live. Don't skip this step.
        </p>
        <a
          href={DISCORD_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-10 inline-flex items-center gap-3 px-8 py-4 rounded-full bg-white text-black font-medium tracking-tight transition-all duration-300 hover:scale-[1.03]"
          style={{ boxShadow: "0 0 40px rgba(255,255,255,0.35)" }}
        >
          Join the Discord
          <span aria-hidden>→</span>
        </a>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10 flex flex-col items-center gap-3">
        <img
          src={logo.url}
          alt="Adrise"
          className="h-6 w-6 opacity-50 rounded-full object-cover bg-white"
          style={{ filter: "drop-shadow(0 0 8px rgba(255,255,255,0.4))" }}
        />
        <p className="text-xs text-white/30 tracking-[0.2em] uppercase">Adrise · Creator Program</p>
      </footer>
      </div>
    </div>
  );
}
