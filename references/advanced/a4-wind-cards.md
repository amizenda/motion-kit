# A4 · Wind-blown cards — reference code

Paper cards (reviews, notes, tickets) taped along their top edge ripple and lift in a gusty breeze while a CSS marquee carries them sideways. One WebGL canvas covers the section. Each card is a shared plane displaced on the GPU, lit by its own finite-difference normals, and textured once from its DOM card.
Origin: Ember. Dependencies: three.js r169 ES module (works r150+). The marquee is plain CSS.
Wrap it as `MK.effect('wind-cards', (el, o) => { … })` (section 4). `o.loop(fn, { el })` runs it only while the section is in view, `o.cleanup` disposes textures, materials, geometry, renderer and listeners, and the static fallback is the DOM cards themselves, left alone when WebGL is missing or motion is reduced.

---

## 1 · Markup and CSS

The DOM cards keep the layout, the marquee, the drop shadow on the "wall", and the accessible text. With the cloth on, a card's **contents** go to `opacity:0`; Ember used `visibility:hidden`, which hides the text from assistive tech. The canvas draws the paper.

```html
<section class="cards">
  <div class="crow">
    <figure class="card" data-key="r1"><q>Arrived hotter than my building's hot water.</q>
      <figcaption class="card__who"><span class="card__av">R</span><div>Riya S.<small>Firecracker Chicken</small></div></figcaption></figure>
    <!-- … cards, then the same cards again so the loop is seamless (duplicates share a texture via data-key) -->
  </div>
</section>
```

```css
.cards{position:relative;overflow:hidden;padding:clamp(90px,11vw,160px) 0}
.crow{display:flex;width:max-content;gap:18px;padding:6px 0 10px;animation:marq 70s linear infinite}
.crow + .crow{margin-top:18px;animation-direction:reverse;animation-duration:80s}
.cards:hover .crow{animation-play-state:paused}
@keyframes marq{to{transform:translateX(-50%)}}
.card{position:relative;width:clamp(280px,26vw,380px);padding:30px 24px 24px;margin:14px 0 0;border-radius:4px;background:#FFF9EF;
  box-shadow:0 14px 22px -14px rgba(36,8,5,.45),0 2px 4px rgba(36,8,5,.08);transform:rotate(var(--tilt,0deg))}
.card:nth-child(3n+1){--tilt:-1.2deg}.card:nth-child(3n+2){--tilt:.8deg}.card:nth-child(3n){--tilt:-.4deg}
.card__av{display:inline-grid;place-items:center;width:34px;height:34px;border-radius:50%;background:#F2C14E}
/* wind on: WebGL draws the paper; the DOM card keeps its shadow and accessible text */
.windcv{position:absolute;inset:0;width:100%;height:100%;z-index:2;pointer-events:none;display:block}
.wind-on .card{transform:none;background:transparent;box-shadow:0 18px 24px -16px rgba(36,8,5,.38),0 2px 6px rgba(36,8,5,.06)}
.wind-on .card > *{opacity:0}
.wind-on .card::before{display:none}            /* if the DOM card drew its own tape */
@media (prefers-reduced-motion: reduce){ .crow{animation:none} }
```

---

## 2 · Shaders

```js
/* vertex: q = px from the sheet's centre (y up). The taped line (uPin px below the top) stays put;
   below it the sheet hangs (hang^1.35) and a gust envelope modulates three travelling waves. */
const windVert = `
  uniform float uTime, uPhase, uAmp, uPin, uTilt; uniform vec2 uSize;
  varying vec2 vUv; varying vec3 vN;
  vec3 disp(vec2 q){                                   // q: px from the sheet's centre, y up
    float top = uSize.y * 0.5 - uPin;                  // the taped line stays put
    float hang = clamp((top - q.y) / (uSize.y - uPin), 0.0, 1.0);
    float h = pow(hang, 1.35);
    float gust = 0.62 + 0.38 * sin(uTime * 0.63 + uPhase) * sin(uTime * 0.27 + uPhase * 2.1);
    float w1 = sin(q.x * 0.013 - uTime * 2.4 + uPhase + hang * 1.8);
    float w2 = sin(q.x * 0.027 + q.y * 0.018 - uTime * 3.6 + uPhase * 1.7);
    float w3 = sin(q.y * 0.03 - uTime * 4.4 + q.x * 0.006 + uPhase);
    float z = uAmp * h * gust * (w1 * 0.62 + w2 * 0.26 + w3 * 0.12);
    float lift = uAmp * 0.45 * h * h * gust * (0.6 + 0.4 * w1);   // the free edge lifts in the breeze
    float sway = 9.0 * h * sin(uTime * 1.25 + uPhase) * gust;
    return vec3(sway, lift, z);
  }
  void main(){
    vUv = uv;
    vec2 q = position.xy * uSize;
    vec3 p = vec3(q, 0.0) + disp(q);
    /* finite-difference normal: displace two neighbours 2 px away */
    vec3 px = vec3(q + vec2(2.0, 0.0), 0.0) + disp(q + vec2(2.0, 0.0));
    vec3 py = vec3(q + vec2(0.0, 2.0), 0.0) + disp(q + vec2(0.0, 2.0));
    vN = normalize(cross(px - p, py - p));
    mat2 rot = mat2(cos(uTilt), sin(uTilt), -sin(uTilt), cos(uTilt));   // the card's CSS tilt
    p.xy = rot * p.xy; vN.xy = rot * vN.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }`

const windFrag = `
  uniform sampler2D uTex; varying vec2 vUv; varying vec3 vN;
  void main(){
    vec4 c = texture2D(uTex, vUv); if (c.a < 0.02) discard;
    vec3 n = normalize(gl_FrontFacing ? vN : -vN), L = normalize(vec3(-0.35, 0.55, 0.76));
    float shade = 1.0 + (dot(n, L) - L.z) * 1.15;      // flat = untouched paper; folds catch light
    float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 28.0) * 0.07;
    gl_FragColor = vec4(c.rgb * shade + spec, c.a);
  }`
```

