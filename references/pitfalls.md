# Pitfalls checklist & verification protocol

Every rule below comes from a real bug found while auditing the six source sites (site named in brackets).
motion-kit already handles the ones marked ✅; the rest are things **your markup/CSS/custom code** must respect.
Run the checklist before reporting the work as done.

## A · Setup
- [ ] The **head snippet** is inline in `<head>` before CSS. Without it the no-flash rules never apply, and with a
  typo every `data-mk` element stays hidden for 4 s (until the failsafe). ✅ failsafe shows content if MK never starts.
- [ ] Script order: GSAP → ScrollTrigger → (SplitText, CustomEase) → Lenis → `motion-core.js` → `effects/*.js` →
  your `MK.init(); MK.start();`. Load scripts with `defer` or at the end of `<body>`.
- [ ] Pin library versions (GSAP **3.13.0**, Lenis **1.3.4** recommended). Vendor them locally when the site must
  work offline or under a strict CSP; a CDN failure must not break the page [Fizzy Fjord, Solenne]. ✅ if GSAP is
  missing, MK shows all content without motion.
- [ ] `MK.init()` once, `MK.start()` once per page (or `MK.apply()` per component). ✅ Calling either again never
  doubles an effect: the first `start()`/`apply()` keeps it, and a later `start(root)` only picks up new content.
  To rebuild a section after editing its attributes, `MK.stop(root)` + `MK.start(root)` on the **same root** the
  original `start()` used. `stop(section)` doesn't revert what a page-wide `start()` applied.
- [ ] Every `data-mk` name exists (`MK.inspect().filter(x => x.unknown.length)` must be empty) — i.e. its effects
  file is loaded.

## B · Reduced motion & accessibility
- [ ] Never read `prefers-reduced-motion` yourself. ✅ MK follows it live (gsap.matchMedia) and reverts everything when
  it changes [all six read it once]. Test with `?mk-reduce`.
- [ ] Don't "fix" reduced motion with a broken query — [Oval] shipped `(prefers-reduced-motion: reduce) and (update: none)`,
  which is always false.
- [ ] Content must exist in the HTML in its final state. Effects only animate it in. Never inject essential text with JS.
- [ ] Don't hide interactive content with `visibility`/`autoAlpha` while waiting for a scroll reveal: keyboard and screen
  readers lose it [Oval]. ✅ entrance effects use opacity and reveal instantly on focus.
- [ ] Split text keeps an accessible name. ✅ (SplitText aria + a fixed label for `<br>`; fallback uses a visually
  hidden copy). Don't put two text effects on one element.
- [ ] Auto-moving content (marquee, ticker, carousel autoplay) needs a pause control (WCAG 2.2.2) [Oval, Ember, nova].
  ✅ marquee supports `[data-mk-marquee-toggle]` — add the button.
- [ ] Hover-only affordances need focus equivalents (`:focus-visible` styles). Don't trigger navigation on hover
  dwell [nova "hover 0.9 s scrolls the page"].
- [ ] Modals/menus: move focus in, trap or return it, close on Esc, lock scroll with `MK.lock()`/`MK.unlock()`, and put
  `data-lenis-prevent` on any scrollable panel [Dewpoint panel could not be scrolled]. ✅ lightbox does all of this.
- [ ] Don't hide the native cursor by default; if you must, only for `(hover:hover) and (pointer:fine)` [Dewpoint hybrid
  devices lost the cursor]. ✅ `data-mk-hide-native` is scoped that way.
