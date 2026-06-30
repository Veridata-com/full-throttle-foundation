## New site: UGC Creator Onboarding

Replace the public landing with a single, minimal creator onboarding page. Old app code stays in the repo (archived, unreachable via router) so nothing is lost.

### Aesthetic
- Pure black background (`#000`), neon white glow accents echoing the alpha logo
- Tight modern typography (Space Grotesk / Inter via @fontsource)
- Subtle outer glow on logo, buttons, video frames (`box-shadow: 0 0 40px rgba(255,255,255,0.15)`)
- Generous whitespace, centered single-column layout

### Page structure (`/`)
1. **Hero** — alpha logo (with glow), title "Welcome, creator.", short subtitle
2. **Video sequence** — vertical stack of native `<video controls>` players, numbered "01 / Intro", "02 / How it works", etc. Each in a thin-bordered card with neon glow on hover
3. **CTA** — "You're in. Join the creator Discord." → button linking to `https://discord.gg/25XNHvszJ` (opens new tab)
4. Minimal footer with logo mark

### Video handling
- New page renders a configurable array of video entries (title + src + optional poster)
- Initially scaffolded with 3–5 placeholder slots
- You upload `.mp4` files; I convert each to a CDN asset via `lovable-assets` and wire the URLs into the array
- (For this plan: scaffold the layout with empty/placeholder sources. You drop the MP4s in chat next and I swap them in.)

### Routing / archival
- `src/App.tsx`: comment out all existing routes (Dashboard, Auth, Onboarding, Slideshows, Billing, etc.) and add a single `/` route → new `CreatorOnboarding` page, plus catch-all `*` → same page (or NotFound styled to match)
- All old page files, edge functions, Supabase tables, and assets remain untouched on disk and in the database — just unreachable from the UI
- Update `index.html` `<title>` and meta to UGC agency creator onboarding copy
- Update favicon to the new alpha logo

### Files
- **New:** `src/pages/CreatorOnboarding.tsx`, `src/assets/alpha-logo.png.asset.json` (from your upload)
- **Edited:** `src/App.tsx` (route swap), `index.html` (title/meta/favicon), `src/index.css` (add black bg + glow utility tokens), `tailwind.config.ts` (optional glow shadow token)
- **Untouched/archived:** everything else (old pages, components, Supabase functions, migrations)

### After approval
1. I scaffold the page with placeholder video slots
2. You upload the Loom MP4 exports → I swap them into the video array
