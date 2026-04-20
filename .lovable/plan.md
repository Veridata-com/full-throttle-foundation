

# AdRise SaaS — Full Build Plan

A complete, end-to-end implementation of the PRD in one pass. No mock data. Real auth, real AI, real Stripe, real file storage.

## What you'll get

A working SaaS where a user can: sign up → (dev-bypass onboarding for now) → upload product photos → AI auto-tags them → generate a 6-slide TikTok-style slideshow with AI copy → edit text/layout in a canvas editor → export as ZIP of 1080×1920 PNGs. Plus billing, account, legal pages.

## Phases

**1. Foundation**
- Design system in `index.css` + `tailwind.config.ts`: AdRise red `#FF3B5C`, near-black bg, Syne (headings) + DM Sans (body) via Google Fonts. Semantic tokens for primary/accent/muted, button variants, radii.
- Lovable Cloud (Supabase) tables: `profiles`, `user_roles` (+ `has_role` security-definer fn), `usage` (monthly counters), `images` (uploaded photos + AI labels), `slideshows` (generated decks + slide JSON).
- Storage buckets: `product-images` (private), `slideshow-exports` (private).
- RLS on every table — users only see their own rows.

**2. Marketing + Auth**
- `/` Landing page: hero, features, pricing teaser, footer.
- `/auth` Login + Signup (email/password, autoConfirm on, redirect to `/onboarding`).
- `/privacy`, `/terms` with generated boilerplate.
- `AuthProvider` context wrapping the app, `ProtectedRoute` wrapper.

**3. App shell + Image library**
- `/onboarding` plan-picker with **Dev Bypass** button → sets `plan='starter'` so you can test without Stripe keys.
- `/dashboard` with sidebar (Library, Slideshows, Account, Billing).
- `/library`: drag-drop upload to storage → calls edge function `label-image` (Lovable AI Gateway, Gemini 2.5 Flash vision) → stores tags/description on the image row. Grid view with filters.

**4. Generation + Editor (the core)**
- `/slideshows/new` wizard: pick images, choose hook style, target audience, CTA.
- Edge function `generate-slideshow`: calls Gemini 2.5 Flash with image context → returns 6 slides (hook, 4 value props, CTA) as structured JSON.
- `/slideshows/:id/edit`: Fabric.js canvas at 1080×1920, draggable IText layers with TikTok-style stroke, per-slide thumbnails, autosave to DB.
- Export: render each slide to PNG client-side, zip with JSZip, download.

**5. Billing**
- Lovable's built-in Stripe payments (no BYOK). Two products: Starter ($19/mo, 50 slideshows), Pro ($49/mo, unlimited).
- `/billing` page: current plan, upgrade/downgrade, invoice history via customer portal.
- Webhook edge function updates `profiles.plan` + resets monthly `usage`.
- `usePlanLimits` hook — blocks generation past quota with upgrade modal.

**6. Polish**
- Sonner toasts for every async action.
- Mobile responsive (sidebar → sheet).
- SEO: titles, meta descriptions, OG tags per route.
- Empty states + loading skeletons everywhere.

## Tech notes

- **AI**: Lovable AI Gateway, model `google/gemini-2.5-flash` for both vision tagging and slide copy generation. No keys needed from you.
- **Stripe**: Lovable built-in payments — I'll trigger the setup flow during phase 5; you'll click through to connect. No secret keys to paste.
- **Storage**: signed URLs for image previews, 1-hour expiry.
- **Roles**: separate `user_roles` table + `has_role()` security-definer function (never store role on profile).
- **Dev bypass** on `/onboarding` is a temporary button — I'll mark it with a `// TODO: remove before launch` comment so it's easy to strip later.

## What I will NOT do

- No mock/seed data.
- No placeholder images in the editor — real uploads only.
- No localStorage for auth state (Supabase session only).
- No client-side role checks for gating.

## Estimated scope

~35–45 files: 4 edge functions, ~6 DB migrations, ~12 pages, ~15 components, design system, hooks, types. One continuous build.

## Your options

- **Go** — execute all 6 phases now.
- **Adjust colors/fonts first** — tell me what to change and I'll lock the design system before building.
- **Skip dev bypass** — go strict per PRD; you'll connect Stripe before being able to test the app.