---

## 3 · Stage: shared geometry, card textures from the DOM, per-frame rect sync

```js
import * as THREE from 'three'

const TAU = Math.PI * 2
const fitText = (x, word, X, Y, w) => {
  const cw = x.measureText(word).width
  if (cw > w * 1.01 && w > 0){ x.save(); x.translate(X, Y); x.scale(w / cw, 1); x.fillText(word, 0, 0); x.restore() }
  else x.fillText(word, X, Y)
}

export function createWindCards(sec, cards, { reduced = false, paper = '#FFF9EF', avatarSel = '.card__av', tape = true } = {}){
  const cv = document.createElement('canvas'); cv.className = 'windcv'; cv.setAttribute('aria-hidden', 'true')
  let r3 = null
  try { r3 = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }) } catch (e) { return null }
  if (!cards.length){ r3.dispose(); return null }
  sec.appendChild(cv)
  r3.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); r3.setClearColor(0x000000, 0)
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, 1, 20000)
  /* texture scale, and margins around the card for the tape (top), sides and bottom */
  const S = 2, TM = 18, SM = 8, BM = 8
  let texOf = new Map(), CW = 0, CH = 0
  const geo = new THREE.PlaneGeometry(1, 1, 30, 20)                        // one geometry for every card
  const meshes = cards.map((c, i) => {
    const mat = new THREE.ShaderMaterial({ vertexShader: windVert, fragmentShader: windFrag, transparent: true, depthTest: false,
      side: THREE.DoubleSide, uniforms: { uTex: { value: null }, uTime: { value: 0 }, uPhase: { value: (i * 1.37) % TAU },
        uSize: { value: new THREE.Vector2(1, 1) }, uPin: { value: TM }, uAmp: { value: reduced ? 10 : 34 }, uTilt: { value: 0 } } })
    const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.visible = false; scene.add(m); return m
  })
  /* the static CSS tilt, read once per card (not per frame) */
  const tilts = cards.map(c => -(parseFloat(getComputedStyle(c).getPropertyValue('--tilt')) || 0) * Math.PI / 180)

  /* the card, once, onto a canvas: paper, words where the browser put them, avatar, tape */
  const draw = card => {
    const key = card.dataset.key || card.textContent.trim()
    if (texOf.has(key)) return texOf.get(key)
    const cr = card.getBoundingClientRect(), W = card.offsetWidth, H = card.offsetHeight, z = cr.width / W || 1
    const TW = W + SM * 2, TH = H + TM + BM
    const c = document.createElement('canvas'); c.width = Math.round(TW * S); c.height = Math.round(TH * S)
    const x = c.getContext('2d'); x.scale(S, S); x.translate(SM, TM)
    x.save(); x.beginPath(); x.roundRect(0, 0, W, H, 4); x.fillStyle = paper; x.fill(); x.clip()
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(255,255,255,.6)'); g.addColorStop(0.3, 'rgba(255,255,255,0)')
    x.fillStyle = g; x.fillRect(0, 0, W, H)
    x.fillStyle = 'rgba(0,0,0,.014)'; for (let yy = 0; yy < H; yy += 3) x.fillRect(0, yy, W, 1)
    x.restore()
    const av = avatarSel && card.querySelector(avatarSel)
    if (av){ const ar = av.getBoundingClientRect()
      x.fillStyle = getComputedStyle(av).backgroundColor
      x.beginPath(); x.arc((ar.left - cr.left + ar.width / 2) / z, (ar.top - cr.top + ar.height / 2) / z, ar.width / 2 / z, 0, TAU); x.fill() }
    const tw = document.createTreeWalker(card, NodeFilter.SHOW_TEXT), rg = document.createRange()
    x.textBaseline = 'middle'
    for (let t = tw.nextNode(); t; t = tw.nextNode()){
      if (!t.textContent.trim()) continue
      const cs = getComputedStyle(t.parentElement)
      x.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
      x.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing
      x.fillStyle = cs.color; x.globalAlpha = 1                          // the DOM children are opacity:0 while wind is on
      const up = cs.textTransform === 'uppercase'
      for (const mt of t.textContent.matchAll(/\S+/g)){
        rg.setStart(t, mt.index); rg.setEnd(t, mt.index + mt[0].length)
        const r = rg.getBoundingClientRect()
        fitText(x, up ? mt[0].toUpperCase() : mt[0], (r.left - cr.left) / z, (r.top - cr.top + r.height / 2) / z, r.width / z)
      }
    }
    x.globalAlpha = 1; x.letterSpacing = '0px'
    if (tape){                                                            // translucent tape with torn ends
      x.save(); x.translate(W / 2, 1); x.rotate(-3 * Math.PI / 180)
      x.shadowColor = 'rgba(36,8,5,.18)'; x.shadowBlur = 3; x.shadowOffsetY = 1
      x.beginPath(); x.moveTo(-42, -12)
      for (let k = 0; k <= 6; k++) x.lineTo(42 - (k % 2) * 3, -12 + k * 4)
      for (let k = 0; k <= 6; k++) x.lineTo(-42 + (k % 2) * 3, 12 - k * 4)
      x.closePath(); x.fillStyle = 'rgba(250,244,226,.82)'; x.fill(); x.restore()
    }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.NoColorSpace; tex.anisotropy = 4
    const v = { tex, TW, TH }; texOf.set(key, v); return v
  }

  /* camera distance makes 1 world unit = 1 CSS px over the section */
  const layout = () => {
    CW = sec.clientWidth; CH = sec.clientHeight
    r3.setSize(CW, CH, false)
    cam.aspect = CW / CH; cam.position.set(0, 0, (CH / 2) / Math.tan(15 * Math.PI / 180)); cam.updateProjectionMatrix()
  }

  /* per frame: one rect read for the canvas and one per card (the marquee moves them), cull off-screen cards */
  const frame = t => {
    const sr = cv.getBoundingClientRect()
    cards.forEach((card, i) => {
      const m = meshes[i], r = card.getBoundingClientRect()
      if (r.right < sr.left - 60 || r.left > sr.right + 60 || r.bottom < sr.top - 60 || r.top > sr.bottom + 60){ m.visible = false; return }
      const d = draw(card), u = m.material.uniforms
      u.uTex.value = d.tex; u.uSize.value.set(d.TW, d.TH); u.uTime.value = t; u.uTilt.value = tilts[i]
      const cx = r.left - sr.left + r.width / 2, cy = r.top - sr.top - TM + d.TH / 2
      m.position.set(cx - CW / 2, CH / 2 - cy, 0); m.visible = true
    })
    r3.render(scene, cam)
  }

  /* on resize: textures are drawn at layout size, so drop them and re-layout */
  const resize = () => { texOf.forEach(v => v.tex.dispose()); texOf = new Map(); layout() }

  layout(); sec.classList.add('wind-on')
  return { frame, resize, dispose(){
    sec.classList.remove('wind-on')
    texOf.forEach(v => v.tex.dispose()); texOf.clear()
    meshes.forEach(m => m.material.dispose()); geo.dispose(); r3.dispose(); cv.remove()
  } }
}
```

