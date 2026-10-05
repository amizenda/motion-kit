# A · Advanced blueprints (WebGL / canvas / bespoke)

These are art-directed per brand, so they are **not** drop-in `data-mk` effects. When the user picks one, build it as
a custom effect with `MK.effect('my-effect', (el, o) => { … })` so it inherits reduced-motion handling, cleanup and the
shared clock. Each blueprint has complete reference code in `references/advanced/` (linked below): open that file
when you build the piece, and use the parameters here to adapt it to the brand.

**Non-negotiables for every advanced piece:** a static fallback (CSS/HTML) when WebGL/canvas fails or motion is
reduced · `try/catch` around renderer creation · pause the loop off-screen (`o.loop(fn, { el })`) · DPR cap 1.5–2 ·
debounce resize and rebuild textures there, not per frame · dispose geometries/materials/textures on cleanup ·
frame-rate independent smoothing (`MK.damp`) · max one per page.

---

## A1 · WebGL fire typography (Ember "FIRE" / "HUNGRY?")
**Look:** chunky red glass letters with an extruded side and bevel; a ragged white-hot front climbs the letters, two
parallax sheets of domain-warped flame lick upward, sparks rise; click "stokes" the fire; scrolling away burns the
letters from the top down.
**Reference code:** [`advanced/a1-fire-type.md`](advanced/a1-fire-type.md) — full shader, FireText class, sparks, stoke and
scroll burn (origin: Ember).
**Architecture**
1. Keep the DOM word (accessible, `color: transparent`); draw it on a fixed full-screen canvas aligned to the DOM rect.
2. Rasterise the word into a canvas mask (per-glyph positions via `Range`), build an "envelope" (mask dragged upward with
   exponential falloff + box blur) for where flames may live.
3. One orthographic plane per word, `ShaderMaterial` with simplex noise + fbm (4 octaves) + fbm3 (3 octaves).
   Uniforms: `uIgnite` (0→1 tween 4.2 s, ease .45,0,.35,1), `uReveal`, `uBurn` (scroll-linked), `uHeat` (cursor
   proximity), `uWind` (cursor x velocity), `uTilt`, `uLight`, `uExt` (extrusion vector).
4. Sparks: `THREE.Points` (60–90), CPU integration (buoyancy, drag `0.6^dt`, wind), point-sprite shader.
**Perf:** ~30 noise evaluations per pixel — keep the quad tight to the word, cull when off-screen, never render it
under a loader, DPR ≤ 1.5. Fallback: red display type with a CSS text-shadow glow.

## A2 · 3D floating objects hero (Fizzy Fjord candies, Ember spices)
**Look:** glossy 3D objects pop in from below (centre first, `back.out(1.6)`), bob and tumble, parallax with the
cursor, swell on hover, hop/spin on tap, and scatter toward the camera as the hero scrolls away.
**Reference code:** [`advanced/a2-floating-objects.md`](advanced/a2-floating-objects.md) — SDF-inflated geometry,
materials, environment, lights, scene, layout, motion and bokeh (origin: Fizzy Fjord), plus procedural spices, orbit
and cursor-dodge spring (origin: Ember). The two Fizzy bugs below are already fixed there.
**Architecture**
- Renderer: `antialias`, `alpha`, ACES tone mapping, sRGB, DPR ≤ 2; `PerspectiveCamera(30)` at z 12.
- Prefer **GLB models** from the brand (or simple primitives) over procedural SDF unless you have time; use a
  `RoomEnvironment` PMREM for gloss; `MeshPhysicalMaterial` (clearcoat 1, roughness .16–.34, sheen for gummies).
- Place objects as fractions of the frustum at their depth so the composition holds at any aspect ratio.
- Motion from absolute time (no accumulation): bob `sin(t·ω+φ)·A`, three tumble modes (face / disc / free).
- Scroll: `scatter = clamp(progress·1.7, 0, 1.4)` → spread x, rise y², push z, extra rotation.
- Cursor: camera lerp toward pointer (`MK.damp` rate ≈ 3.6), raycast hover only after pointer moves.
**Fallbacks:** PNG cut-outs floating with `S2 drift` + a gentle yoyo; under reduced motion render one static frame.
**Known bugs to avoid:** rebuilding objects on resize must preserve their "entered" state (Fizzy candies vanished);
accumulate-free spins (`popSpin` grew forever).

## A3 · Verlet cloth paper (Ember receipt)
**Look:** a printed receipt hangs from a slot, drifts as if underwater, dents under the cursor, shudders when stamped.
**Reference code:** [`advanced/a3-cloth.md`](advanced/a3-cloth.md) (origin: Ember).
**Architecture:** Three.js plane 16×22, Verlet integration (12 constraint iterations, 2 substeps, top row pinned,
damping .962, gravity 180), texture redrawn from the live DOM ticket **only when its content changes** (not per
frame), `MeshStandardMaterial` with the texture as map + emissiveMap, `DoubleSide`, `alphaTest .5`. Run only while the
section is in view. Fallback: the DOM ticket (keep it, `opacity:0` while the canvas shows — never `visibility:hidden`).

