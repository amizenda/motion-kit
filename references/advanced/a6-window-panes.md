# A6 · Window panes merge — reference code

Two offset rectangular windows cut into a white wall slide into line and the mullion between them disappears. The wall then scales up until the merged window fills the screen, while flowering bushes in front part to either side. It is one scrubbed timeline over about three screens of scroll.
Origin: Solenne. Dependencies: GSAP 3.13 + ScrollTrigger (CSS `clip-path` polygons, no canvas).
Wrap it as `MK.effect('window-panes', (el, o) => { … })` (section 4). Everything is a GSAP tween inside the effect, so motion-kit's matchMedia context reverts it; `o.loop` and `o.cleanup` are not needed beyond that. The static fallback (reduced motion) drops the masks and shows the photo stage at full size.

---

## 1 · Markup

Two white masks (left and right halves) sit in a sticky layer above a sticky photo stage. Each mask is a white rectangle with a window-shaped **hole**: the polygon traces the outer box one way and the window the other, so the non-zero winding rule leaves the window empty.

```html
<section class="panes" aria-labelledby="panes-title">
  <div class="panes__masks" aria-hidden="true">
    <div class="panes__group">
      <div class="panes__mask panes__mask--l"></div>
      <div class="panes__mask panes__mask--r"></div>
      <img class="panes__flower panes__flower--l" src="assets/flower-bush-l.png" width="1400" height="1400" alt="">
      <img class="panes__flower panes__flower--r" src="assets/flower-bush-r.png" width="1400" height="1400" alt="">
    </div>
  </div>
  <div class="panes__stage">
    <div class="panes__imgwrap"><img class="panes__img" src="assets/panes-photo.jpg" width="2400" height="2640" alt="Describe the photo"></div>
    <span class="panes__grad" aria-hidden="true"></span>
    <h2 class="panes__title" id="panes-title">Of the hill</h2>
    <div class="panes__quote"><p class="panes__lead">Supporting copy that appears once the window has opened.</p></div>
  </div>
</section>
```

## 2 · CSS

```css
/* section = 200vh of scrub + the stage's own height */
.panes{position:relative;height:calc(200vh + max(109.6vw,140vh));background:#fff;overflow:clip}
.panes__masks{position:sticky;top:0;height:100vh;z-index:3;pointer-events:none;overflow:visible}
.panes__group{position:absolute;inset:0;transform-origin:50% 50%;will-change:transform}
.panes__mask{position:absolute;top:-1%;height:102%;width:50.07%;background:#fff;will-change:clip-path}
/* start states (= poly(...) values L0 / R0 below) */
.panes__mask--l{left:0;clip-path:polygon(0% 0%, 0% 100%, 44.444% 100%, 44.444% 36.111%, 98.889% 36.111%, 98.889% 99.074%, 44.444% 99.074%, 44.444% 100%, 100% 100%, 100% 0%)}
.panes__mask--r{right:0;clip-path:polygon(0% 0%, 0% 100%, 1.111% 100%, 1.111% .926%, 55.556% .926%, 55.556% 63.889%, 1.111% 63.889%, 1.111% 100%, 100% 100%, 100% 0%)}
.panes__flower{position:absolute;width:50vw;height:auto;will-change:transform}
.panes__flower--l{left:-14vw;bottom:-26vh;
  -webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 16%),linear-gradient(to left,transparent 0,#000 16%);-webkit-mask-composite:source-in;
  mask-image:linear-gradient(to bottom,transparent 0,#000 16%),linear-gradient(to left,transparent 0,#000 16%);mask-composite:intersect}
.panes__flower--r{right:-13vw;bottom:-18vh;
  -webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 16%),linear-gradient(to right,transparent 0,#000 16%);-webkit-mask-composite:source-in;
  mask-image:linear-gradient(to bottom,transparent 0,#000 16%),linear-gradient(to right,transparent 0,#000 16%);mask-composite:intersect}
/* the stage sits under the masks (negative margin pulls it up into the same sticky band) */
.panes__stage{position:sticky;top:0;margin-top:-100vh;height:max(109.6vw,140vh);z-index:1;transform-origin:50% 0;transform:scale(.75);
  overflow:hidden;color:#fff;background:#000}
.panes__imgwrap{position:absolute;inset:0;overflow:hidden}
.panes__img{width:100%;height:100%;object-fit:cover;will-change:transform}
.panes__grad{position:absolute;left:0;right:0;bottom:0;height:110vh;background:linear-gradient(0deg,rgba(0,0,0,.72) 0%,rgba(0,0,0,0) 100%)}
.panes__title{position:absolute;left:0;right:0;top:3.4vw;text-align:center;font-size:11.5vw;line-height:.95;letter-spacing:.03em;white-space:nowrap;margin:0}
.panes__quote{position:absolute;left:9vw;bottom:10vw;width:34vw}
@media (max-width:767px){
  .panes{height:calc(200vh + max(109.6vw,150vh))}
  .panes__stage{height:max(109.6vw,150vh)}
  .panes__flower{width:80vw}
  .panes__flower--l{left:-30vw;bottom:-14vh}.panes__flower--r{right:-30vw;bottom:-10vh}
  .panes__title{font-size:13vw;top:9vw}
  .panes__quote{left:6vw;right:6vw;width:auto;bottom:44vw}
}
/* static fallback (reduced motion / no JS motion) */
.panes--static{height:auto}
.panes--static .panes__masks{display:none}
.panes--static .panes__stage{position:relative;margin:0;transform:none;height:110vh}
```