**Parameters:** `PlaneGeometry(1, 1, 30, 20)` shared · amplitude 34 px (10 under reduced motion) · gust `0.62 + 0.38·sin(t·.63+φ)·sin(t·.27+2.1φ)` · waves at 2.4 / 3.6 / 4.4 rad/s · edge lift `0.45·h²` · sway 9 px · per-card phase `i·1.37 mod 2π` · DPR ≤ 2 · cull margin 60 px.

---

## 4 · motion-kit wrapper

```js
MK.effect('wind-cards', (el, o) => {
  let wind = null, rsz = 0
  document.fonts.ready.then(() => {                                     // textures need the real fonts
    if (!o.alive()) return
    wind = createWindCards(el, o.qa('.card'))
    if (!wind) return                                                   // no WebGL: DOM cards stay
    o.on(window, 'resize', () => { clearTimeout(rsz); rsz = setTimeout(wind.resize, 120) })
    o.loop((dt, time) => wind.frame(time), { el, margin: '0px' })
  })
  o.cleanup(() => { clearTimeout(rsz); if (wind) wind.dispose() })
}, { reduced: () => {} })                                               // reduced motion: DOM cards, marquee stopped by CSS
```

Ember's per-frame loop called `getComputedStyle(card)` for `--tilt` on every card in every frame. Here the tilt is read once at setup, because it is a static nth-child value. If the tilts ever animate, read them in the same pass as the rects.
