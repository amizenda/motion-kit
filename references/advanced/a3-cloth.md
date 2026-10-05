# A3 · Verlet cloth paper — reference code

A printed sheet (a receipt, a ticket, a note) hangs from a slot. It drifts as if underwater, dents under the cursor and shudders when "stamped". The sheet is a Verlet cloth, and its texture is redrawn from the live DOM sheet whenever that sheet changes.
Origin: Ember. Dependencies: three.js r169 ES module (works r150+). No GSAP needed inside; any tween library can animate the DOM sheet it copies.
Wrap it as `MK.effect('cloth-paper', (el, o) => { … })` (section 4). `o.loop(fn, { el })` runs it only while the section is in view, `o.cleanup` disposes the renderer, texture, geometry and listeners, and the static fallback is the DOM sheet itself. Without WebGL or under reduced motion the sheet is simply left visible.

---

## 1 · Markup and CSS

The DOM sheet stays laid out and readable to assistive tech. While the cloth shows it, the sheet is `opacity:0`. **Never use `visibility:hidden` on it.** The canvas is positioned over the sheet inside a positioned `holder`.

```html
<div class="clothwrap">                       <!-- holder: position:relative -->
  <div class="slot" aria-hidden="true"></div>  <!-- the printer / slot the sheet hangs from (DOM, never moves) -->
  <div class="sheet">
    <div class="ln ln--big">ORDER #4471</div>
    <div class="ln"><span>2 × Firecracker Chicken</span><span>840</span></div>
    <div class="rule"></div>
    <div class="ln"><span>TOTAL</span><span>1,730</span></div>
    <div class="stamp">FIRED<small>21:49</small></div>
  </div>
  <div class="clothshadow" aria-hidden="true"></div>
</div>
```

```css
.clothwrap{position:relative;width:min(450px,100%)}
.sheet{position:relative;margin:-12px 24px 0;padding:34px 28px 40px;background:#FCFAF5;color:#2A2220;
  font:13.5px/1.55 ui-monospace,monospace}
.ln{display:flex;justify-content:space-between;gap:12px}
.rule{border-top:1.5px dashed rgba(36,8,5,.35);margin:10px 0}
.stamp{position:absolute;right:26px;top:37%;padding:7px 14px 6px;border:3.5px solid #C8231A;border-radius:9px;
  color:#C8231A;font-weight:800;font-size:42px;line-height:1;text-align:center;mix-blend-mode:multiply;transform:rotate(-12deg)}
.stamp small{display:block;font-size:10px;letter-spacing:.12em;margin-top:3px}
.clothshadow{position:absolute;left:12%;right:12%;bottom:-46px;height:34px;border-radius:50%;
  background:radial-gradient(closest-side,rgba(36,8,5,.45),rgba(36,8,5,0));filter:blur(6px)}
/* cloth on */
.cloth{position:absolute;z-index:1;display:block;pointer-events:none}
.cloth-on .sheet{opacity:0}
```

Optional print-in reveal: animate a `--hide` percentage on the sheet (for example `clip-path: inset(0 0 var(--hide) 0)`). The texture honours it.

---

## 2 · The cloth

