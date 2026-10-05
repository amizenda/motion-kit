# K · CSS-only snippets

Small effects that need no JavaScript. They use the preset's CSS tokens (`--mk-ease-out`, `--mk-dur-m`…), so they
match the JS motion. Wrap transform-based hovers in `@media (hover: hover)` and add a reduced-motion guard as shown.
**Never put these transitions on an element that a `data-mk` effect also transforms** — use a child or wrapper.

## K1 · Underline wipe (Dewpoint, Oval, Solenne)
Underline retracts to the right on hover and regrows from the left (or grows in, variant B).
```css
.link { background: linear-gradient(currentColor 0 0) 0 100% / 100% 1px no-repeat; transition: background-size var(--mk-dur-s) var(--mk-ease-out); }
.link:hover { background-position: 100% 100%; background-size: 0 1px; }
/* B: grows in from the left on hover */
.link--grow { background-size: 0 1px; }
.link--grow:hover, .link--grow:focus-visible { background-size: 100% 1px; background-position: 0 100%; }
```

## K2 · Press squash (Fizzy Fjord)
```css
.btn { transition: transform .35s var(--mk-ease-pop); }
.btn:active { transform: scale(1.06, .94); transition-duration: .12s; }
@media (prefers-reduced-motion: reduce) { .btn, .btn:active { transition: none; transform: none; } }
```

## K3 · Hover zoom inside a frame (all sites)
```css
.frame { overflow: hidden; }
.frame img { transition: transform 1.1s var(--mk-ease-out); }
@media (hover: hover) { .frame:hover img { transform: scale(1.05); } }
```
If the image has `data-mk="parallax"`, put the hover zoom on a wrapper `<div>` around the image.

## K4 · Hover image swap (Oval range: botanical → serve)
```html
<div class="swap"><img class="a" src="plant.jpg" alt=""><img class="b" src="drink.jpg" alt="Rosemary spritz"></div>
```
```css
.swap { position: relative; overflow: hidden; }
.swap img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: opacity .6s ease, transform 1.1s var(--mk-ease-out); }
.swap .b { opacity: 0; transform: scale(1.12); }
.swap:hover .a, .swap:focus-within .a { opacity: 0; transform: scale(1.08); }
.swap:hover .b, .swap:focus-within .b { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) { .swap img { transform: none !important; } }
```

## K5 · Ken Burns (Ember plate photos)
```css
.kb img { animation: mk-kb 7s ease-in-out infinite alternate; }
@keyframes mk-kb { from { transform: scale(1.04) rotate(-2deg); } to { transform: scale(1.14) rotate(2deg); } }
@media (prefers-reduced-motion: reduce) { .kb img { animation: none; } }
```

## K6 · Spinning badge ring (Fizzy sticker, Ember order badge)
```html
<a class="badge" href="#order"><svg viewBox="0 0 200 200"><defs><path id="c" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0"/></defs>
  <text><textPath href="#c">ORDER NOW · OPEN TILL 2AM · </textPath></text></svg><span>→</span></a>
```
```css
.badge svg { animation: mk-spin 18s linear infinite; }
@keyframes mk-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .badge svg { animation: none; } }
```
Optional scroll-speed boost (Ember): `const a = svg.getAnimations()[0]; gsap.ticker.add(() => a.playbackRate = 1 + Math.min(Math.abs(MK.velocity()) / 120, 9));`

## K7 · Cover curtain — next section slides over a still hero (nova, Solenne)
```css
.hero { position: sticky; top: 0; height: 100vh; z-index: 0; }
.after-hero { position: relative; z-index: 1; background: var(--page-bg); }
```
Pair with S1 hero-exit for depth while it is being covered.

## K8 · Sibling spotlight (nova menu words, Oval active row)
```css
@media (hover: hover) { .list:hover > * { opacity: .45; } .list > *:hover { opacity: 1; transform: translateX(12px); } }
.list > * { transition: opacity .6s var(--mk-ease-out), transform .8s var(--mk-ease-out); }
```

## K9 · Row hover wipe (Ember menu rows)
A colour band wipes down over the row and exits downward; text slides right.
```css
.row { position: relative; isolation: isolate; }
.row::before { content: ""; position: absolute; inset: 0; z-index: -1; background: var(--accent, #c8341c); transform: scaleY(0); transform-origin: 50% 0; transition: transform .55s var(--mk-ease-out); }
.row:hover::before { transform: scaleY(1); transform-origin: 50% 100%; }
.row .name { transition: transform .6s var(--mk-ease-out), color .45s; }
.row:hover .name { transform: translateX(16px); color: #fff; }
```

## K10 · Burger → X (Fizzy, nova)
```css
.burger span { display: block; height: 2px; background: currentColor; transition: transform .4s var(--mk-ease-pop); }
.burger[aria-expanded="true"] span:first-child { transform: translateY(4px) rotate(45deg); }
.burger[aria-expanded="true"] span:last-child { transform: translateY(-4px) rotate(-45deg); }
```

## K11 · Neighbour nudge (nova journey cards)
```css
@media (hover: hover) {
  .cards > * { transition: transform .9s var(--mk-ease-out); }
  .cards > *:hover + * { transform: translateX(8px); }
  .cards > *:has(+ *:hover) { transform: translateX(-8px); }
}
```
