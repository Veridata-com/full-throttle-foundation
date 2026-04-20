

# AdRise Overhaul — Workspaces, AI Auto-Select, Discount, Explorer Library

Re-presenting the approved plan so you can hit Approve.

## 1. Landing page
- Replace "Powered by Gemini 2.5 Flash" pill with a **live countdown button**: `60% off all plans for 06d23h59m58s`, ticks every second, end-date persisted in `localStorage` (first visit = now + 7 days). Clicks go to `/auth?mode=signup` (or `/billing` if logged in).
- Headline → **"Make your SaaS profitable with converting organic TikTok slideshows."**
- Sub → **"Drop your slideshow images. Our AI writes hooks, picks angles, and lays out scroll-stopping slideshows that convert. No designer. No agency. No bullshit."**
- Pricing cards: strike-through `$19` / `$49`, show **$7.60** / **$19.60**, "LIMITED TIME 60% OFF" badge.

## 2. 60% discount everywhere
- `create-checkout`: Starter 760¢, Pro 1960¢, product name suffixed `— Launch 60% off`.
- Billing + Onboarding show the same strike-through pricing.

## 3. Max AI cost per user (owner side)
Using Lovable AI Gateway `google/gemini-3-flash-preview`:

| Plan | Cap | Max AI / user / month | Revenue (after 60% off) | Gross margin |
|---|---|---|---|---|
| Starter | 500 images + 50 slideshows | ~$0.35 | $7.60 | ~$7.25 |
| Pro | ~5000 images + 500 slideshows realistic | ~$3.50 (abuse ceiling ~$15) | $19.60 | ~$16 |

Minus Stripe ~2.9% + 30¢. I'll log token usage in edge functions so you can track real cost.

## 4. Workspaces
- New table `workspaces (id, user_id, name, tagline, target_audience, brand_voice, default_cta, story_style_history jsonb, created_at, updated_at)`.
- Starter = 1 max, Pro = 5 max. Enforced server + client side.
- After signup → `/workspaces/new`. Skippable to dashboard, but **blocked before generating any slideshow**.
- Form: product name, tagline, target audience, brand voice (optional), default CTA (optional), **≥1 product image upload** → auto-stored in system folder **"Product slide images"**.
- Switcher top-left of sidebar (combobox with current + chevron). Dropdown: workspaces list, "Workspace settings", "+ New workspace" (disabled at plan cap with tooltip).
- Persisted in `localStorage` + `WorkspaceContext`.
- `images` and `slideshows` gain `workspace_id`. Backfill: one "My first workspace" per existing user.

## 5. Library as file explorer
- List view: icon + filename + tags + quality badge + date (no upfront previews).
- Click row → side drawer fetches signed URL + renders preview.
- Search bar filters filename / tag / description / folder.
- Folders sidebar auto-created by AI from tag clusters. Tables: `folders(id, workspace_id, name, auto)` + `image_folders(image_id, folder_id)`.
- `label-image` returns `suggested_folders: string[]` + `quality: 'low'|'medium'|'high'`, upserts and links folders.
- Folder actions: rename, delete (manual only, auto folders can only be detached).
- Image actions: edit tags, move/add to folders, delete.
- System folder **"Product slide images"** is protected from deletion, always used for final CTA slide.

## 6. Slideshow generation — fully automatic
`/slideshows/new` is 3 inputs:
- Number of slides (slider 3–12)
- Hook style (dropdown, kept)
- Generate button

`generate-slideshow` now:
1. Loads workspace context (name, tagline, audience, voice, CTA).
2. Reads last 5 entries of `story_style_history` and picks a **different** style: listicle / POV / problem-agitate-solve / comparison / myth-bust / transformation / UGC-testimonial. Appends chosen style to history.
3. Pulls all workspace images with tags, description, quality. AI picks **N-1** matching the narrative, ranked `high > medium > low` quality, ties broken by tag overlap.
4. Always appends **one image from "Product slide images"** as the final CTA slide.
5. Prefills headlines/subtext in workspace voice.

## 7. Prompt rules (all AI functions)
System prompt gets:
> Write like a real human on TikTok. Conversational, punchy, relatable. Never use em-dashes or en-dashes. Short sentences, line breaks, commas. Scroll-stopping hooks optimized for conversion, zero corporate voice.

Plus post-processing: strip `—` / `–` from every AI output before saving (replace with `,` or split sentence).

## 8. Fixing AI non-response
- Switch both edge functions to **`google/gemini-3-flash-preview`** (text + vision).
- Use **tool-calling** for structured output instead of `response_format: json_object` (more reliable on the gateway).
- Add full `console.error(status, body)` logging so future failures are debuggable.
- Surface 429 / 402 to client with user-friendly toasts.

## 9. Account page
- Remove `brand_voice`, `target_audience`, `default_cta` (moved to workspaces).
- Keep: display name, email (read-only), plan badge, link to Billing, "Manage workspaces" link, sign-out, soft delete-account (signs out + shows support email).

## 10. Workspace switcher UX
- Combobox top-left of sidebar with current workspace name + chevron.
- Dropdown: workspaces (radio check on active), separator, "Workspace settings", "+ New workspace" (greyed + upgrade tooltip at cap).

## DB migration (one file)
```text
create table workspaces (...)            -- RLS: owner only
alter images     add workspace_id uuid, is_product_shot bool, quality text
alter slideshows add workspace_id uuid, num_slides int default 6
create table folders        (id, workspace_id, name, auto bool)     -- RLS
create table image_folders  (image_id, folder_id, pk)               -- RLS via parent
backfill: 1 default workspace per existing user; reassign all rows; create "Product slide images" folder
```

## Files (~20)
- 1 migration
- Edge: rewrite `label-image`, `generate-slideshow`; update `create-checkout`
- New: `WorkspaceContext.tsx`, `NewWorkspace.tsx`, `WorkspaceSettings.tsx`, `WorkspaceSwitcher.tsx`, `CountdownBanner.tsx`, `ImagePreviewDrawer.tsx`, `FolderTree.tsx`
- Rewrite: `Landing.tsx`, `Library.tsx`, `NewSlideshow.tsx`, `Account.tsx`, `Billing.tsx`, `Onboarding.tsx`, `AppSidebar.tsx`, `ProtectedRoute.tsx`, `App.tsx`

## Trade-offs
- Countdown is per-browser (localStorage). Want a true global end-date? Say so, I'll move it to DB.
- Auto-folder creation depends on AI; if it fails, image is still searchable, just unfoldered.
- Backfilled workspaces are named "My first workspace" — users can rename.