- [ ] Dimmed inactive rows (`opacity:.35`) can fail contrast; keep ≥ .45 or dim decoration, not text [Oval].
- [ ] Anchor jumps move keyboard focus to the target. ✅ core anchor handler does [Solenne didn't].

## C · Transforms: one owner per property
- [ ] **Never put a CSS `transition` on `transform` (or `opacity`) of an element GSAP animates.** The CSS transition
  re-animates every GSAP frame: reveals lag and smear, hover scales stop working [Solenne `.btn-sun`, Fizzy sticker].
  Hover transforms belong on a child or a wrapper.
- [ ] One effect owns an element's `x/y/scale`. Combine effects by **wrapping**: magnetic on a wrapper around a
  revealing button [nova]; hero-exit `data-mk-exit` on a wrapper around revealing text; pointer parallax on `x` only
  while scroll parallax owns `y` [nova hero].
- [ ] `parallax` + `velocity-skew`/zoom on the same `<img>` → put one on a wrapper. ✅ clip-reveal skips its zoom when
  the image has parallax.
- [ ] Don't animate the element you use as a ScrollTrigger trigger by large `y` offsets; trigger on a parent or compensate
  (`start: 'top-=110 88%'`) [Oval cards fired 110 px late]. ✅ stagger-up / card-rise compensate.
- [ ] Scrubbed tweens that start from a value another tween is also changing must use explicit `fromTo` +
  `immediateRender:false` [nova hero glow lost forever when scrolled early].
- [ ] Don't use relative values (`'-=30'`) in tweens with `invalidateOnRefresh` — they compound on every refresh.

## D · ScrollTrigger & pins
- [ ] Create ScrollTriggers in page order, or call `MK.refresh()` (sorts) after building them out of order [Dewpoint
  titles fired 3600 px early because they were created before a pin above them]. ✅ `MK.start()` scans in DOM order
  and refreshes sorted.
- [ ] Pinned sections: give them a height (`100vh`/`min-height`), no `overflow:hidden` / `transform` / `contain` on
  ancestors, and don't nest pins.
- [ ] Recompute layout-dependent values in function-based tweens with `invalidateOnRefresh: true`, and re-measure in
  `refreshInit` listeners — remove the listener on cleanup [Oval CTA, Dewpoint accordion].
- [ ] Snapping: snap to **labels** and aim buttons with `labelToScroll()` [Oval dots landed off-label]. ✅ pin-steps.
- [ ] Refresh after late layout changes (fonts, images without dimensions). ✅ MK refreshes on load, fonts.ready and
  body-height changes (debounced) — always set `width`/`height` on `<img>` anyway.
- [ ] Inside a pinned horizontal track, child triggers need `containerAnimation` and the track tween `ease:'none'`.
  ✅ automatic for `data-mk` children of `horizontal`.
- [ ] Don't use `lenis.scrollTo` while Lenis is stopped (it is ignored) — unlock first. ✅ core anchors unlock.

## E · Text splitting
- [ ] Split **after fonts load** (✅ `MK.start` waits up to 2.5 s) or line breaks are computed with fallback metrics
  [Oval hero text flashed, Solenne].
- [ ] Apply line effects to text blocks, not to flex/grid containers or `<li>` with flex layout [Solenne `.walks li`
  jumped when the split reverted].
- [ ] Masks clip descenders/italics — keep the kit's `.mk-mask*` padding rules, don't override `overflow` on them.
- [ ] For 3D letter flips put perspective on the animated element (`transformPerspective`), not on a grandparent
  [Solenne's flips rendered flat]. ✅ char-flip.

## F · Images & media
- [ ] Parallax needs overscan; never move an image inside a frame without it [nova gallery showed a 32 px strip].
  ✅ `parallax` scales automatically; give `data-mk-h-parallax` images `width:118%; margin-left:-9%`.
- [ ] Upscaled images (zoom 1.15–1.4, parallax) need source resolution ≥ 1.4× their display size, or use `srcset`.
- [ ] Preload/lazy logic must point at files that exist [nova preloaded 404s, so the intro opened onto blank plates].
- [ ] `loading="lazy"` images inside a pin all count as visible at once; load them a screen early (pin-crossfade
  `data-src`) [nova film].

## G · Performance
- [ ] Animate `transform`, `opacity`, `clip-path`; avoid animating `width/height/top/left/padding/letter-spacing` per
  frame [nova viewer & padding, Ember buttons, Fizzy accordion]. Accepted exceptions: lightbox box (single fixed
  element), scroll-accordion/flex-accordion heights (≤ 6 items).
- [ ] Big `filter: blur()` on large text or many images is expensive: one focus-in/letter-drop per view, orbit ≤ 9 items.
- [ ] Don't leave `will-change` on dozens of elements permanently [nova, Oval, Solenne]. The kit only sets it on the
  few elements that move continuously.
- [ ] Every rAF/ticker loop must pause off-screen and stop when settled [Ember ran 6 perpetual loops; Fizzy pendulum never
  slept]. ✅ `o.loop(fn, { el })` pauses off-screen; use it in custom effects.
- [ ] Use frame-rate independent smoothing (`MK.damp(a, b, rate, dt)`), not `lerp(a, b, .1)` per frame — the latter runs
  twice as fast on 120 Hz screens [Ember, Fizzy, nova cursor].
- [ ] Scroll velocity: use `MK.velocity()` (px/s, decays to 0) rather than per-frame deltas [nova skew stuck, Dewpoint ribbon
  ×36 bug].
- [ ] Canvas: cap DPR at 1.5–2, debounce resize, stop the loop when idle, dispose WebGL resources on teardown.
- [ ] Limit: one intro, one heavy canvas/WebGL effect, ≤ 4 pinned scenes per page.
- [ ] Scroll-scrubbed films: frame sequences on a canvas (M9) are the predictable choice on iPhone; `<video>` scrubbing
  needs a Blob source, one seek in flight, a short keyframe interval and iOS priming (M9 video mode does all four).
  Keep 60–120 frames per scene, 2–6 MB, load coarse-to-fine starting a screen early, cap DPR at 1.5 on phones, and
  render a **native 9:16** set for phones instead of cropping the 16:9 film. Never wait on `img.decode()` before
  drawing: it can stall in a background tab and freeze the loader. ✅ frame-scrub.
- [ ] Idle loop videos: muted + playsinline + loop, lazy `data-src`, play only while on screen and the tab is visible,
  retry on the first touch when autoplay is refused, never `autoplay` in the markup (it ignores reduced motion).
  Set `defaultPlaybackRate` as well as `playbackRate`: `load()` resets the rate. ✅ loop-video.
- [ ] Anything scaled past its section (a pushed-in hero, a ribbon that bleeds, a zoomed layer) needs a clipping
  parent, or the page gains a sideways scroll that phones let visitors pan into. Check `scrollWidth` against
  `clientWidth` at the end of the page, after every scrubbed effect has run. ✅ hero-exit clips itself.
- [ ] Captions that share one spot switch out first, then in; a simultaneous cross-fade overlaps two texts for
  most of a second. ✅ pin-crossfade, camera-path.
- [ ] `MK.scrollTo(…, { immediate: true })` must go through Lenis when Lenis is on, or Lenis drags the page back
  to its old position on the next frame. ✅ core.
- [ ] A pinned stage is one grid cell: give it `grid-template-columns: minmax(0, 1fr)`, or one wide child (a glow,
  a nowrap label) stretches the stage past the screen and every %-placed item lands off-screen on phones.
  ✅ burst-collapse.
- [ ] Never animate in a frame whose image has not arrived: wait for `img.decode()` or show a colour/blurred placeholder,
  preload before the interaction (not on it), and give each swappable image its own layer so a swap never shows a
  blank frame [kit's own first hover-preview opened as an empty cream disc]. ✅ hover-preview.

## H · Mobile & touch
- [ ] Hover effects check the pointer (`o.is.hover`); never show cursor followers/previews on touch [Ember ran them anyway].
- [ ] Drag surfaces use `touch-action: pan-y` and abandon on vertical intent so the page still scrolls [Dewpoint smear
  trapped scrolling]. ✅ drag-carousel, pendulum.
- [ ] Handle `pointercancel` [Fizzy drags could stick]. ✅
- [ ] Rebuilds on breakpoint change must not replay intros or lose state [Fizzy candies vanished after rotating].
  ✅ MK reverts and rebuilds via matchMedia; intros never replay.
- [ ] Test 375 px: long words in display type, pinned scenes ≤ ~3 viewports of scroll each.

## I · Frameworks (React/Next)
- [ ] Every effect is created inside `useGSAP`/`MK.apply` and reverted on unmount; no global `MK.start()` in components.
- [ ] Client-only: `'use client'`, no window access at module top level. ✅ core is SSR-safe.
- [ ] On route change: `MK.refresh()`, scroll to top with `MK.lenis?.scrollTo(0, { immediate: true })`.
- [ ] See `references/react-next.md`.

---

## Verification protocol (run it, report the results)

1. **Load** the page (http server — not `file://` if modules/fonts are involved). Console must be clean.
2. **Inventory**: in the console
   ```js
   MK.inspect().filter(x => x.unknown.length || !x.ready)   // → []
   ScrollTrigger.getAll().filter(t => t.pin).map(t => [t.trigger, Math.round(t.start), Math.round(t.end)])
   ```
3. **Scroll the whole page down and back up** (slowly and fast). Nothing may stay hidden, jump, or flash. Check pins hand
   over without gaps (`?mk-debug` shows markers).
4. **Reduced motion**: reload with `?mk-reduce` (or OS setting). Everything visible and readable, no pins, no smooth
   scroll, horizontal tracks scroll natively, intros absent.
5. **Mobile** (375×812 and a tablet width): no horizontal page overflow, touch scroll works over carousels, hover-only
   effects absent.
6. **Keyboard**: Tab through the page; focus is visible, nothing focusable is invisible, Esc closes overlays.
7. **Resize** across the 768 px breakpoint and back: no errors, no replayed intro.
8. **No-JS sanity** (optional): disable JS → content visible (head snippet only adds classes when JS runs).

Automated helper for a browser tool (hidden panes pause requestAnimationFrame — tick GSAP manually):
```js
const advance = async ms => { const end = performance.now() + ms; while (performance.now() < end) { await new Promise(r => setTimeout(r, 30)); gsap.ticker.tick(); } };
const go = async (y, ms = 300) => { MK.lenis ? MK.lenis.scrollTo(y, { immediate: true, force: true }) : scrollTo(0, y); ScrollTrigger.update(); await advance(ms); };
const errs = []; addEventListener('error', e => errs.push(e.message));
for (let y = 0, max = ScrollTrigger.maxScroll(window); y <= max; y += 400) await go(y, 120);
errs;   // → []
```