```js
import * as THREE from 'three'

/* draw a word at the browser's position, squeezed to the browser's width if
   the canvas renders the font a touch wider (it can't use every font feature) */
const fitText = (x, word, X, Y, w) => {
  const cw = x.measureText(word).width
  if (cw > w * 1.01 && w > 0){ x.save(); x.translate(X, Y); x.scale(w / cw, 1); x.fillText(word, 0, 0); x.restore() }
  else x.fillText(word, X, Y)
}
const offsetIn = (el, root) => { let x = 0, y = 0; for (let e = el; e && e !== root; e = e.offsetParent){ x += e.offsetLeft; y += e.offsetTop } return { x, y } }

export function createClothPaper(sheet, { holder = sheet.parentElement, shadow = null, paper = '#FCFAF5',
  ruleSel = '.rule', stampSel = '.stamp', reduced = false } = {}){
  const cv = document.createElement('canvas'); cv.className = 'cloth'; cv.setAttribute('aria-hidden', 'true')
  let r2 = null
  try { r2 = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }) } catch (e) { return null }
  holder.appendChild(cv); holder.classList.add('cloth-on')
  r2.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); r2.outputColorSpace = THREE.SRGBColorSpace
  r2.setClearColor(0x000000, 0)
  const scene = new THREE.Scene()
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a5a4a, 0.9))
  const sun = new THREE.DirectionalLight(0xfffaf2, 1.25); sun.position.set(-0.45, 0.75, 1); scene.add(sun)
  const cam = new THREE.PerspectiveCamera(30, 1, 1, 10000)
  const tc = document.createElement('canvas'), tx = tc.getContext('2d')
  const tex = new THREE.CanvasTexture(tc); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4
  /* half the paper's brightness is its own (emissive), half is light — so it
     stays paper-white facing you and only the folds pick up shading */
  const mat = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.55,
    side: THREE.DoubleSide, roughness: 0.9, metalness: 0, alphaTest: 0.5 })
  /* grid NX × NY, texture scale S, canvas padding so the sheet can swing outside its box */
  const NX = 16, NY = 22, S = 2, PADX = 120, PADB = 160, TOP = 4
  let mesh = null, geo = null, P, Q, R, W = 0, H = 0, CW = 0, CH = 0, cons = [], sig = '', ready = false, kickT = -9, lastT = 0

  /* size the canvas around the sheet; camera distance makes 1 world unit = 1 CSS px */
  const layout = () => {
    const w = sheet.offsetWidth, h = sheet.offsetHeight
    if (!w || !h) return false
    const { x: L, y: T } = offsetIn(sheet, holder)
    W = w; H = h; CW = W + PADX * 2; CH = H + TOP + PADB
    Object.assign(cv.style, { left: (L - PADX) + 'px', top: (T - TOP) + 'px', width: CW + 'px', height: CH + 'px' })
    r2.setSize(CW, CH, false)
    cam.aspect = CW / CH; cam.position.set(0, 0, (CH / 2) / Math.tan(15 * Math.PI / 180)); cam.updateProjectionMatrix()
    if (mesh){ scene.remove(mesh); geo.dispose() }
    geo = new THREE.PlaneGeometry(W, H, NX - 1, NY - 1)
    mesh = new THREE.Mesh(geo, mat); scene.add(mesh)
    /* P = current, Q = previous, R = rest positions (row-major, row 0 = top = pinned) */
    const n = NX * NY; P = new Float32Array(n * 3); Q = new Float32Array(n * 3); R = new Float32Array(n * 3)
    const dx = W / (NX - 1), dy = H / (NY - 1), x0 = -CW / 2 + PADX, y0 = CH / 2 - TOP
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++){ const k = (j * NX + i) * 3
      R[k] = x0 + i * dx; R[k + 1] = y0 - j * dy; R[k + 2] = 0 }
    P.set(R); Q.set(R)
    /* constraints: [a, b, restLength] — structural, shear, and bend (skip-one) springs */
    cons = []
    const add = (a, b) => cons.push(a, b, Math.hypot(R[a * 3] - R[b * 3], R[a * 3 + 1] - R[b * 3 + 1]))
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++){ const k = j * NX + i
      if (i < NX - 1) add(k, k + 1)
      if (j < NY - 1) add(k, k + NX)
      if (i < NX - 1 && j < NY - 1){ add(k, k + NX + 1); add(k + 1, k + NX) }
      if (i < NX - 2) add(k, k + 2)                 // bend: paper resists folding
      if (j < NY - 2) add(k, k + 2 * NX)
    }
    tc.width = Math.round(W * S); tc.height = Math.round(H * S); sig = ''
    return true
  }

  /* redraw the printed sheet onto the cloth texture, from the live DOM */
  const opacityOf = el => { let o = 1; for (let e = el; e && e !== sheet; e = e.parentElement) o *= +getComputedStyle(e).opacity; return o }
  const drawTex = () => {
    const tr = sheet.getBoundingClientRect(), z = tr.width / W || 1          // z: any CSS zoom/scale on ancestors
    const hv = parseFloat(sheet.style.getPropertyValue('--hide')), hide = isNaN(hv) ? 0 : hv
    const cut = H * (1 - hide / 100)
    const x = tx
    x.setTransform(S, 0, 0, S, 0, 0); x.clearRect(0, 0, W, H); x.globalAlpha = 1
    if (cut <= 0.5){ tex.needsUpdate = true; return }
    x.save(); x.beginPath(); x.rect(0, 0, W, cut); x.clip()
    /* paper with a torn zigzag foot (alphaTest cuts the transparent teeth) */
    const zz = 9, zw = 18
    x.beginPath(); x.moveTo(0, 0); x.lineTo(W, 0); x.lineTo(W, H - zz)
    for (let px = W; px > 0; px -= zw){ x.lineTo(px - zw / 2, H); x.lineTo(Math.max(0, px - zw), H - zz) }
    x.closePath(); x.fillStyle = paper; x.fill()
    x.save(); x.clip()
    const g = x.createLinearGradient(0, 0, W, 0)                            // faint side curl + fibre
    g.addColorStop(0, 'rgba(60,40,20,.09)'); g.addColorStop(0.07, 'rgba(60,40,20,0)'); g.addColorStop(0.93, 'rgba(60,40,20,0)'); g.addColorStop(1, 'rgba(60,40,20,.1)')
    x.fillStyle = g; x.fillRect(0, 0, W, H)
    x.fillStyle = 'rgba(0,0,0,.014)'; for (let yy = 0; yy < H; yy += 3) x.fillRect(0, yy, W, 1)
    x.restore()
    /* every word, where the browser laid it out */
    const tw = document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT), rg = document.createRange()
    x.textBaseline = 'middle'
    for (let t = tw.nextNode(); t; t = tw.nextNode()){
      const el = t.parentElement
      if (!t.textContent.trim() || (stampSel && el.closest(stampSel))) continue
      const op = opacityOf(el); if (op < 0.01) continue
      const cs = getComputedStyle(el)
      x.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
      x.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing
      x.fillStyle = cs.color; x.globalAlpha = op
      for (const mt of t.textContent.matchAll(/\S+/g)){
        rg.setStart(t, mt.index); rg.setEnd(t, mt.index + mt[0].length)
        const r = rg.getBoundingClientRect()
        fitText(x, cs.textTransform === 'uppercase' ? mt[0].toUpperCase() : mt[0], (r.left - tr.left) / z, (r.top - tr.top + r.height / 2) / z, r.width / z)
      }
    }
    x.globalAlpha = 1; x.letterSpacing = '0px'
    /* dashed rules */
    const rel = el => { const r = el.getBoundingClientRect(); return { l: (r.left - tr.left) / z, t: (r.top - tr.top) / z, w: r.width / z, h: r.height / z } }
    x.setLineDash([4, 3]); x.lineWidth = 1.5; x.strokeStyle = 'rgba(36,8,5,.35)'
    if (ruleSel) sheet.querySelectorAll(ruleSel).forEach(el => { const o = opacityOf(el); if (o < 0.01) return; const r = rel(el)
      x.globalAlpha = o; x.beginPath(); x.moveTo(r.l, r.t + 0.75); x.lineTo(r.l + r.w, r.t + 0.75); x.stroke() })
    x.setLineDash([]); x.globalAlpha = 1
    /* the stamp, with its live (spring-animated) transform */
    const stampEl = stampSel && sheet.querySelector(stampSel)
    if (stampEl){
      const scs = getComputedStyle(stampEl), so = +scs.opacity * opacityOf(stampEl.parentElement)
      if (so > 0.01){
        const m = scs.transform === 'none' ? new DOMMatrix() : new DOMMatrix(scs.transform)
        const w = stampEl.offsetWidth, h = stampEl.offsetHeight
        x.save(); x.globalAlpha = so; x.globalCompositeOperation = 'multiply'
        x.translate(stampEl.offsetLeft + w / 2, stampEl.offsetTop + h / 2); x.transform(m.a, m.b, m.c, m.d, m.e, m.f)
        x.strokeStyle = scs.color; x.lineWidth = parseFloat(scs.borderTopWidth) || 3.5
        x.beginPath(); x.roundRect(-w / 2 + x.lineWidth / 2, -h / 2 + x.lineWidth / 2, w - x.lineWidth, h - x.lineWidth, parseFloat(scs.borderTopLeftRadius) || 9); x.stroke()
        x.fillStyle = scs.color; x.textAlign = 'center'
        x.font = `${scs.fontWeight} ${scs.fontSize} ${scs.fontFamily}`; x.letterSpacing = scs.letterSpacing === 'normal' ? '0px' : scs.letterSpacing
        const fs = parseFloat(scs.fontSize), small = stampEl.querySelector('small')
        const main = [...stampEl.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim()
        x.fillText(main, 0, -h / 2 + parseFloat(scs.paddingTop) + fs * 0.5)
        if (small){
          const ss = getComputedStyle(small)
          x.font = `${ss.fontWeight} ${ss.fontSize} ${ss.fontFamily}`; x.letterSpacing = ss.letterSpacing === 'normal' ? '0px' : ss.letterSpacing
          x.fillText(small.textContent, 0, -h / 2 + small.offsetTop + small.offsetHeight / 2)
        }
        x.restore()
      }
    }
    x.restore()
    tex.needsUpdate = true
  }

  /* the water: slow currents, heavy drag, soft buoyant gravity; the cursor presses a dent in */
  const ptr = { x: 0, y: 0, on: false }
  const onPointer = e => {
    const r = cv.getBoundingClientRect(); if (!r.width) return
    const z = r.width / CW
    ptr.x = (e.clientX - r.left) / z - CW / 2; ptr.y = CH / 2 - (e.clientY - r.top) / z
    ptr.on = ptr.x > -CW / 2 && ptr.x < CW / 2 && ptr.y > -CH / 2 && ptr.y < CH / 2
  }
  const step = (t, h) => {
    const k = reduced ? 0.35 : 1, damp = 0.962, G = 180, h2 = h * h
    const kick = Math.max(0, 1 - (t - kickT) / 0.6)                       // stamp shudder, 0.6 s
    for (let j = 1; j < NY; j++){ const f = j / (NY - 1)                    // row 0 pinned; currents grow toward the free end
      for (let i = 0; i < NX; i++){ const q = (j * NX + i) * 3
        const px = P[q], py = P[q + 1], pz = P[q + 2]
        let ax = (Math.sin(t * 0.62 + j * 0.3) * 272 + Math.sin(t * 1.55 + i * 0.5 + j * 0.2) * 96) * f * k
        let ay = -G + Math.sin(t * 0.85 + i * 0.3) * 18 * f * k
        let az = (Math.sin(t * 1.05 + i * 0.42 + j * 0.28) * 285 + Math.sin(t * 0.47 - j * 0.22 + i * 0.1) * 210
          + Math.sin(t * 2.2 - j * 0.55 + i * 0.15) * 90) * f * k      // + a ripple travelling down the sheet
        az += kick * Math.sin(i * 0.9 + j * 0.6) * 900 * f
        if (ptr.on){ const d = Math.hypot(px - ptr.x, py - ptr.y)
          if (d < 110){ const s2 = (1 - d / 110); az -= s2 * s2 * 1400 } }
        /* Verlet: x' = x + (x - x_prev)·damping + a·h² */
        P[q] = px + (px - Q[q]) * damp + ax * h2
        P[q + 1] = py + (py - Q[q + 1]) * damp + ay * h2
        P[q + 2] = pz + (pz - Q[q + 2]) * damp + az * h2
        Q[q] = px; Q[q + 1] = py; Q[q + 2] = pz
      }
    }
    /* 12 relaxation passes; pinned points (top row) never move */
    for (let it = 0; it < 12; it++){
      for (let c = 0; c < cons.length; c += 3){
        const a = cons[c] * 3, b = cons[c + 1] * 3, L = cons[c + 2]
        const dx = P[b] - P[a], dy = P[b + 1] - P[a + 1], dz = P[b + 2] - P[a + 2]
        const d = Math.hypot(dx, dy, dz) || 1e-6, diff = (d - L) / d
        const pa = cons[c] < NX, pb = cons[c + 1] < NX
        if (pa && pb) continue
        const wa = pa ? 0 : pb ? 1 : 0.5, wb = pb ? 0 : pa ? 1 : 0.5
        P[a] += dx * diff * wa; P[a + 1] += dy * diff * wa; P[a + 2] += dz * diff * wa
        P[b] -= dx * diff * wb; P[b + 1] -= dy * diff * wb; P[b + 2] -= dz * diff * wb
      }
      for (let i = 0; i < NX * 3; i++) P[i] = R[i]          // pinned in the slot
    }
  }

  /* t: seconds (any monotonic clock), dt: seconds */
  const frame = (t, dt) => {
    lastT = t
    dt = Math.min(1 / 30, dt)
    if (!ready) ready = layout()
    if (!ready) return
    const sg = sheet.style.cssText + sheet.innerHTML                     // cheap change signature
    if (sg !== sig){ sig = sg; drawTex() }                               // redraw only when the DOM sheet changed
    step(t, dt / 2); step(t + dt / 2, dt / 2)                            // 2 substeps
    geo.attributes.position.array.set(P); geo.attributes.position.needsUpdate = true; geo.computeVertexNormals()
    r2.render(scene, cam)
    if (shadow){ let mx = 0; for (let i = 0; i < NX; i++) mx += P[((NY - 1) * NX + i) * 3] - R[((NY - 1) * NX + i) * 3]
      shadow.style.transform = `translateX(${(mx / NX * 0.8).toFixed(1)}px)` }   // the shadow follows the hem
  }

  return {
    frame, onPointer,
    kick(){ kickT = lastT },                                             // shudder (call ~80 ms after the stamp lands)
    invalidate(){ ready = false },                                       // on resize: re-layout + rebuild grid and texture
    redraw(){ sig = '' },                                                // force a texture redraw (e.g. after a class toggle)
    dispose(){
      if (geo) geo.dispose(); mat.dispose(); tex.dispose(); r2.dispose(); cv.remove()
      holder.classList.remove('cloth-on'); if (shadow) shadow.style.transform = ''
    },
  }
}
```

