---
name: motion-kit
description: "Signature web-animation kit distilled from six award-style sites (nova, Ember/Cloud Kitchen, Solenne, Fizzy Fjord, Oval, Dewpoint): 64 tested scroll, text, image, intro and interaction effects applied with data-mk attributes (including scroll-scrubbed frame sequences, camera paths over big artworks, idle loop videos and product burst views for AI start/end-frame video sites), five motion personalities, and a guided picker that inventories the page and asks the user which animation each section should get before implementing and verifying it. Use this skill whenever the user wants to add, choose, change, preview or audit animations on a website or landing page — scroll reveals, text reveals, parallax, pinned or horizontal scroll scenes, preloaders/intros, image wipes, marquees, carousels, cursor or hover effects, micro-interactions — in plain HTML/CSS/JS or React/Next.js, even if they only say 'make it feel alive', 'add some motion', 'animate this section', or mention one of those six sites."
---

# Motion Kit

A tested animation library plus a workflow for applying it **section by section, with the user choosing**.

- `assets/motion-core.js` — the runtime (`window.MK` / `import MK`): GSAP + ScrollTrigger wiring, Lenis smooth
  scroll, live reduced-motion handling, accessible text splitting, presets, cleanup on breakpoint changes.
- `assets/effects/*.js` — 64 effects, each applied with `data-mk="<name>"` and tuned with `data-mk-<option>`:
  `text.js` (T1–T13) · `media.js` (M1–M10) · `scroll.js` (S1–S16) · `collections.js` (C1–C9) · `ui.js` (U1–U12) · `intro.js` (I1–I4).
- For **AI-generated video sites** (Higgsfield start/end-frame chains and similar): M9 `frame-scrub` scrubs an
  image sequence or video on scroll, M10 `loop-video` runs idle loops, S15 `camera-path` flies a camera over one big
  artwork, S16 `burst-collapse` bursts a real product's ingredients out and back. Producing a long seamless video
  chain is a separate job: the `scroll-world` skill, when installed, owns that pipeline and its own scrub engine.
- `assets/motion-kit.css` — structural CSS for every effect (no-flash rules, masks, overlays, reduced fallbacks).
- `assets/showroom/index.html` — a live page demonstrating every effect; also the reference markup.
- `references/` — load only what the current step needs (map at the end).

Every effect was reproduced from the audited sites **with their bugs fixed** (see `references/pitfalls.md`).

## When to use / not