## 3 · The timeline

`start: 'top bottom'`, `end: 'top -200%'`, `scrub: true`. The timeline is 1 unit long:
- **0 → .5:** the two windows slide to the same height (`ease: none`).
- **.5 → .6:** the gap closes. The left window's right edge goes to 100 % and the right window's left edge to 0, so the mullion vanishes.
- **.6 → 1:** the wall group scales 1 → 1.84, the flowers scale 1.84 and part ±50 xPercent, and the stage scales .75 → 1 (ease InOut `.75,0,.25,1`).

```js
// outer box traced one way, the window the other way (nonzero → hole)
const poly = (x1, y1, x2, y2, xb) =>
  `polygon(0% 0%, 0% 100%, ${xb}% 100%, ${x1}% ${y1}%, ${x2}% ${y1}%, ${x2}% ${y2}%, ${x1}% ${y2}%, ${xb}% 100%, 100% 100%, 100% 0%)`

function windowPanes(section, gsap, inOut){
  const ml = section.querySelector('.panes__mask--l'), mr = section.querySelector('.panes__mask--r')
  const L0 = poly(44.444, 36.111, 98.889, 99.074, 44.444), L1 = poly(44.444, 18.519, 98.889, 81.481, 44.444), L2 = poly(44.444, 18.519, 100, 81.481, 44.444)
  const R0 = poly(1.111, 0.926, 55.556, 63.889, 1.111),    R1 = poly(1.111, 18.519, 55.556, 81.481, 1.111),   R2 = poly(0, 18.519, 55.556, 81.481, 0)
  const tl = gsap.timeline({ scrollTrigger: { trigger: section, start: 'top bottom', end: 'top -200%', scrub: true } })
  tl.fromTo(ml, { clipPath: L0 }, { clipPath: L1, ease: 'none', duration: 0.5 }, 0)
    .fromTo(mr, { clipPath: R0 }, { clipPath: R1, ease: 'none', duration: 0.5 }, 0)
    .to(ml, { clipPath: L2, ease: 'none', duration: 0.1 }, 0.5)
    .to(mr, { clipPath: R2, ease: 'none', duration: 0.1 }, 0.5)
    .fromTo(section.querySelector('.panes__group'), { scale: 1 }, { scale: 1.84, ease: inOut, duration: 0.4 }, 0.6)
    .to(section.querySelector('.panes__flower--l'), { scale: 1.84, xPercent: -50, ease: inOut, duration: 0.4 }, 0.6)
    .to(section.querySelector('.panes__flower--r'), { scale: 1.84, xPercent: 50, ease: inOut, duration: 0.4 }, 0.6)
    .fromTo(section.querySelector('.panes__stage'), { scale: 0.75, transformOrigin: 'center top' }, { scale: 1, ease: inOut, duration: 0.4 }, 0.6)

  // image drift inside the stage: yPercent 0 → 25, from 55% top to bottom top
  gsap.to(section.querySelector('.panes__img'), { yPercent: 25, ease: 'none',
    scrollTrigger: { trigger: section, start: '55% top', end: 'bottom top', scrub: true } })
  return tl
}
```

The clip-path polygons repaint every scroll frame. That is fine for one section; don't stack several.

Solenne also revealed the title char by char once the window had opened (`start: 'top -130%'`, once), and revealed the quote lines and button where they actually appear in the sticky stage. Use motion-kit's own text effects for those (`data-mk="char-flip"` on the title, `line-rise` on the quote, each with a custom start).

## 4 · motion-kit wrapper

```js
MK.effect('window-panes', (el, o) => {
  windowPanes(el, o.gsap, o.ease('inOut'))       // tokens' inOut ≈ cubic-bezier(.75,0,.25,1)
}, { reduced: (el, o) => { el.classList.add('panes--static'); o.cleanup(() => el.classList.remove('panes--static')) } })
```