**Change detection:** the signature is `sheet.style.cssText + sheet.innerHTML`, so animations must write **inline styles** on the sheet or its children. Ember's line-by-line print-in and the stamp's spring both did. A change made only through a class on an ancestor is invisible to the signature; call `redraw()` after one. This is why the texture is rebuilt on change and not every frame.

Ember's ticket also drew an ETA track, a progress bar and a bike icon onto the texture with the same `rel()` rectangles. That was site-specific and is left out here; any extra element goes in the same way: read its rect, draw it.

---

## 3 · Parameters

16 × 22 grid · 12 constraint iterations · 2 substeps per frame (dt capped at 1/30) · damping 0.962 · gravity 180 · cursor dent radius 110 px, strength 1400 · stamp kick 900 for 0.6 s · `alphaTest .5` (torn foot) · `DoubleSide` · DPR ≤ 2. Under reduced motion Ember scaled the currents to 0.35. The wrapper below shows the DOM sheet instead.

---

## 4 · motion-kit wrapper

```js
MK.effect('cloth-paper', (el, o) => {
  // el = the section that contains .clothwrap; the loop runs only while it is in view
  const sheet = o.q('.sheet'), holder = o.q('.clothwrap')
  if (!sheet || !holder) return
  const cloth = createClothPaper(sheet, { holder, shadow: o.q('.clothshadow'), reduced: o.is.reduce })
  if (!cloth) return                                                    // no WebGL: the DOM sheet stays
  o.on(window, 'pointermove', cloth.onPointer, { passive: true })
  o.on(window, 'resize', cloth.invalidate)
  o.on(el, 'cloth:kick', () => setTimeout(cloth.kick, 80))              // el.dispatchEvent(new Event('cloth:kick')) when the stamp lands
  document.fonts.ready.then(() => { if (o.alive()) cloth.redraw() })
  o.loop((dt, time) => cloth.frame(time, dt), { el, margin: '0px' })
  o.cleanup(cloth.dispose)
}, { reduced: () => {} })                                               // reduced motion: leave the DOM sheet as is
```