Use for: adding or changing motion on marketing sites, landing pages, portfolios, product pages; choosing a motion
style; converting "make it feel like X site" into concrete effects; auditing existing motion against the pitfalls list.
Not for: app UI state transitions inside complex product dashboards (use the framework's own transitions), video
editing, Lottie authoring, data-viz transitions, or native mobile apps.

---

## Workflow

Follow the steps in order. The user decides the motion. You only skip a question when they already answered it,
or when they said "you choose", "surprise me" or "just do it". In those cases, pick the recommended options and list
what you chose.

### Step 1 · Read the project (no questions yet)
1. **Stack.** Vanilla (HTML files, `<script>` tags) or React/Next (`package.json` with `react`/`next`)? Is there a build
   step? Are GSAP, Lenis, Motion, Locomotive, AOS or Three.js already present (versions)? Is there a strict CSP or an
   offline requirement? Those mean you vendor the libraries locally instead of using a CDN.
2. **Inventory the sections.** For each top-level section record: selector/id, type (classify with
   `references/section-playbook.md` §1), contents (headline? images? grid? list? numbers?), whether it is above the
   fold, and any existing animation (keep, replace or remove: ask in step 3 if unclear).
3. **Brand signals.** Typography, palette, imagery and tone decide the recommended preset
   (`references/presets.md` → "Quick chooser").
4. If the page has no sections yet (the user is building from scratch), finish building the layout first, or
   inventory the planned sections from their brief.

### Step 2 · Ask the global questions (one question call)
Ask up to four questions together. Recommended option first, with " (Recommended)" added to its label:
1. **Motion personality.** Offer the 3–4 presets that fit the brand: `calm`, `editorial`, `liquid`, `warm` or
   `playful`. Describe each by feel and give the origin site ("Liquid Gloss — slow start, soft landing, blur-depth
   (Dewpoint)"). If the user names a site, map it straight to its preset.
2. **Intro.** None (usually recommended) / the preset's signature intro (I1 window, I2 arch, I3 drop, I4 curtain).
3. **Motion density.** Restrained / Rich (default) / Maximal (`presets.md` → "Motion density").
4. **Smooth scrolling.** Lenis smooth wheel (recommended for Rich and Maximal) / native scrolling.

Tell the user they can preview every effect in the showroom: serve the skill folder over http and open
`assets/showroom/index.html`; `?preset=` and `?intro=` switch the style. If you have a browser tool, offer to open it
for them.

### Step 3 · Ask per section (batches of ≤ 4 questions)
- Ask **one question per section** (`header` = the section's short name). Offer 2–3 combos from
  `section-playbook.md` §2 for the chosen preset and density, then add "Keep it still". The tool always adds "Other",
  where the user can type effect IDs or describe something.
- Label: up to 5 words describing what the visitor sees. Description: one sentence, plus the effect IDs and cost
  ("T1 + M1 + M2 · low cost"). Use the option `preview` field for a 3–5 line storyboard when it is available.
- Respect the page budget while proposing options: one intro, ≤ 4 pinned scenes, at most one M4, M5, M6 or S14
  showpiece each, and at most one heavy blur or canvas effect in view.
- Group near-identical sections ("Rows 3–5: text + image") so there are at most about 8 questions in total.
- **No question tool available?** Print the compact menu from `section-playbook.md` §4, then stop and wait for the
  reply. Don't implement anything on a guess.

### Step 4 · Confirm the plan, then install
Show a short plan table (section → effects → notes). Then install, unless the user asked to review the plan first:

**Vanilla.** Copy the files (only the effect files you need):
```bash
SKILL_DIR="<this skill's base directory>"            # shown when the skill loads
mkdir -p js/motion-kit/effects
cp "$SKILL_DIR/assets/motion-core.js" "$SKILL_DIR/assets/motion-kit.css" js/motion-kit/
cp "$SKILL_DIR/assets/effects/"{text,media,scroll}.js js/motion-kit/effects/
```
Head snippet: paste it as the **first thing in `<head>`**, before any CSS.
```html
<script>
  (function (d, w) {
    var h = d.documentElement, q = w.location.search;
    h.classList.add('mk-js');
    var reduce = /[?&]mk-reduce\b/.test(q) || (!/[?&]mk-motion\b/.test(q) && w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (!reduce) {
      h.classList.add('mk-motion');
      w.__mkFailsafe = setTimeout(function () { if (!(w.MK && w.MK.started)) h.classList.add('mk-failsafe'); }, 4000);
    }
  })(document, window);
</script>
<link rel="stylesheet" href="js/motion-kit/motion-kit.css">
```
Scripts, at the end of `<body>` (or with `defer`), in this order:
```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/SplitText.min.js"></script>   <!-- line masks; optional -->
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/CustomEase.min.js"></script>  <!-- exact preset curves; optional -->
<script src="https://cdn.jsdelivr.net/npm/lenis@1.3.4/dist/lenis.min.js"></script>       <!-- smooth scroll; optional -->
<script src="js/motion-kit/motion-core.js"></script>
<script src="js/motion-kit/effects/text.js"></script>
<script src="js/motion-kit/effects/media.js"></script>
<script src="js/motion-kit/effects/scroll.js"></script>
<script>
  MK.init({ preset: 'editorial', anchorOffset: '.site-header' });
  MK.start();
</script>
```
If the project already ships GSAP or Lenis, reuse those copies (GSAP ≥ 3.12; SplitText needs 3.13+). Vendor the
files locally instead of using the CDN when the site must work offline or under a CSP.

**React / Next.js.** Follow `references/react-next.md`. It covers an `init.ts` module, the head snippet in the
layout, `<MotionScope>` (the same `data-mk` attributes in JSX), and the `useMotion()` hook.

### Step 5 · Apply the effects
For each chosen effect, open its entry in `references/catalog.md` and follow the **markup contract** exactly
(attribute names, the required children such as `data-mk-track`, `data-mk-step`, `data-mk-media`, and any heights).
Add only the layout CSS the entry asks for. The kit's CSS handles the rest. Rules:
- **One owner per transform.** If an element needs two effects that both move it (an entrance plus magnetic, or an
  entrance plus parallax), put one of them on a wrapper. Never put CSS `transition: transform` on an element a
  `data-mk` effect animates.
- **Text effects go on text blocks** (h1–h6, p, span), one per element, never on flex or grid containers.
- **Final content goes in the HTML.** Effects only animate it. Every image gets `width`/`height` (or an
  aspect-ratio box).
- **Pinned sections** get a viewport height, no `overflow:hidden` or `transform` on their ancestors, and are never
  nested.
- **Sequence a hero** with `data-mk-on="load"` (or `"intro"`) and `data-mk-delay` (0, .1, .2…), not with timeouts.
- **Accessibility pieces:** marquees get a `[data-mk-marquee-toggle]` button; dark sections get
  `data-mk-theme="dark"` when `nav-state` is used; overlays and menus use `MK.lock()`/`MK.unlock()` and
  `data-lenis-prevent` on scrollable panels.
- **Something not in the catalog:** write a custom effect (template below) instead of loose GSAP code, so it gets
  reduced motion, cleanup and the shared clock for free.

### Step 6 · Verify. Don't skip this
Run `references/pitfalls.md` → "Verification protocol". At minimum:
1. No console errors. `MK.inspect().filter(x => x.unknown.length || !x.ready)` returns `[]`.
2. Scroll the whole page down and back up. Nothing stays hidden, flashes or jumps, and pins hand over cleanly
   (`?mk-debug` shows markers).
3. `?mk-reduce`: all content is visible, with no pins, no smooth scroll and no intro.
4. At 375 px wide: no horizontal overflow, touch scrolling works over carousels, hover-only effects are absent.
5. Keyboard: focus is visible, nothing focusable is invisible, and Esc closes overlays.

If you have a browser tool: a hidden preview pane pauses `requestAnimationFrame`. Use the tick helper in
pitfalls.md, and emulate a real viewport size; a 0×0 pane breaks measurements. Fix what you find, then re-run the
checks.

### Step 7 · Report
Give the user a table (section → effects → what the visitor sees → how to tune it, e.g.
`data-mk-duration="1.4"` or `MK.init({ preset })`). Add how to preview the reduced-motion version (`?mk-reduce`),
anything you couldn't verify, and the manual checks that remain (real devices, final photography).

---

## API essentials

```js
MK.init({ preset, tokens, smooth, lenis, anchors, anchorOffset, breakpoint, reduced, fontTimeout, debug })
MK.start(root?)           // scan [data-mk] and apply; returns a Promise. MK.stop(root) reverts it
                          // safe to call again: running effects are skipped, so it only picks up new content
MK.apply(el, 'name' | ['a','b'], { option: value })   // one element; returns a revert function (React)
                          // an effect never runs twice on one element: the first start()/apply() keeps it
MK.effect(name, setup, { reduced: fn | 'same', intro: bool })   // register a custom effect
MK.t                      // active tokens: ease.out|text|inOut|in|soft|pop|elastic, dur.xs…xl, stagger.*, rise, start
MK.scrollTo(target, { offset, duration, focus })   MK.lock() / MK.unlock()   MK.refresh()
MK.advance(st, points, { duration, ease })   // pinned scene: one wheel notch / swipe glides to the next stop (Lenis)
MK.velocity()             // smoothed scroll speed px/s      MK.damp(a, b, rate, dt)  // frame-rate independent
MK.confetti(x, y, opts)   // with ui.js                       MK.introDone() / MK.whenIntro()
Events: mk:intro-done (document) · mk:landed (cart) · mk:reveal (dispatch inside a nav-hide header to show it) · mk:orbit · mk:stamp
URL flags: ?mk-reduce  ?mk-motion  ?mk-debug
```
Common attributes on every entrance effect: `data-mk-on` (scroll|load|intro) · `data-mk-start` · `data-mk-delay` ·
`data-mk-replay` · `data-mk-duration` · `data-mk-ease` (token or GSAP ease) · `data-mk-stagger`.

### Custom effect template
```js
MK.effect('my-effect', function (el, o) {
  // o.opt('speed', 60) reads data-mk-speed · o.t tokens · o.is.{motion,desktop,mobile,hover,touch}
  // o.reveal(targets, from, to) = the standard entrance (scroll/load/intro + focus safety)
  // o.on(target, type, fn) and o.loop(fn, { el }) clean themselves up · o.own(nodes) restores inline styles
  const items = o.qa('.item');
  o.reveal(items, { opacity: 0, y: o.t.rise }, { opacity: 1, y: 0, duration: o.dur('m'), ease: o.ease('out'), stagger: o.t.stagger.items });
}, { reduced: null });   // null: nothing runs and the content stays static under reduced motion
```
Everything GSAP creates synchronously inside a setup is reverted automatically when the breakpoint or the
reduced-motion preference changes, and then the setup runs again.

## Rules distilled from the six audits (details in pitfalls.md)
1. Content is visible without JS, without motion, and when the CDN fails. Motion is an enhancement.
2. Reduced motion is honoured live. Never read the media query once, and never hand-roll a broken query.
3. Interactive elements are never hidden from keyboard or screen-reader users while they wait for a reveal.
4. One owner per transform. Never put CSS transitions on GSAP-animated properties.
5. ScrollTriggers are created and refreshed in page order (document order, not measured position), and refreshed
   after fonts, images and pins settle.
6. Every image that moves inside a frame has overscan. Every scrubbed tween that starts from a value something else
   also changes uses `fromTo`.
7. Loops pause off-screen and stop when settled. Smoothing is frame-rate independent.
8. Auto-moving content has a pause control. Hover-only features have focus equivalents.
9. Budget per page: one intro, ≤ 4 pins, one heavy canvas or blur effect in view.
10. Verify on a real viewport, in reduced-motion mode, and at 375 px before saying it's done.

## Reference map
| Need | Read |
|---|---|
| Markup contract, options and cost of an effect | `references/catalog.md` (jump to its ID) |
| Which effects to offer per section type, question templates, fallback menu | `references/section-playbook.md` |
| Presets: feel, tokens, signature combos, density | `references/presets.md` |
| Checklist and verification protocol | `references/pitfalls.md` |
| React / Next.js setup | `references/react-next.md` |
| CSS-only hovers and details (K1–K11) | `references/css-snippets.md` |
| WebGL/canvas showpieces (fire type, 3D objects, cloth, smear…) | `references/advanced.md` |
| Working markup for every effect | `assets/showroom/index.html` |
| TypeScript types | `assets/motion-core.d.ts`, `assets/effects/*.d.ts` |