## A4 · Wind-blown cards (Ember reviews)
**Look:** paper review cards taped at the top ripple and lift in a gusty breeze, following a CSS marquee.
**Reference code:** [`advanced/a4-wind-cards.md`](advanced/a4-wind-cards.md) (origin: Ember).
**Architecture:** shared `PlaneGeometry(1,1,30,20)`, vertex shader displacement (`hang^1.35`, gust
`0.62 + 0.38·sin(t·.63+φ)·sin(t·.27+2.1φ)`, three travelling waves), finite-difference normals, card textures drawn
once from the DOM, per-card rects read once per frame (cache the static tilt). Keep the DOM text readable to
assistive tech (use `opacity:0`, not `visibility:hidden`).

## A5 · Canvas smear test (Dewpoint)
**Look:** drag on a "glass" card to smear gel/cream/oil; fast strokes are thinner; each stroke thins away over 6 s;
gloss band drifts; squalane refracts the backdrop.
**Reference code:** [`advanced/a5-smear.md`](advanced/a5-smear.md), with the script ready to load as
[`advanced/a5-smear.js`](advanced/a5-smear.js) (origin: Dewpoint). The three fixes below are already applied there.
**Architecture:** points stored in card-width units, per-formula opaque masks (no overlap darkening), rims made by
compositing a mask minus a shifted copy, `absorb = 1 − (age/6000)³`, IntersectionObserver-gated rAF that stops when the
glass is clean, DPR ≤ 1.5. **Fixes to apply when porting:** keep the demo swipe in its own stroke object (it hijacked
user strokes), track `pointerId`, and don't set `touch-action:none` on a large mobile card (it traps page scrolling —
use `pan-y` and start drawing after a short horizontal intent).

## A6 · Window panes merge (Solenne)
**Look:** two offset rectangular windows cut in a white wall slide into line, the mullion between them disappears,
then the wall scales up until the merged window fills the screen while flowering bushes part.
**Reference code:** [`advanced/a6-window-panes.md`](advanced/a6-window-panes.md) — timeline, CSS and markup (origin: Solenne).
**Core code** (one scrubbed timeline, `trigger: section, start: 'top bottom', end: 'top -200%'`):
```js
const poly = (x1, y1, x2, y2, xb) => `polygon(0% 0%, 0% 100%, ${xb}% 100%, ${x1}% ${y1}%, ${x2}% ${y1}%, ${x2}% ${y2}%, ${x1}% ${y2}%, ${xb}% 100%, 100% 100%, 100% 0%)`;
tl.fromTo(left,  { clipPath: poly(44.444, 36.111, 98.889, 99.074, 44.444) }, { clipPath: poly(44.444, 18.519, 98.889, 81.481, 44.444), ease: 'none', duration: .5 }, 0)
  .fromTo(right, { clipPath: poly(1.111, 0.926, 55.556, 63.889, 1.111) },    { clipPath: poly(1.111, 18.519, 55.556, 81.481, 1.111), ease: 'none', duration: .5 }, 0)
  .to(left,  { clipPath: poly(44.444, 18.519, 100, 81.481, 44.444), ease: 'none', duration: .1 }, .5)
  .to(right, { clipPath: poly(0, 18.519, 55.556, 81.481, 0), ease: 'none', duration: .1 }, .5)
  .fromTo(group, { scale: 1 }, { scale: 1.84, ease: MK.t.ease.inOut, duration: .4 }, .6);
```
Two white masks (left/right halves, sticky) sit above a sticky photo stage. Clip-path polygons repaint each frame —
fine for one section.

## A7 · Rim text spread on a dusk sun (Solenne)
**Look:** words on the rim of a large half-disc spread apart (`word-spacing` 0 → 10vw) as the disc rises and darkens.
**Reference code:** [`advanced/a7-rim-text.md`](advanced/a7-rim-text.md) — SVG, CSS and timeline, with the fix below
applied (origin: Solenne).
**Core:** SVG `textPath` on a circle; scrubbed `wordSpacing` tween and CSS-variable gradient stops (`--sun-a/--sun-b`).
Size the font in SVG user units **without** multiplying by the viewport width again (Solenne scaled it twice).
Animating `word-spacing` re-lays out the text each frame — keep it to one short line.

## A8 · Live sun readout (Solenne) — content, not motion
A tiny solar-elevation calculation shows "Sun over Altea 23.4° · setting" and moves a dot. **Reference code:** [`advanced/a8-sun-readout.md`](advanced/a8-sun-readout.md) (origin: Solenne).
Only worth it when the brand is about place and light.
