# Effect catalog

Every effect is applied with `data-mk="<name>"` and configured with `data-mk-<option>` attributes
(camelCase options become kebab-case attributes: `endRx` → `data-mk-end-rx`). Several effects can share
one element: `data-mk="clip-reveal lightbox"`. Effects live in `assets/effects/*.js`; structural CSS for
all of them is in `assets/motion-kit.css`. A live demo of every entry is in `assets/showroom/index.html`.

**Read only the sections you need.** Each entry: what the visitor sees · best for · markup contract ·
options · cost · reduced-motion behaviour. Defaults come from the active preset (`references/presets.md`).

## Contents
- [Common options](#common-options-every-entrance-effect)
- [T · Text](#t--text-effectstextjs) — T1 line-rise … T13 wordmark-rise
- [M · Media](#m--media-effectsmediajs) — M1 clip-reveal … M8 lightbox
- [S · Scroll set pieces](#s--scroll-set-pieces-effectsscrolljs) — S1 hero-exit … S14 cloud-curtain
- [C · Collections](#c--collections-effectscollectionsjs) — C1 stagger-up … C9 rating
- [U · UI & micro-interactions](#u--ui--micro-interactions-effectsuijs) — U1 nav-hide … U12 follow-sticker
- [I · Intros](#i--intros-effectsintrojs) — I1 intro-window … I4 intro-curtain
- [K · CSS-only snippets](#k--css-only-snippets) → `references/css-snippets.md`
- [A · Advanced blueprints](#a--advanced-webglcanvas-blueprints) → `references/advanced.md`

Cost legend: **low** = transform/opacity only · **med** = clip-path/filter or many elements ·
**high** = per-frame layout, big blur/filters, canvas or pinned scrub with heavy layers.

---

## Common options (every entrance effect)

Entrance effects are the ones that start hidden and animate in: T1–T5, T7 (non-scrub), T8, T9, T11,
T13 (non-scrub), M1, M3, C1, C9.

| Attribute | Values | Default | Meaning |
|---|---|---|---|
| `data-mk-on` | `scroll` · `load` · `intro` | `scroll` | When it plays. `intro` waits for an intro effect (I1–I4) to call `MK.introDone()`; without an intro it behaves like `load`. |
| `data-mk-start` | ScrollTrigger start | preset (`top 85%`…) | Where the scroll reveal fires. |
| `data-mk-delay` | seconds | `0` | Extra delay (sequence hero items with 0, .1, .2…). |
| `data-mk-replay` | `true` / `false` | preset | Replay when the element comes back. Resets only once it is fully below the viewport, so it never vanishes in view. |
| `data-mk-duration` | seconds or token `xs s m l xl` | per effect | |
| `data-mk-ease` | token `out text inOut in soft pop elastic` or any GSAP ease | per effect | |
| `data-mk-stagger` | seconds | preset | |

Focus safety is automatic: if keyboard focus lands inside a not-yet-revealed element, it is shown at once.

---

## T · Text (`effects/text.js`)

Apply text effects to **text blocks** (h1–h6, p, span, blockquote), not to flex/grid containers.
Use **one text effect per element**. Splitting waits for web fonts. With GSAP SplitText 3.13+ loaded
you get true line masks; without it a built-in splitter is used (it keeps `<em>`, `<a>` and their listeners).

### T1 · line-rise — masked line rise
*Origin: Oval, Solenne, nova.* Each visual line slides up out of its own mask, top line first.
Best for: hero headlines, section titles, short paragraphs.
```html
<h2 data-mk="line-rise">Everything the evening wants.</h2>
```
Options: `distance` (110, yPercent) · `duration` (l) · `ease` (text) · `stagger` (lines) · `unsplit` (true — restores the
original markup after a one-time reveal). Cost: low. Reduced: static text.

### T2 · word-rise — masked word rise
*Origin: Ember.* Every word rises from its own small mask. Best for: punchy 2–8 word headings.
```html
<h2 data-mk="word-rise">Still crackling.</h2>
```
Options: `distance` · `duration` · `ease` · `stagger` (words) · `unsplit`. Cost: low.

### T3 · char-flip — character flip / hinge
*Origin: Solenne.* `axis="y"` (default): letters turn in edge-on while rising. `axis="x"`: letters hinge up from
lying flat while sliding in from the right. Best for: wordmarks, one-word titles, display caps.
```html
<h1 data-mk="char-flip">SOLENNE</h1>
<h2 data-mk="char-flip" data-mk-axis="x">Reasons</h2>
```
Options: `axis` (y|x) · `perspective` (600) · `slide` (0.6 × 10vw, axis x) · `duration` · `ease` · `stagger` · `unsplit`.
Cost: low–med (many chars). Keep under ~30 characters.

### T4 · blur-rise — rise out of a blur
*Origin: Fizzy Fjord hero.* Lines (or words) rise 40% while un-blurring. Best for: playful or dreamy hero lines.
```html
<h1 data-mk="blur-rise" data-mk-on="load">Welcome to the kingdom</h1>
```
Options: `by` (lines|words) · `distance` (40) · `blur` (10px) · `duration` · `ease` · `stagger`. Cost: med (filter).

### T5 · focus-in — scale-down focus
*Origin: Dewpoint ritual.* Words shrink from 2× while blur clears. Best for: 2–5 word statements only.
```html
<h2 data-mk="focus-in">Less routine. More skin.</h2>
```
Options: `scale` (2) · `blur` (8) · `duration` · `ease` · `stagger`. Cost: med–high (big blurred text) — once per page.

### T6 · scroll-fill — words light up while reading
*Origin: nova, Ember manifesto.* Words start dim (15%) and reach full ink in reading order as you scroll.
Best for: manifesto/statement paragraphs (20–60 words).
```html
<p class="manifesto" data-mk="scroll-fill">We cook over fire because nothing else tastes like it…</p>
```
Options: `from` (0.15) · `start` (`top 85%`) · `end` (`+=90%`) · `scrub` (0.5). Cost: low. Reduced: full ink.

### T7 · letter-drop — letters fall into place
*Origin: Fizzy Fjord kingdom.* Letters fall from above in random order out of a blur, scrubbed by scroll.
With `data-mk-fizz` (and `effects/ui.js` loaded) each landing letter sparks confetti.
```html
<h2 data-mk="letter-drop" data-mk-fizz>Kingdom</h2>
<!-- pinned variant: the closest <section> pins for 200% -->
<h2 data-mk="letter-drop" data-mk-pin data-mk-length="250">Welcome</h2>
```
Options: `scrub` (true; `false` = plays once) · `pin` · `length` (200 %) · `start`/`end` · `distance` (55) · `blur` · `fizz`.
Cost: med (blur on each letter). Best under ~25 letters.

### T8 · write-on — the line writes itself
*Origin: Solenne italic accents.* A clip wipe reveals the text left→right (2.4 s). Best for: italic/script accents.
```html
<em data-mk="write-on">stay for lunch</em>
```
Options: `direction` (ltr|rtl) · `fade` (true) · `duration` (xl) · `ease`. Cost: low.

### T9 · count-up — numbers count up
*Origin: Ember stats, Oval rating.* Reads the final number from the text itself (prefix/suffix kept, `,` grouping
kept, decimals inferred). Screen readers always get the final value.
```html
<b data-mk="count-up">900°</b>  <b data-mk="count-up">1.2M</b>  <b data-mk="count-up" data-mk-pad="2">07</b>
```
Options: `to` · `from` (0) · `decimals` · `pad` · `group` · `duration` (xl) · `ease`. Cost: low.

### T10 · word-cycle — rotating words
*Origin: Ember live ticker.* Words slide up through a mask that resizes to the next word. Pauses off-screen.
The mask re-measures on every refresh (resize, layout change) and when late web fonts arrive, so fluid font sizes
(`clamp()`/`vw`) stay snug.
```html
On the grill: <span data-mk="word-cycle" data-mk-words="Firecracker Chicken|Smoked Brisket Bun|Corn">Firecracker Chicken</span>
```
Options: `words` (`A|B|C`) · `interval` (3.2 s). Cost: low. Reduced: first word, static.
A11y: screen readers hear the whole list once. Don't use for essential information.

### T11 · rule-draw — hairline draws in
*Origin: Oval benefit rows, nova steps.* A line scales in from its origin.
```html
<hr class="rule" data-mk="rule-draw">
```
Options: `axis` (x|y) · `origin` · `duration` (l) · `ease` (inOut). Cost: low.

### T12 · text-path — text crawls along a ribbon
*Origin: Dewpoint ribbon hero.* Repeating text runs along an SVG path at `speed` px/s, faster with scroll speed,
reversing on fast scroll-up. Optional draw-on of the stroked path. Runs only while visible.
```html
<svg class="ribbon" viewBox="0 0 1200 380" data-mk="text-path" data-mk-text="BARRIER FIRST · LESS ROUTINE ·" data-mk-draw>
  <path id="ribbon" d="M-80 130 C 200 30, 360 340, 600 300 S 1010 50, 1280 140" fill="none" stroke="#f7b6e8" stroke-width="72" stroke-linecap="round"/>
</svg>
```
Style the text through the SVG: `.ribbon { font: 800 34px system-ui; color: #3a2340; }` (size in SVG units).
Options: `text` · `speed` (60) · `boost` (0.3 × scroll px/s) · `direction` (-1|1) · `size` · `draw` · `on` (for the draw, default load).
Cost: med. Reduced: static text on the path.

### T13 · wordmark-rise — giant footer wordmark
*Origin: Oval footer, Fizzy Fjord footer.* Letters climb out of per-letter masks, scrubbed so the last one lands
at the end of the page. `data-mk-fit` sizes the word to the full container width (re-fits on resize).
```html
<footer><div class="wordmark" data-mk="wordmark-rise" data-mk-fit>oval</div></footer>
```
Options: `fit` · `scrub` (0.6; `false` = plays once) · `trigger` (default closest `<footer>`) · `start` (`top bottom`) ·
`end` (`clamp(bottom bottom)`). Cost: low.

---

## M · Media (`effects/media.js`)

### M1 · clip-reveal — frame wipes open
*Origin: nova gallery & residences, Oval range, Dewpoint ritual.* The frame opens from an edge, the centre or a
circle; the image inside settles from a 1.15 zoom. Rounded corners are preserved during the wipe.
```html
<div class="frame" data-mk="clip-reveal" data-mk-from="left"><img src="…" alt="…"></div>
<!-- scroll-linked (scrubbed) opening from the centre -->
<div class="frame wide" data-mk="clip-reveal" data-mk-from="center" data-mk-scrub><img …></div>
```
Options: `from` (bottom|top|left|right|center|circle) · `at` (circle centre, `50% 50%`) · `radius` (75) · `zoom` (1.15; 1 = off) ·
`scrub` (+`start` `top bottom`, `end` `center center`) · `duration` (l) · `ease` (inOut) · common.
The frame needs `overflow:hidden` and the image `width/height:100%; object-fit:cover`. Cost: med (clip-path).
If the inner image has `parallax`, the zoom is skipped (parallax owns the image transform).

### M2 · parallax — image drifts inside a still frame
*Origin: nova `data-inner`, Solenne `data-par`.* Put it on the **image**; its parent is the frame. Overscan is
automatic (the image scales just enough that no edge ever shows — tested at scroll extremes).
```html
<div class="frame tall"><img data-mk="parallax" data-mk-amount="0.12" src="…" alt="…"></div>
```
Options: `amount` (0.1 = ±10% of height; keep ≤ .15 for sharpness) · `direction` (1|-1) · `frame` (selector) · `start`/`end` · `scrub`.
Cost: low. Works inside S7 horizontal tracks automatically.

### M3 · settle — grows/settles into place
*Origin: Solenne hero image, Dewpoint product.* Scale from `from` (0.75) to 1, optionally fading.
```html
<img data-mk="settle" data-mk-on="intro" data-mk-from="0.8" src="…" alt="">
```
Options: `from` · `fade` · `origin` (`50% 0%`) · `duration` · `ease` (inOut) · common. Cost: low.

### M4 · window-grow — oval window opens into the frame (pinned)
*Origin: Oval CTA.* A small oval window into a photo, outlined by a ring, grows into the full frame; the ring
fades, the photo de-zooms, `[data-mk-after]` content rises in. Pinned for 110%.
```html
<section class="cta" data-mk="window-grow" data-mk-ring-color="#245C3E" style="height:100vh">
  <div data-mk-window><img src="party.jpg" alt=""></div>
  <div class="cta-copy" data-mk-after><h2>Raise a zero.</h2></div>
</section>
```
Options: `rx`/`ry` (18/30 %) · `mobileRx`/`mobileRy` (28/34) · `endRx`/`endRy` (75/80) · `zoom` (1.3) · `ring` (true) ·
`ringColor` · `ringWidth` (14px) · `length` (110 %). Cost: med. Reduced: the photo is simply full-frame.

### M5 · grow-inline — inline thumbnail grows to full screen (pinned)
*Origin: Solenne "Four [image] houses".* A thumbnail between two words grows until it covers the viewport while
the words ride its edges. Pinned for one viewport of scroll.
```html
<section data-mk="grow-inline">
  <h2 class="display"><span data-mk-left>Four</span><span data-mk-media><img src="…" alt=""></span><span data-mk-right>houses</span></h2>
</section>
```
Keep the heading on one line (`white-space:nowrap`). Options: `size` (0.05 × width) · `mobileSize` (0.2) · `aspect` (0.5625 h/w) ·
`length` (1 viewport) · `hold` (0.2). Cost: med. Reduced: a small inline thumbnail.

### M6 · zoom-through — dive through a shape (pinned)
*Origin: Oval "dive through the zero".* A colour field with a shaped hole (default: a heavy "0") zooms
exponentially (constant perceived speed) until you are inside the photo; corner marks fly out; then
`[data-mk-after]` copy rises. Pinned for 340%.
```html
<section data-mk="zoom-through" data-mk-color="#E4F76B" data-mk-ring-color="#245C3E">
  <div data-mk-scene><img src="…" alt=""></div>
  <div data-mk-marks><span class="mark tl">N°0 — zero proof</span></div>
  <div class="copy-card" data-mk-after>…</div>
</section>
```
Options: `shape` (zero|ellipse|circle) · `color` · `ringColor` · `length` (340 %). Position `[data-mk-after]` yourself
(absolute). Cost: med–high (SVG path redraw per frame). One per page. Reduced: plain photo + copy.

### M7 · velocity-skew — images lean with scroll speed
*Origin: nova.* `skewY` follows smoothed scroll velocity and returns to exactly 0 at rest.
```html
<img data-mk="velocity-skew" src="…" alt="">
```
Options: `max` (1.1°) · `factor` (260 px/s per degree). Cost: low. Don't combine with M2 on the same element.

### M8 · lightbox — expand to a centred view
*Origin: nova viewer.* Click → the picture expands from its exact position to fit the screen; Esc, backdrop or
the close button collapse it back. Scroll locked, focus moved to Close and restored afterwards.
```html
<a href="large.jpg" data-mk="lightbox clip-reveal" data-mk-caption="Pacific House"><img src="thumb.jpg" alt="Pacific House"></a>
```
Options: `src` (else `href`, else the img) · `caption`. Non-link elements get `role=button` + Enter/Space.
Cost: low. Reduced: opens instantly.

---

## S · Scroll set pieces (`effects/scroll.js`)

Pinned effects pin **their own element** (no tall wrapper needed). Give pinned sections a viewport height
(`height:100vh`/`min-height:100vh`) and avoid `overflow:hidden` on their ancestors. Create them in page order
(they are, when you use `data-mk`). Use at most 3–4 pinned pieces per page.

### S1 · hero-exit — hero parts as it scrolls away
*Origin: nova, Solenne, Ember, Fizzy Fjord.* Over the hero's own height: `[data-mk-depth]` layers move up by
`depth × viewport` (negative = down), `[data-mk-exit]` lifts 12vh and fades, `[data-mk-push]` scales to 1.25.
The hero must start at the top of the page.
```html
<header class="hero" data-mk="hero-exit">
  <div class="bg" data-mk-push><img …></div>
  <h1 class="mark" data-mk-depth="0.26">NOVA</h1>
  <div class="copy" data-mk-exit><h2 data-mk="line-rise" data-mk-on="intro">…</h2></div>
</header>
```
Put `data-mk-exit` on a **wrapper**, so entrance effects inside keep their own transforms.
Options: `scrub` (true) · `lift` (0.12) · `exitAt` (0.6) · `push` (1.25). Cost: low–med.

### S2 · drift — decorative element slides against the scroll
*Origin: Solenne flowers, nova section heads.* Range defaults to the closest section.
```html
<img class="flower" data-mk="drift" data-mk-from="-10" data-mk-to="10" src="…" alt="">
```
Options: `from`/`to` (-10/10) · `axis` (y|x) · `unit` (% | px) · `trigger` · `start`/`end` · `scrub` (0.5). Cost: low.

### S3 · depth-layers — multi-plane parallax scene
*Origin: nova depth scene.* Children move at `travel × depth` yPercent (positive = nearer, moves up faster) and
sway sideways with the pointer. Optional pin.
```html
<section class="depth" data-mk="depth-layers" data-mk-travel="22">
  <img class="far" data-mk-depth="-0.4" …>  <h2 data-mk-depth="2.4">Desert</h2>  <img class="near" data-mk-depth="1.4" …>
</section>
```
Give layers bleed (inset −8%) so edges never show. Options: `travel` (20) · `pin` (0 = none, else % length) · `scrub` (0.6) ·
`pointer` (true) · `sway` (18px). Cost: med.

### S4 · pin-crossfade — pinned film of frames
*Origin: nova "The film".* The section pins; frames crossfade by progress, captions swap, a bar fills.
Frames with `data-src` load one screen before the pin.
```html
<section class="film" data-mk="pin-crossfade" style="height:100vh">
  <div class="frames" data-mk-frames style="position:absolute;inset:0">
    <img data-mk-frame src="1.jpg" alt=""> <img data-mk-frame data-src="2.jpg" alt=""> …
  </div>
  <div class="caps" data-mk-captions><p data-mk-caption>01 Arrival</p><p data-mk-caption>02 Courtyard</p>…</div>
  <i class="bar" data-mk-bar></i>
</section>
```
Options: `per` (90 % scroll per frame). Cost: low.

### S5 · pin-steps — pinned stepped story with snap
*Origin: Oval ritual.* Desktop: steps stack in one place; each new photo wipes up over the last, text swaps, a
rail fills, scroll snaps to steps, dots jump to a step. Mobile: plain card reveals.
```html
<section class="ritual" data-mk="pin-steps">
  <div class="rail"><i data-mk-rail-fill></i></div>
  <nav class="dots"><button data-mk-dot>1</button><button data-mk-dot>2</button><button data-mk-dot>3</button></nav>
  <div data-mk-steps>
    <article data-mk-step>
      <div data-mk-step-media><img …></div>
      <div data-mk-step-text><h3>Step one</h3><p>…</p></div>
    </article>
    …
  </div>
</section>
```
Steps must have transparent backgrounds (they overlap). Options: `per` (125 %) · `scrub` (0.8) · `snap` (true) · `mobile` (false).
Classes: `.is-current` on the step; `.is-on`/`.is-now` + `aria-current` on dots. Cost: med.

### S6 · sticky-steps — sticky media, photos open from the centre
*Origin: Dewpoint ritual.* A CSS-sticky media column; as each text step arrives, its photo opens from the centre;
optional blurred backdrops crossfade; a bar tracks the section.
```html
<section class="ss" data-mk="sticky-steps" style="display:grid;grid-template-columns:1fr 1fr">
  <div><div class="sticky" style="position:sticky;top:0;height:100vh;overflow:hidden">
    <img data-mk-step-media …><img data-mk-step-media …><img data-mk-step-media …><i data-mk-bar></i>
  </div></div>
  <div><article data-mk-step>…</article>×3</div>
</section>
```
Add `<img data-mk-step-fallback>` inside each step if you want per-step images when motion is off.
Options: `start` (`top 70%`) · `end` (`top top`) · `ease` · `bgOpacity` (0.7). Cost: med.

### S7 · horizontal — vertical scroll drives a sideways track
*Origin: nova journey, Solenne location.* The section pins and the track moves left. Any `data-mk` effect inside
the track (clip-reveal, parallax, line-rise…) follows the horizontal motion automatically;
`data-mk-h-parallax="6"` slides an image the other way inside its frame.
```html
<section class="journey" data-mk="horizontal" style="height:100vh">
  <div data-mk-track>
    <div class="intro">…</div>
    <figure class="card"><div class="shot" data-mk="clip-reveal" data-mk-from="left"><img data-mk-h-parallax="6" …></div></figure> …
  </div>
</section>
```
Give `h-parallax` images overscan (`width:118%; margin-left:-9%`). Options: `mobile` (pin|native swipe) · `ease` (none) · `ratio` (1) ·
`scrub` (0.7). Cost: med. Reduced: native horizontal scroll with snap.

### S8 · stack-accordion — cards stack into spines (pinned, desktop)
*Origin: Dewpoint ingredients.* Cards slide left and stack into 8.8vw spines one after another until the last
sits open. Mobile and reduced: native swipe row.
```html
<section data-mk="stack-accordion">
  <div data-mk-row> <article class="card" data-mk-card>…</article> ×6 </div>
</section>
```
Give cards a fixed width (≈30vw) and height. Options: `spine` (0.0882) · `start` (`center center`) · `length` (400 %) · `ease`.
Cost: med.

### S9 · scroll-accordion — one item open at a time (pinned)
*Origin: Fizzy Fjord flavour lab.* The section pins; items expand/collapse to their title row in step with scroll.
```html
<section data-mk="scroll-accordion">
  <article data-mk-item><h3 data-mk-item-title>Strawberry fizz</h3><div>…</div></article> ×4
</section>
```
Options: `per` (1.15 viewport per item) · `dim` (0.35). Cost: med (height animation; keep ≤ 6 items).

### S10 · card-stack — 3D deck flicks away (pinned)
*Origin: Fizzy Fjord promise.* The front card flicks up and away with a twist on each step; the deck springs
forward. **The last child is the front card.** Reduced: a plain vertical list.
```html
<section data-mk="card-stack"><div class="deck" data-mk-deck>
  <div class="card" data-mk-card>5</div> … <div class="card" data-mk-card>1 (front)</div>
</div></section>
```
Size the deck (e.g. `.mk-cs-on .deck { aspect-ratio: 4/5 }`). Options: `gap` (30px) · `per` (80 %) · `scrub` (0.5). Cost: med.

### S11 · sequence-build — a sheet prints, lines appear, stamp slams (pinned)
*Origin: Ember "how it works" ticket.* `[data-mk-print]` reveals top-down, `[data-mk-seq]` items appear one by one,
`[data-mk-stamp]` slams on past `stampAt`, `[data-mk-seq-step]` markers get `.is-active`. Fires `mk:stamp`.
```html
<section data-mk="sequence-build">
  <ol><li data-mk-seq-step>Order in</li><li data-mk-seq-step>On the grill</li><li data-mk-seq-step>Out the door</li></ol>
  <div class="ticket" data-mk-print><p data-mk-seq>1× Chicken</p>…<span class="stamp" data-mk-stamp>FIRED</span></div>
</section>
```
Options: `length` (200 %) · `pin` (true) · `stampAt` (0.58) · `stampRotation` (-12). Cost: low.

### S12 · sticky-stats — odometer stat beside scrolling rows
*Origin: Oval benefits.* A sticky big number rolls (up or down with the scroll direction) to each row's value
and counts up; the active row is highlighted; dashes show progress. Works (instantly) under reduced motion too.
```html
<section data-mk="sticky-stats">
  <aside style="position:sticky;top:20vh"><div class="big" data-mk-stat-window aria-hidden="true">0.0%</div>
    <p data-mk-stat-label>ABV</p><div data-mk-stat-dots></div></aside>
  <div><article data-mk-stat-row data-mk-value="0" data-mk-decimals="1" data-mk-unit="%" data-mk-label="alcohol by volume">…</article>…</div>
</section>
```
Each row must also state its number in its own text (the big number is `aria-hidden`). Cost: low.

### S13 · handoff — section shrinks into a card over the next one
*Origin: Solenne quote → footer.* As the next section rises behind, this one clips to a framed card; the next
section's `[data-mk-handoff-content]` scales in and its `[data-mk-bloom]` pattern blooms from the centre.
```html
<section class="quote" data-mk="handoff" style="position:relative;z-index:2">…</section>
<footer style="position:relative;z-index:1;margin-top:-22vh">
  <svg data-mk-bloom>…pattern…</svg><div data-mk-handoff-content>…</div>
</footer>
```
Options: `next` (selector; default next sibling) · `start` (`top 30%`) · `end` (`clamp(bottom bottom)`) · `scrub` (0.5) ·
`inset` (`8% 22% 8% 22%`) · `radius` (24). Cost: med.

### S14 · cloud-curtain — clouds cover and part between sections
*Origin: Fizzy Fjord hero → kingdom.* Procedurally painted clouds rise to cover the screen, a fog swells, then the
clouds part sideways. Place an **empty marker** where the cover should peak.
```html
<div data-mk="cloud-curtain" data-mk-tint="rgba(240,168,190,.5)" aria-hidden="true"></div>
```
Options: `length` (250 % of viewport) · `tint` · `fog` (CSS background). Cost: high while active (≈9 large canvases). One per page.

---

## C · Collections (`effects/collections.js`)

### C1 · stagger-up — children rise in, batched
*Origin: all six sites.* Children (or `items` selector) fade and rise; items entering together animate as a
group, so grids never animate off-screen. `tilt` adds a random straightening rotation (Oval reviews).
```html
<div class="grid" data-mk="stagger-up" data-mk-tilt="2"> <article>…</article> … </div>
```
Options: `items` · `y` (preset rise) · `x` (e.g. 120 = slide in from the right) · `tilt` · `scale` · `stagger` · `duration` (m) ·
`ease` · `start` · `replay` · `on`. Cost: low.

### C2 · card-rise — cards swing up, media unmasks
*Origin: Oval range.* Cards rise from a −3° tilt pivoting bottom-left; each `[data-mk-media]` unmasks from the
bottom while its photo settles from 1.25.
```html
<div class="grid" data-mk="card-rise"><article><div class="media" data-mk-media><img …></div><h3>…</h3></article>…</div>
```
Options: `items` · `tilt` (-3) · `y` (110) · `zoom` (1.25) · `start`. Cost: med.

### C3 · hover-preview — cursor-following preview over a list
*Origin: Ember menu.* A floating disc with the row's image follows the cursor, leans with speed and swaps in a new
image per row; each photo settles from a slight zoom. Mouse only (touch devices: nothing).
The disc never opens empty. Each row gets its own layer, and a layer is only shown once its image has loaded and
decoded, or straight away over its placeholder. While a row's image is still loading the previous image stays
up; a row whose image fails, or takes longer than `wait`, gets no preview. Images preload when the list comes
within one screen of the viewport, so hovers are normally instant.
```html
<ul class="menu" data-mk="hover-preview">
  <li data-mk-preview="img/chicken-520.webp" data-mk-preview-color="#c4502a">Firecracker chicken <em>£14</em></li>…
</ul>
```
Row attributes: `data-mk-preview` (image URL, required) · `data-mk-preview-color` (the photo's dominant colour,
shown instantly while it loads) · `data-mk-preview-lqip` (a tiny blurred thumbnail, e.g. a ~20 px data URI).
Options on the list: `swap` (`pop` | `wipe` | `fade`; pop is Ember's spin-in, wipe opens a circle from the side the
cursor came from) · `preload` (`near` | `eager` | `hover`) · `wait` (1 s).
Images: square crops about 2× the disc size (520–600 px for the default 260 px), WebP or AVIF, about 60 KB or less
each. A full-size photo takes longer to download and decode, and can stutter on the first hover.
CSS vars: `--mk-preview-size` (260px) · `--mk-preview-radius` (50%) · `--mk-preview-bg` (transparent). Cost: low.

### C4 · flex-accordion — hovered column widens, photo wipes in
*Origin: Solenne residence types.* Desktop hover/focus: the column grows (flex 2.3) and its `[data-mk-media]` wipes
up; leaving wipes it out through the top. Touch: columns activate mid-screen. Adds `.is-open`.
```html
<div class="types" data-mk="flex-accordion" style="height:70vh">
  <article data-mk-col><div class="media" data-mk-media style="position:absolute;inset:0"><img …></div><h3>Garden villa</h3></article>…
</div>
```
Options: `grow` (2.3) · `duration` (0.7) · `ease`. Cost: med (flex-grow is layout; ≤ 5 columns).

### C5 · orbit — depth-of-field carousel
*Origin: Dewpoint range.* Items on an ellipse: front sharp and large, back small, blurred, darkened. Click an item,
←/→ keys, or `[data-mk-prev]`/`[data-mk-next]` to revolve (shortest path). `data-mk-spin` revolves on hover.
```html
<div data-mk="orbit"><div data-mk-stage>
  <figure data-mk-item data-mk-name="Cloud Cleanser"><img …></figure> ×5–9
</div><p data-mk-orbit-name aria-live="polite"></p><button data-mk-prev>←</button><button data-mk-next>→</button></div>
```
Options: `radius` (0.32 × stage width) · `blur` (17px) · `duration` (2.2) · `ease` · `spin` · `spinStep` (1.6 s). Event `mk:orbit`
(detail.index). CSS var `--mk-orbit-h` (60vh). Cost: med–high (filters). Reduced: a plain grid.

### C6 · drag-carousel — inertial drag with snapping
*Origin: Fizzy Fjord treats.* Throw it and it glides, then settles on a card edge; rubber-bands at the ends;
buttons, keyboard focus and vertical page scrolling on touch all work.
```html
<div data-mk="drag-carousel"><div class="track" data-mk-track style="gap:18px"><article class="slide">…</article>…</div>
  <button data-mk-prev>←</button><button data-mk-next>→</button></div>
```
Cost: low. Reduced: native scroll-snap row; buttons step instantly.

### C7 · marquee — seamless loop, velocity-reactive
*Origin: Oval press, Ember band, Dewpoint reviews.* Clones content as needed (clones are `aria-hidden` + `inert`).
Pauses on hover/focus, off-screen, and via a toggle button. `data-mk-velocity` speeds it up to 6× with scroll and
reverses on scroll-up.
```html
<div class="press" data-mk="marquee" data-mk-velocity data-mk-speed="80">
  <div data-mk-track><span>VOGUE</span><span>✱</span><span>MONOCLE</span><span>✱</span></div>
  <button data-mk-marquee-toggle>Pause</button>
</div>
```
Options: `speed` (60 px/s) · `direction` (-1 left | 1 right) · `hoverPause` (true) · `velocity` · `maxBoost` (6) · `factor` (260) ·
`toggle` (selector). CSS var `--mk-mq-gap` (3rem). Always include a pause control for marquees (WCAG 2.2.2). Cost: low.

### C8 · pendulum — cards swing on a line
*Origin: Fizzy Fjord reviews.* Each `[data-mk-swing]` is a damped pendulum (own period 0.58–0.7 s) driven by scroll
speed; with `data-mk-drag` the `[data-mk-track]` can be thrown sideways and neighbours react later and weaker.
```html
<div class="line" data-mk="pendulum" data-mk-drag><div data-mk-track>
  <div class="review" data-mk-swing>“Best fudge on the coast.”</div> …
</div></div>
```
Options: `origin` (`50% 0%`) · `max` (35°) · `factor` (0.006 °/(px/s)) · `drag`. Cost: low.

### C9 · rating — stars fill while the score counts
*Origin: Oval reviews.*
```html
<div data-mk="rating" data-mk-value="4.9" aria-label="Rated 4.9 out of 5">
  <span class="stars" aria-hidden="true">★★★★★<span class="fill" data-mk-stars-fill>★★★★★</span></span>
  <b data-mk-rating-number>4.9</b></div>
```
`.stars{position:relative} .fill{position:absolute;inset:0;color:orange}`. Options: `value` · `max` (5) · `decimals` (1). Cost: low.

---

## U · UI & micro-interactions (`effects/ui.js`)

### U1 · nav-hide — header hides on scroll down
*Origin: Dewpoint.* Slides away while scrolling down past `after` px. It returns on scroll up, near the top, when
focus enters it, or when anything inside it dispatches a bubbling `mk:reveal` event. U11 fly-to-cart does this for
a cart in the header; your own code can too (`cart.dispatchEvent(new CustomEvent('mk:reveal', { bubbles: true }))`).
Ignored while scroll is locked (menus). It moves only `y`, so an intro fading the header in (I1's
`data-mk-intro-item`) is not cut short. Options: `after` (140). Cost: low.
```html
<header class="site-header" data-mk="nav-hide nav-state">…</header>
```

### U2 · nav-state — scrolled + dark/light theme state
*Origin: nova, Solenne, Oval.* Adds `.is-scrolled` after `after` px and sets `data-mk-on-theme="dark|light"` while
the header overlaps a `[data-mk-theme]` section (pinned sections included). You style both states.
```html
<section data-mk-theme="dark">…</section>
<style>.nav.is-scrolled{background:…} .nav[data-mk-on-theme="dark"]{color:#fff}</style>
```
Options: `after` (40) · `themes` (selector) · `probe` (px from top). Runs under reduced motion too.

### U3 · scroll-progress — progress bar
*Origin: Solenne rail sun, nova film bar.* Options: `target` (page|section|selector) · `axis` (x|y) · `start`/`end` · `scrub`.
```html
<div class="progress" data-mk="scroll-progress"></div>
```

### U4 · cursor — trailing dot with labels
*Origin: nova, Ember.* Place one empty element; it trails the pointer, grows over links/buttons and shows
labels from `[data-mk-cursor="View"]`. Fine pointers only; the native cursor stays (set `data-mk-hide-native` to hide).
```html
<div data-mk="cursor"></div>  …  <a href="…" data-mk-cursor="View">…</a>
```
Options: `lag` (12) · `grow` (selector) · `hideNative`. CSS: `--mk-cursor-color`, `--mk-cursor-ink`, class `mk-cursor--difference`.

### U5 · magnetic — leans toward the pointer
*Origin: nova CTA.* Put it on a **wrapper** when the element also has an entrance effect.
```html
<span data-mk="magnetic" style="display:inline-block"><a class="btn" href="#contact">Get in touch</a></span>
```
Options: `strength` (0.32) · `strengthY` (×1.3) · `duration` (0.7).

### U6 · fill-bloom — hover fill blooms from the entry point
*Origin: Ember buttons.* Pure CSS circle scaled by transform; JS records where the pointer entered/left.
```html
<button class="btn" data-mk="fill-bloom" style="--mk-bloom:#111">Order now</button>
<style>.btn:hover{color:#fff;transition:color .45s}</style>
```
CSS vars: `--mk-bloom` (colour) · `--mk-bloom-size` (2.6).

### U7 · grain — animated film grain overlay
*Origin: Ember.* `<div data-mk="grain"></div>` anywhere. CSS vars `--mk-grain-opacity` (.07) · `--mk-grain-z` · `--mk-grain-blend`.
Static under reduced motion. Cost: med (full-screen blend layer).

### U8 · tilt — 3D tilt with sheen
*Origin: Fizzy Fjord realm cards.* The card tilts toward the pointer (max 8°); `[data-mk-tilt-depth="14"]` children
slide for parallax; `[data-mk-sheen]` sweeps across on enter and then tracks the pointer.
```html
<a class="card" data-mk="tilt" style="position:relative;overflow:hidden"><img …><b data-mk-tilt-depth="14">Logo</b><span data-mk-sheen></span></a>
```
Options: `max` (8) · `perspective` (900). Mouse only.

### U9 · confetti — sugar-crystal burst on press
*Origin: Fizzy Fjord "sherbet fizz".* `data-mk="confetti"` on any button; or call `MK.confetti(x, y, opts)`.
Options: `count` (20) · `speed` (5) · `size` (4.2) · `colors` (`#hex,#hex`). Disabled under reduced motion.

### U10 · elastic-pop — springy punch on an event
*Origin: Fizzy Fjord stepper, cart badge, form.* Options: `target` · `kind` (punch|tilt|squash) · `event` (click|submit|change|any
custom event, e.g. `mk:landed`) · `amount`. Also callable as `el.mkPop()`.
```html
<button data-mk="elastic-pop" data-mk-target="#qty">+</button>
<form data-mk="elastic-pop" data-mk-event="submit" data-mk-kind="squash">…</form>
```

### U11 · fly-to-cart — product arcs into the cart
*Origin: Fizzy Fjord.* The card's image arcs into `[data-mk-cart]` (split-axis eases), which then pops. The cart
receives a bubbling `mk:landed` event — update your count there. Before the flight the cart gets a bubbling
`mk:reveal`, so a hidden U1 nav-hide header slides back. The arc follows the cart's live position, so it lands
even while the header moves.
```html
<article><img …><button data-mk="fly-to-cart" data-mk-done-label="Added ✓">Add to bag</button></article>
<a class="cart" data-mk-cart>Bag <span id="count">0</span></a>
<script>document.addEventListener('mk:landed', () => count.textContent = ++n)</script>
```
Options: `target` · `source` (`img`) · `scope` (closest card) · `doneLabel` (put `[data-mk-label]` on a child to keep icons).
Reduced: no flight, the event still fires.

### U12 · follow-sticker — sticker follows the pointer in a container
*Origin: Fizzy Fjord footer candy.* `[data-mk-sticker]` trails the pointer inside the container, tilting with its
speed (relaxes at rest); bobs gently on touch screens.
```html
<footer data-mk="follow-sticker"><img class="sticker" data-mk-sticker src="candy.png" alt=""></footer>
```
Options: `offset` (26px).

---

## I · Intros (`effects/intro.js`)

Use **at most one intro per page**. Intros lock scrolling while they play, call `MK.introDone()` (so
`data-mk-on="intro"` elements start), never replay on resize, never run under reduced motion, and have a safety
timeout. Overlay intros (I2–I4) cover the page from the first paint (CSS); put their markup first in `<body>`.

### I1 · intro-window — hero opens out of a window
*Origin: nova.* The hero frame opens from `inset(16% 22% 38% 22%)` with its corner radius kept, the image settles
from 1.12, then `[data-mk-intro-item]` elements fade up in order.
```html
<header class="hero"><div class="frame" data-mk="intro-window"><img …></div>
  <nav data-mk-intro-item>…</nav><h1 data-mk="line-rise" data-mk-on="intro">…</h1><p data-mk-intro-item>…</p></header>
```
Options: `inset` · `zoom` (1.12) · `duration` (1.7) · `delay` (0.15) · `items` (selector) · `stagger` (0.15) · `lock` (true).

### I2 · intro-arch — arched window preloader
*Origin: Solenne.* A dark field with an arched window; the lockup flips in, the arch rises and widens, then dives
past the screen edges.
```html
<div data-mk="intro-arch" style="--mk-arch-bg:#0d0d0d">
  <div class="lockup"><span data-mk-arch-title>SOLENNE</span><em data-mk-arch-tag>Houses on the hill</em></div>
</div>
```
Options: `hold` (1.0 s before the arch). CSS vars `--mk-arch-bg`, `--mk-arch-ink`.

### I3 · intro-drop — droplet splash opens the hero
*Origin: Dewpoint.* A drop falls, splats, ripples, and the target opens as a growing circle from the splash point.
```html
<div data-mk="intro-drop" data-mk-target="#hero" data-mk-color="#6F7DFF"></div>
<header id="hero">…</header>
```
Options: `target` (default next sibling) · `color` · `hit` (0.58 of viewport height). CSS var `--mk-drop-bg`.

### I4 · intro-curtain — counter loader with lifting sheets
*Origin: Ember.* A counter runs (to 86 %, then waits for `window.load`, max 6 s), captions roll, then two sheets
lift with a bowed edge.
```html
<div data-mk="intro-curtain" data-mk-steps="Lighting the charcoal|Reducing the sauce" data-mk-colors="#f4ead7,#c8341c">
  <div data-mk-loader-mid><b><span data-mk-loader-count>0</span>%</b>
    <span class="mk-mask"><span data-mk-loader-step style="display:inline-block"></span></span></div>
</div>
```
Options: `steps` · `colors` (sheet 1, sheet 2) · `duration` (2.1) · `maxWait` (6000 ms).

---

## K · CSS-only snippets

Small effects that need no JavaScript (underline wipe, press squash, hover zoom, image swap, Ken Burns, spinning
badge, sticky cover curtain, sibling spotlight, row hover wipe, burger→X): see `references/css-snippets.md`.

## A · Advanced (WebGL/canvas) blueprints

Not shipped as drop-in effects (they are art-directed per brand): WebGL fire typography, 3D floating objects hero,
Verlet cloth paper, wind-blown cards shader, canvas smear test, window panes merge, rim text spread. See
`references/advanced.md` for architecture, parameters, original source locations and porting steps.
