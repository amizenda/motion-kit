# A7 · Rim text spread on a dusk sun — reference code

A short line of words is set on the rim of a huge half-disc. As the disc scrolls up it darkens from a translucent veil to solid black, and the words spread apart along the rim (`word-spacing` 0 → 10vw).
Origin: Solenne. Dependencies: GSAP 3.13 + ScrollTrigger (SVG `textPath`, CSS custom properties on gradient stops).
Wrap it as `MK.effect('rim-text', (el, o) => { … })` (section 4). It is all scrubbed GSAP tweens, which motion-kit's matchMedia context reverts and re-runs at the breakpoint, so neither `o.loop` nor `o.cleanup` is needed. The static fallback under reduced motion is the end state: a solid disc with the words evenly spread.

**Fix applied.** Solenne sized the font as `innerWidth × 0.03938` in **SVG user units**. The SVG's viewBox already scales with the viewport, so the text was scaled by the viewport width twice and grew quadratically on wide screens. The word-spacing target had the same bug. Both are now constants in user units.

---

## 1 · Markup

```html
<!-- the dusk sun: a veil that turns solid black as it rises; words spread along its rim -->
<div class="arc">
  <h2 class="sr-only">Evening light on warm stone</h2>
  <svg class="arc__svg" viewBox="0 0 1600 800" aria-hidden="true">
    <defs>
      <radialGradient id="sunCore" cx="50%" cy="50%" r="50%">
        <stop offset="0" class="sun-stop-a"/>
        <stop offset="1" class="sun-stop-b"/>
      </radialGradient>
      <radialGradient id="sunGlow" cx="50%" cy="100%" r="50%">
        <stop offset=".78" class="glow-stop-a"/>
        <stop offset="1" class="glow-stop-b"/>
      </radialGradient>
    </defs>
    <circle cx="800" cy="800" r="1000" fill="url(#sunGlow)" class="arc__glow"/>
    <circle cx="800" cy="800" r="800" fill="url(#sunCore)" class="arc__disc"/>
    <!-- a full circle of r 676 starting at its left point; startOffset 25% = the top of the arc -->
    <path id="arcPath" d="M 800,800 m -676,0 a 676,676 0 1,1 1352,0 a 676,676 0 1,1 -1352,0" fill="none"/>
    <text class="arc__text"><textPath href="#arcPath" startOffset="25%" text-anchor="middle">Evening light on warm stone</textPath></text>
  </svg>
  <div class="arc__inner">
    <p class="arc__sub">Tonight the sun drops behind the hills at <span class="js-sunset">21:05</span></p>
  </div>
</div>
```

If two of these are on one page, give the gradient and path ids a unique suffix.

## 2 · CSS

```css
.arc{--sun-a:rgba(0,0,0,.5);--sun-b:rgba(0,0,0,.78);position:relative;z-index:2;height:50vw;color:#fff}
.arc__svg{position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible}
.sun-stop-a{stop-color:var(--sun-a)}
.sun-stop-b{stop-color:var(--sun-b)}
.glow-stop-a{stop-color:#000;stop-opacity:.28}
.glow-stop-b{stop-color:#000;stop-opacity:0}
/* font-size and letter-spacing are SVG user units (viewBox 1600 wide = the SVG's CSS width).
   63 ≈ 3.938vw on desktop, where the SVG is 100vw wide. Do NOT multiply by the viewport again. */
.arc__text{font-family:var(--f-display,serif);font-weight:300;font-size:63px;letter-spacing:-1px;fill:#fff;word-spacing:0}
.arc__inner{position:absolute;left:0;right:0;top:20.5vw;display:flex;flex-direction:column;align-items:center;text-align:center}
.arc__sub{font-style:italic;font-size:max(1.75vw,17px);line-height:1.2;margin:0}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media (max-width:767px){
  .arc{height:90vw}
  .arc__svg{left:-40vw;width:180vw}          /* wider than the screen: 1 user unit = 0.1125vw */
  .arc__text{font-size:60px;letter-spacing:-.96px}
  .arc__inner{top:36vw;padding:0 12vw}
  .arc__sub{font-size:1rem}
}
/* static end state */
.arc--static{--sun-a:#000;--sun-b:#000}
.arc--static .arc__text{word-spacing:160px}
@media (max-width:767px){ .arc--static .arc__text{word-spacing:110px} }
```

## 3 · The tweens

```js
/* user-unit sizes: constants, because the viewBox already tracks the viewport */
const RIM = {
  desktop: { font: 63, spread: 160 },   // 3.938vw and 10vw of a 100vw-wide, 1600-unit viewBox
  mobile:  { font: 60, spread: 110 },   // the SVG is 180vw wide on mobile (≈ 6.75vw and 12.4vw)
}

function rimText(arc, gsap, mobile){
  const text = arc.querySelector('.arc__text')
  const s = mobile ? RIM.mobile : RIM.desktop
  text.style.fontSize = s.font + 'px'                    // px inside SVG = user units
  text.style.letterSpacing = (-0.016 * s.font) + 'px'
  const st = { trigger: arc, start: 'top bottom', end: 'bottom top', scrub: true }
  // the disc darkens from a veil to solid black as it rises
  gsap.fromTo(arc, { '--sun-a': 'rgba(0,0,0,0.5)', '--sun-b': 'rgba(0,0,0,0.78)' },
                   { '--sun-a': 'rgba(0,0,0,1)',   '--sun-b': 'rgba(0,0,0,1)', ease: 'none', scrollTrigger: st })
  // the words spread along the rim
  gsap.fromTo(text, { wordSpacing: '0px' }, { wordSpacing: s.spread + 'px', ease: 'none', scrollTrigger: { ...st } })
}
```

Animating `word-spacing` re-lays out the text on every frame. Keep it to one short line (four or five words), and don't run more than one of these on a page.

If you want the exact Solenne look as it was tuned on a 1440 px screen (where the double scaling gave 56.7 units and 144 units), use `font: 56.7, spread: 144`.

## 4 · motion-kit wrapper

```js
MK.effect('rim-text', (el, o) => {
  rimText(el, o.gsap, o.is.mobile)                       // re-runs at the breakpoint (motion-kit matchMedia)
}, { reduced: (el, o) => { el.classList.add('arc--static'); o.cleanup(() => el.classList.remove('arc--static')) } })
```

To make the words **travel** along the rim and not spread, use motion-kit's built-in `text-path` effect.
