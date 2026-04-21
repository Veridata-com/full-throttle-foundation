

## Editor rebuild + AI model swap

### What you'll get
A complete dark-themed slideshow editor with a working Fabric.js canvas, classic TikTok bold-stroke text style (headline + subtext as separate editable blocks), real-time caption/size/color controls, single-slide PNG download, auto-save every 30s, and AI copy generation switched to GPT-5 via the Lovable Gateway (no new API key needed).

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back   [Title]              Saving…  Save  PNG  Export ZIP│  56px toolbar
├──────────┬──────────────────────────────────┬──────────────────┤
│          │                                  │  TEXT CONTENT    │
│  Slides  │                                  │  Caption ▢▢▢▢   │
│  ▢ 1 hook│         [1080×1920 canvas        │                  │
│  ▣ 2 val │          scaled to fit]          │  TEXT SIZE       │
│  ▢ 3 val │                                  │  ──●────────  88 │
│  ▢ 4 cta │                                  │                  │
│          │   Drag · double-click · auto-save│  STYLE           │
│          │                                  │  Fill: ⚪⚫🟡🔴 + 🎨│
│  200px   │                                  │  Outline: same   │
│          │                                  │                  │
│          │                                  │  Reset · Add text│
└──────────┴──────────────────────────────────┴──────────────────┘
   200px              flexible                       280px
```

### Bug fixes & features in `src/pages/SlideshowEditor.tsx`

1. **Canvas rendering** — switch to `useEffect` mount pattern with `id="slideshow-canvas"`, dispose+reinit when switching slides, scale via CSS `transform` on a wrapper sized 1080×1920.
2. **Two text objects (headline + subtext)** — replace the single Textbox with two `fabric.IText` objects matching the prompt (Arial Black 900, white fill, black stroke 10/7, drop shadow, paintFirst stroke). Both draggable + double-click to edit inline.
3. **Right-panel caption textarea** — controlled input synced to the *active* text object via `selection:created/updated` handlers; typing updates fill/text in real time.
4. **Caption size slider** — 20–200px, updates `fontSize` on active object instantly.
5. **Color swatches** — Text fill row (white/black/yellow #FFE500/red #FF3B5C + custom color picker) and Outline row (same set). Active swatch shows white ring.
6. **Add text block / Reset style** buttons in the bottom Actions section.
7. **Single-slide PNG download** — discardActiveObject → `toDataURL({format:'png', multiplier:1})` → trigger anchor download → toast "Slide downloaded!".
8. **Export ZIP** — kept exactly as-is, only refactored to use the new two-object render path.
9. **Auto-save** — `setInterval` every 30s + on slide switch, persists `canvas.toJSON()` to `slides[i].fabric_state` in Supabase. On load, if `fabric_state` exists, `loadFromJSON()` restores it; otherwise create the two text objects from `headline`/`subtext`.
10. **"Saving…" indicator** — small muted text in toolbar, fades out after save.

### Dark theme
All editor surfaces hardcoded to: bg `#0A0A0A`, panels `#111111`, borders `#2A2A2A`, accent `#FF3B5C`, muted text `#A0A0A0`. Toolbar 56px, panels 200px / 280px. Buttons: 36px tall, radius 8, primary red / secondary outlined.

### AI copy generation — `supabase/functions/generate-slideshow/index.ts`
- Switch model from `google/gemini-2.5-flash` → `openai/gpt-5` (via the same Lovable Gateway URL — no key needed).
- Replace SYSTEM prompt with the new "viral TikTok scriptwriter" prompt verbatim.
- Update the tool schema to also return a `subtext` field (max 15 words) per slide alongside `headline` (max 10 words).
- Update the prompt: hook (slide 1) opens with contrarian/uncomfortable/question; middles build tension with open loops; last slide resolves + drops CTA.
- Keep ban list ("game-changer", "unlock", "journey", "leverage", "utilize", "dive in", "explore") + existing sentence-case enforcement in `clean()`.
- Persist `subtext` on slide objects (currently set to `null`).

### Database
Add `fabric_state jsonb` to each slide object (no schema change — `slideshows.slides` is already `jsonb`). Plus persist `subtext` (already in type, currently nulled).

### Out of scope (intentionally)
- Stripe / billing — untouched
- Image generation, library, dashboard — untouched
- Export ZIP flow — refactored only minimally to read the two new text objects, behavior unchanged

### Files changed
- `src/pages/SlideshowEditor.tsx` — full rewrite (~400 lines)
- `supabase/functions/generate-slideshow/index.ts` — model + prompt + schema (+subtext)

### Note on the prompt's OpenAI section
The uploaded prompt asks for direct OpenAI API + `OPENAI_API_KEY`. We're using the Lovable Gateway with `openai/gpt-5` instead per your choice — same OpenAI model, no extra key, no extra bill. If you ever want to switch to direct OpenAI billing later, it's a 5-line change.

