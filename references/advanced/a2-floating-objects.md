# A2 · 3D floating objects hero — reference code

Glossy 3D objects pop in from below (centre first, `back.out(1.6)`), then bob and tumble. They parallax with the cursor, swell on hover, hop and spin on tap, and scatter toward the camera as the hero scrolls away. A second variant has spices orbiting a word and dodging the cursor on a spring.
Origin: Fizzy Fjord (candies: SDF-inflated geometry, studio env, scene, layout, motion, bokeh) and Ember (procedural chili / star anise / peppercorn, orbit, cursor-dodge spring). Dependencies: three.js. Fizzy shipped r158 UMD and Ember r169 ESM; the code below is ES modules for r169 and works on r155+. GSAP (entrance and pop tweens).
Wrap it as `MK.effect('floating-objects', (el, o) => { … })` (section 5). `o.loop(fn, { el })` drives the frame, `o.trigger` feeds the scroll scatter, `o.cleanup` disposes the scene, env and renderer, `MK.damp` smooths the cursor (rate ≈ 3.6), and the static fallback is floating PNG cut-outs, or one rendered frame under reduced motion.

**File layout:** sections 1–3 form one module (`floating-hero.js`). Section 4 is a second module (`spices.js`). Section 5 imports from both.

The **brand GLB models** (loaded with `GLTFLoader`, dropped into the same holders) are usually a better choice than the procedural shapes below. Use the SDF kit when there is no model and time to tune it.

---

## 1 · Geometry kit: SDF inflation and curve sweeps (Fizzy)

`inflate()` shrink-wraps a UV sphere onto the outermost zero-crossing of a signed-distance function, with analytic normals taken from the SDF gradient. That gives seamless "merged blob" shapes (gummy bear, puffy heart) without marching cubes. `sweep()` extrudes a cross-section along a parametric curve.

```js
import * as THREE from 'three'

/* seeded random so renders are repeatable */
let seed = 7
export function rnd(){ seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
export const reseed = s => { seed = s }
export function seeded(s){ return () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }

/* ---------- SDF helpers ---------- */
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x)
export function smin(a, b, k){ const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25 }
export function smax(a, b, k){ return -smin(-a, -b, k) }
export function sdSphere(x, y, z, cx, cy, cz, r){ const dx = x - cx, dy = y - cy, dz = z - cz; return Math.sqrt(dx * dx + dy * dy + dz * dz) - r }
export function sdEll(x, y, z, cx, cy, cz, rx, ry, rz){
  const px = x - cx, py = y - cy, pz = z - cz
  const a = px / rx, b = py / ry, c = pz / rz
  const k0 = Math.sqrt(a * a + b * b + c * c)
  const d = px / (rx * rx), e = py / (ry * ry), f = pz / (rz * rz)
  const k1 = Math.sqrt(d * d + e * e + f * f)
  return k1 < 1e-9 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1
}
export function sdCap(x, y, z, ax, ay, az, bx, by, bz, r){
  const pax = x - ax, pay = y - ay, paz = z - az, bax = bx - ax, bay = by - ay, baz = bz - az
  const h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0, 1)
  const dx = pax - bax * h, dy = pay - bay * h, dz = paz - baz * h
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - r
}

/* Inflate a UV sphere onto the outermost zero-crossing of an SDF, with analytic (gradient) normals.
   o: { w, h (sphere segments), aspect [x,y,z] ray stretch, center [x,y,z], rMax (start radius) } */
export function inflate(sdf, o = {}){
  const g = new THREE.SphereGeometry(1, o.w || 150, o.h || 110)
  const pos = g.attributes.position, nor = g.attributes.normal
  const a = o.aspect || [1, 1, 1], c = o.center || [0, 0, 0], rMax = o.rMax || 2, e = 0.0012
  for (let i = 0; i < pos.count; i++){
    let dx = pos.getX(i) * a[0], dy = pos.getY(i) * a[1], dz = pos.getZ(i) * a[2]
    const l = Math.sqrt(dx * dx + dy * dy + dz * dz); dx /= l; dy /= l; dz /= l
    let r = rMax, prev = sdf(c[0] + dx * r, c[1] + dy * r, c[2] + dz * r), hit = false
    while (r > 0.0005){                                  // march inward from outside...
      const st = Math.max(0.012, Math.min(prev * 0.7, 0.15))
      const r2 = r - st, d2 = sdf(c[0] + dx * r2, c[1] + dy * r2, c[2] + dz * r2)
      if (d2 <= 0){                                       // ...then bisect the crossing
        let lo = r2, hi = r
        for (let k = 0; k < 16; k++){ const m = (lo + hi) * 0.5; if (sdf(c[0] + dx * m, c[1] + dy * m, c[2] + dz * m) <= 0) lo = m; else hi = m }
        r = (lo + hi) * 0.5; hit = true; break
      }
      r = r2; prev = d2
    }
    if (!hit) r = 0.001
    const px = c[0] + dx * r, py = c[1] + dy * r, pz = c[2] + dz * r
    pos.setXYZ(i, px, py, pz)
    const nx = sdf(px + e, py, pz) - sdf(px - e, py, pz), ny = sdf(px, py + e, pz) - sdf(px, py - e, pz), nz = sdf(px, py, pz + e) - sdf(px, py, pz - e)
    const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1
    nor.setXYZ(i, nx / nl, ny / nl, nz / nl)
  }
  pos.needsUpdate = true; nor.needsUpdate = true
  g.computeBoundingSphere()
  return g
}

/* Sweep a cross-section along a curve (indexed grid → smooth normals).
   pt(u, out) → point on the curve; prof(u, v) → [x, y] in the section plane;
   o: { nu, nv, up, cap(u) → section scale (for rounded ends), color(u, v, q, outColor) } */
const _P = new THREE.Vector3(), _Pa = new THREE.Vector3(), _Pb = new THREE.Vector3(), _T = new THREE.Vector3(), _N = new THREE.Vector3(), _B = new THREE.Vector3()
export function sweep(pt, prof, o){
  const nu = o.nu || 200, nv = o.nv || 24, up = o.up || new THREE.Vector3(0, 0, 1)
  const verts = [], uvs = [], idx = [], cols = o.color ? [] : null, col = new THREE.Color()
  for (let i = 0; i <= nu; i++){
    const u = i / nu
    pt(u, _P); pt(Math.min(1, u + 1e-3), _Pb); pt(Math.max(0, u - 1e-3), _Pa)
    _T.subVectors(_Pb, _Pa).normalize()
    _N.copy(up).addScaledVector(_T, -_T.dot(up)).normalize()
    _B.crossVectors(_T, _N).normalize()
    const s = o.cap ? o.cap(u) : 1
    for (let j = 0; j <= nv; j++){
      const v = j / nv, q = prof(u, v)
      verts.push(_P.x + (_B.x * q[0] + _N.x * q[1]) * s, _P.y + (_B.y * q[0] + _N.y * q[1]) * s, _P.z + (_B.z * q[0] + _N.z * q[1]) * s)
      uvs.push(u, v)
      if (cols){ o.color(u, v, q, col); cols.push(col.r, col.g, col.b) }
    }
  }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++){ const a = i * (nv + 1) + j, b = a + nv + 1; idx.push(a, b, a + 1, b, b + 1, a + 1) }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  if (cols) g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  const n = g.attributes.normal                          // weld the v-seam normals
  for (let i = 0; i <= nu; i++){
    const s0 = i * (nv + 1), s1 = s0 + nv
    const x = n.getX(s0) + n.getX(s1), y = n.getY(s0) + n.getY(s1), z = n.getZ(s0) + n.getZ(s1), L = Math.sqrt(x * x + y * y + z * z) || 1
    n.setXYZ(s0, x / L, y / L, z / L); n.setXYZ(s1, x / L, y / L, z / L)
  }
  g.computeBoundingSphere()
  return g
}
/* rounded ends for sweep(): section scale falls to minS over the first/last capU of the curve */
export function capFn(capU, minS){
  return u => {
    const t = u < capU ? 1 - u / capU : u > 1 - capU ? (u - (1 - capU)) / capU : 0
    return Math.max(minS || 0.02, Math.sqrt(Math.max(0, 1 - t * t)))
  }
}

/* ---------- two inflated shapes ---------- */
const cache = {}
const once = (key, fn) => cache[key] || (cache[key] = fn())

export function bearGeo(){
  return once('bear', () => {
    const sdf = (x, y, z) => {
      const ax = Math.abs(x) // mirror
      let d = sdEll(x, y, z, 0, -0.18, 0, 0.5, 0.58, 0.4)
      d = smin(d, sdEll(x, y, z, 0, 0.5, 0, 0.44, 0.38, 0.36), 0.16)            // head
      d = smin(d, sdSphere(ax, y, z, 0.3, 0.84, -0.02, 0.15), 0.08)               // ears
      d = smin(d, sdEll(x, y, z, 0, 0.4, 0.28, 0.17, 0.13, 0.13), 0.1)            // snout
      d = smin(d, sdCap(ax, y, z, 0.34, 0.08, 0.06, 0.6, -0.12, 0.2, 0.15), 0.12) // arms
      d = smin(d, sdCap(ax, y, z, 0.24, -0.55, 0.08, 0.3, -0.78, 0.26, 0.19), 0.12) // legs
      d = smin(d, sdEll(x, y, z, 0, -0.22, 0.2, 0.32, 0.36, 0.24), 0.14)          // belly
      d = smax(d, -sdSphere(ax, y, z, 0.16, 0.58, 0.33, 0.045), 0.03)            // eye dimples
      return d
    }
    const g = inflate(sdf, { rMax: 1.4, center: [0, 0.05, 0], aspect: [1, 1.15, 0.8], w: 170, h: 130 })
    g.translate(0, 0.02, 0)
    return g
  })
}
export function heartGeo(){
  return once('heart', () => {
    function h2(px, py){                                   // 2D heart SDF
      px = Math.abs(px)
      if (py + px > 1){ const dx = px - 0.25, dy = py - 0.75; return Math.sqrt(dx * dx + dy * dy) - Math.SQRT2 / 4 }
      const a = px * px + (py - 1) * (py - 1), m = 0.5 * Math.max(px + py, 0), b = (px - m) * (px - m) + (py - m) * (py - m)
      return Math.sqrt(Math.min(a, b)) * Math.sign(px - py)
    }
    const S = 1.1, R = 0.3
    const sdf = (x, y, z) => {                             // extruded + rounded by R
      const d2 = h2(x / S, y / S + 0.56) * S
      const w0 = d2 + R, w1 = Math.abs(z) * 1.08
      return Math.min(Math.max(w0, w1), 0) + Math.sqrt(Math.max(w0, 0) * Math.max(w0, 0) + Math.max(w1, 0) * Math.max(w1, 0)) - R
    }
    return inflate(sdf, { rMax: 1.3, center: [0, 0, 0], aspect: [1.1, 1, 0.5], w: 160, h: 120 })
  })
}
export const ringGeo = () => once('ring', () => new THREE.TorusGeometry(0.42, 0.19, 64, 160))
```

Inflation costs about 20k vertices × ~25 SDF calls each. Build each shape once, cache it, and share it between instances, as `once()` does.

Fizzy's other candies were purely decorative variations built from the same kit:
- a liquorice spiral: `sweep` of a ridged circle along an Archimedean spiral, with a ridge normal map and a glossy bead core.
- a sour belt: `sweep` of a twisted stadium section, with vertex-coloured bands.
- a lollipop: `LatheGeometry` disc with a canvas stripe texture, plus a stick.
- a marshmallow twist: `sweep` of a 5-petal section twisted along x.
- a wrapped sweet: a striped ellipsoid with cellophane cylinder necks and fluted fans.

---

## 2 · Materials, studio environment, lights (Fizzy)

```js
function canvas(w, h){ const c = document.createElement('canvas'); c.width = w; c.height = h; return c }

/* sugar-grain normal map: random soft bumps → normals by finite difference (cached) */
const _sugar = {}
export function sugarNormal(size, grains, strength){
  const key = size + '_' + grains + '_' + strength
  if (_sugar[key]) return _sugar[key]
  const h = new Float32Array(size * size)
  for (let n = 0; n < grains; n++){
    const gx = (rnd() * size) | 0, gy = (rnd() * size) | 0, r = 0.9 + rnd() * 2.4, v = 0.45 + rnd() * 0.55, R = Math.ceil(r)
    for (let yy = -R; yy <= R; yy++) for (let xx = -R; xx <= R; xx++){
      const d = Math.sqrt(xx * xx + yy * yy) / r
      if (d < 1){ const ix = (gx + xx + size) % size, iy = (gy + yy + size) % size, k = iy * size + ix; h[k] = Math.max(h[k], v * (1 - d * d)) }
    }
  }
  const c = canvas(size, size), g = c.getContext('2d'), img = g.createImageData(size, size)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++){
    const l = h[y * size + ((x - 1 + size) % size)], rr = h[y * size + ((x + 1) % size)], u = h[((y - 1 + size) % size) * size + x], dd = h[((y + 1) % size) * size + x]
    const nx = (l - rr) * strength, ny = (u - dd) * strength, len = Math.sqrt(nx * nx + ny * ny + 1), i4 = (y * size + x) * 4
    img.data[i4] = (nx / len * 0.5 + 0.5) * 255; img.data[i4 + 1] = (ny / len * 0.5 + 0.5) * 255; img.data[i4 + 2] = (1 / len * 0.5 + 0.5) * 255; img.data[i4 + 3] = 255
  }
  g.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace
  _sugar[key] = t
  return t
}

/* fresnel glow injected into a stock material: a soft lit-from-inside edge */
export function addGlow(mat, color, strength, power){
  const uG = { value: new THREE.Color(color) }, uK = { value: new THREE.Vector2(strength, power) }
  mat.userData.glow = uG
  mat.onBeforeCompile = sh => {
    sh.uniforms.uGlow = uG; sh.uniforms.uGlowK = uK
    sh.fragmentShader = 'uniform vec3 uGlow;\nuniform vec2 uGlowK;\n' + sh.fragmentShader
    const hook = sh.fragmentShader.indexOf('#include <opaque_fragment>') >= 0 ? '#include <opaque_fragment>' : '#include <output_fragment>'
    sh.fragmentShader = sh.fragmentShader.replace(hook, hook + '\n{ float fr = 1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0); gl_FragColor.rgb += uGlow * pow(fr, uGlowK.y) * uGlowK.x; }')
  }
  mat.customProgramCacheKey = () => 'ff-glow'
  return mat
}
const lighten = (hex, amt) => new THREE.Color(hex).lerp(new THREE.Color('#ffffff'), amt)

export const materials = {
  gummy(hex, o = {}){            // sugared gummy: sheen + clearcoat + sugar-grain normals
    const m = new THREE.MeshPhysicalMaterial({
      color: hex, roughness: o.rough != null ? o.rough : 0.34, metalness: 0,
      clearcoat: o.coat != null ? o.coat : 1, clearcoatRoughness: 0.1,
      sheen: 0.7, sheenRoughness: 0.35, sheenColor: lighten(hex, 0.7),
      normalMap: sugarNormal(512, o.grains || 6500, o.sugar || 4.0), normalScale: new THREE.Vector2(0.9, 0.9),
      envMapIntensity: 1.05,
    })
    m.normalMap.repeat.set(o.rep || 5, o.rep ? o.rep / 2 : 2.5)
    return addGlow(m, lighten(hex, 0.35), o.glow || 0.38, 2.4)
  },
  glossy(hex, o = {}){           // hard candy: clearcoat 1, roughness .16
    const m = new THREE.MeshPhysicalMaterial({ color: hex, map: o.map || null, roughness: o.rough != null ? o.rough : 0.16, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.2, vertexColors: !!o.vc })
    return addGlow(m, lighten(hex, 0.35), o.glow || 0.28, 2.6)
  },
  soft(hex, o = {}){             // marshmallow: velvety, powdery
    const m = new THREE.MeshPhysicalMaterial({ color: hex, roughness: 0.72, metalness: 0, sheen: 1, sheenRoughness: 0.75, sheenColor: new THREE.Color('#ffffff'), vertexColors: !!o.vc, envMapIntensity: 0.9,
      normalMap: sugarNormal(256, 1400, 1.2), normalScale: new THREE.Vector2(0.25, 0.25) })
    return addGlow(m, new THREE.Color('#fff6fb'), 0.32, 2.0)
  },
  cello(hex){                    // cellophane wrapper
    return new THREE.MeshPhysicalMaterial({ color: hex, roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity: 0.72, side: THREE.DoubleSide, envMapIntensity: 1.4, depthWrite: false })
  },
}

/* builders: each returns a Group about 1.6 units across */
export const build = {
  bear(hex){ const g = new THREE.Group(); g.add(new THREE.Mesh(bearGeo(), materials.gummy(hex))); g.userData.kind = 'bear'; return g },
  heart(hex){ const g = new THREE.Group(); g.add(new THREE.Mesh(heartGeo(), materials.glossy(hex, { rough: 0.2, glow: 0.3 }))); g.userData.kind = 'heart'; return g },
  ring(hex){ const g = new THREE.Group(); g.add(new THREE.Mesh(ringGeo(), materials.gummy(hex, { rep: 8 }))); g.userData.kind = 'ring'; return g },
}

/* studio environment: PMREM from a tiny procedural scene (gradient dome + emissive softboxes).
   Tint the boxes to the brand palette. RoomEnvironment (section 4) is the zero-effort alternative. */
export function makeEnv(renderer, tint){
  const s = new THREE.Scene()
  const dome = new THREE.Mesh(new THREE.SphereGeometry(40, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color('#ffffff') }, mid: { value: new THREE.Color(tint || '#f2c4d2').multiplyScalar(0.8) }, bot: { value: new THREE.Color('#7a2e5c').multiplyScalar(0.7) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, pow(h, 0.7)) : mix(mid, bot, pow(-h, 0.8)); gl_FragColor = vec4(c, 1.0); }',
  }))
  s.add(dome)
  const box = (w, h, hex, k, x, y, z) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), side: THREE.DoubleSide }))
    m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m)
  }
  box(14, 9, '#ffffff', 8.0, -10, 12, 12)   // big key softbox, upper left front
  box(26, 3, '#ffffff', 3.5, 2, 18, -4)     // top strip
  box(6, 16, '#ffc9d6', 3.2, 18, 2, 8)      // warm side
  box(10, 14, '#c9f2e4', 1.6, -18, -2, -9)  // cool kicker behind left
  box(14, 12, '#ffd9c4', 2.0, 6, 3, -18)    // back
  const pm = new THREE.PMREMGenerator(renderer)
  const rt = pm.fromScene(s, 0.03)
  pm.dispose()
  s.traverse(ob => { if (ob.geometry) ob.geometry.dispose(); if (ob.material) ob.material.dispose() })
  return rt.texture
}

export function addLights(scene){
  scene.add(new THREE.HemisphereLight('#ffffff', '#d08aa5', 0.32))
  const key = new THREE.DirectionalLight('#fffaf4', 1.9); key.position.set(-4, 6, 6); scene.add(key)
  const rim = new THREE.DirectionalLight('#ffc2d0', 1.7); rim.position.set(5, 3, -6); scene.add(rim)
  const fill = new THREE.DirectionalLight('#9ed9c3', 0.4); fill.position.set(-6, -3, 2); scene.add(fill)
  return { key, rim, fill }
}
```

---

## 3 · Hero scene: frustum-fraction layout, absolute-time motion, tumble modes, scatter, cursor, hover, bokeh (Fizzy)

Each item is placed as a **fraction of the half-frustum at its own depth** (`fx`, `fy` in −1…1), so the composition holds at any aspect ratio. Motion is computed from absolute time every frame and nothing accumulates. The two Fizzy bugs are fixed here. Rebuilding on a breakpoint change now **keeps each item's `enter` state**; Fizzy reset it to 0, which made the candies vanish. A tap now **sets** `popSpin` to ±2π, where Fizzy added to it on every tap so the value grew forever.

```js
const damp = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt))   // = MK.damp

/* item: { make: () => Object3D, fx, fy, z, s, mode?: 'face' | 'disc' | 'free' }
   face = keeps its front to camera and rocks · disc = tilted, spins about its axis · free = tumbles on all axes */
export const DESK = [
  { make: () => build.bear('#ef4b79'),  fx: 0.4,   fy: -0.42, z: 1.5,  s: 1.12, mode: 'face' },
  { make: () => build.heart('#9a3bb0'), fx: -0.64, fy: 0.02,  z: 0.9,  s: 1.2,  mode: 'face' },
  { make: () => build.ring('#9ed9c3'),  fx: -0.34, fy: -0.26, z: -3.4, s: 0.95, mode: 'disc' },
  { make: () => build.bear('#ffb38a'),  fx: 0.86,  fy: -0.08, z: -3.6, s: 0.9,  mode: 'face' },
  { make: () => build.heart('#f59db4'), fx: -0.93, fy: -0.4,  z: -2.6, s: 0.85, mode: 'face' },
  { make: () => build.ring('#e23d55'),  fx: 0.3,   fy: 0.84,  z: -4.2, s: 0.8,  mode: 'disc' },
]
export const MOB = DESK.slice(0, 4).map(d => ({ ...d, fx: d.fx * 0.8, s: d.s * 0.85 }))

export function createFloatingHero({ canvas, host, desk = DESK, mob = MOB, isMobile = () => innerWidth < 768,
  reduced = false, skipIntro = false, gsap, hover = matchMedia('(hover: hover)').matches, onPop = null }){
  let renderer
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }) }
  catch (e) { return null }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.setClearColor(0x000000, 0)
  const scene = new THREE.Scene()
  const env = makeEnv(renderer)
  scene.environment = env
  addLights(scene)
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60)
  const CAMZ = 12; camera.position.set(0, 0, CAMZ)

  const state = { scatter: 0, mx: 0, my: 0, tmx: 0, tmy: 0 }
  let items = [], usingMob = null
  const rand = seeded(42)

  function build_(){
    const prevEnter = items.map(c => c.userData.enter)            // FIX: keep entrance state across rebuilds
    items.forEach(c => { scene.remove(c) })
    items = []
    usingMob = isMobile()
    const L = usingMob ? mob : desk
    L.forEach((d, i) => {
      const holder = new THREE.Group(); holder.add(d.make())
      holder.userData = { mode: d.mode || 'free', tilt: (rand() - 0.5) * 0.9, d,
        spin: new THREE.Vector3((rand() - 0.5) * 0.7, (rand() - 0.5) * 0.9, (rand() - 0.5) * 0.5),
        r0: new THREE.Euler(rand() * 6.28, rand() * 6.28, rand() * 6.28),
        bobA: 0.08 + rand() * 0.12, bobS: 0.6 + rand() * 0.5, ph: rand() * 6.28, rise: 1.5 + rand() * 2.5, drift: (rand() - 0.5) * 1.2,
        pop: 0, popSpin: 0, hover: 0, base: new THREE.Vector3(), scale: 1,
        enter: prevEnter.length ? Math.max(...prevEnter) : (skipIntro || reduced ? 1 : 0) }
      scene.add(holder); items.push(holder)
    })
    layout()
  }
  function layout(){
    const W = canvas.clientWidth || innerWidth, H = canvas.clientHeight || innerHeight
    renderer.setSize(W, H, false)
    camera.aspect = W / H; camera.updateProjectionMatrix()
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const m = isMobile(), unit = m ? 0.74 : 0.95
    items.forEach(c => {
      const d = c.userData.d, dist = CAMZ - d.z, hh = tanH * dist, hw = hh * camera.aspect
      c.userData.base.set(d.fx * hw, d.fy * hh, d.z)
      c.userData.scale = d.s * unit * (m ? 1 : Math.min(1.15, Math.max(0.8, camera.aspect / 1.6)))
    })
  }
  build_()

  /* entrance: pop in from below, staggered from the centre outward */
  function enter(delay = 0.25){
    if (skipIntro || reduced) return
    items.slice().sort((a, b) => Math.abs(a.userData.d.fx) - Math.abs(b.userData.d.fx)).forEach((c, i) => {
      gsap.to(c.userData, { enter: 1, duration: 1.3, delay: delay + i * 0.07, ease: 'back.out(1.6)' })
    })
  }

  /* pointer: parallax target, hover raycast only after the pointer moved, tap to pop */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2()
  let hovered = null, pointerMoved = false
  const onMove = e => {
    const r = canvas.getBoundingClientRect()
    state.tmx = (e.clientX - r.left) / r.width * 2 - 1; state.tmy = (e.clientY - r.top) / r.height * 2 - 1
    ndc.set(state.tmx, -state.tmy); pointerMoved = true
  }
  const onLeave = () => { state.tmx = 0; state.tmy = 0; hovered = null; canvas.style.cursor = '' }
  function pick(){
    ray.setFromCamera(ndc, camera)
    const hits = ray.intersectObjects(items, true)
    if (!hits.length) return null
    let ob = hits[0].object; while (ob.parent && items.indexOf(ob) < 0) ob = ob.parent
    return items.indexOf(ob) > -1 ? ob : null
  }
  function pop(c){
    gsap.killTweensOf(c.userData, 'pop')
    c.userData.popSpin = (Math.random() > 0.5 ? 1 : -1) * Math.PI * 2       // FIX: assign, never accumulate
    gsap.fromTo(c.userData, { pop: 0 }, { pop: 1, duration: 0.9, ease: 'power1.out' })
    if (onPop) onPop(c)
  }
  const onDown = e => {
    const r = canvas.getBoundingClientRect()
    ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height * 2 - 1))
    const c = pick(); if (c) pop(c)
  }
  host.addEventListener('pointermove', onMove)
  host.addEventListener('pointerleave', onLeave)
  canvas.addEventListener('pointerdown', onDown)

  /* t: absolute seconds (use a fixed t under reduced motion for one still frame) */
  function frame(t, dt){
    state.mx = damp(state.mx, state.tmx, 3.6, dt); state.my = damp(state.my, state.tmy, 3.6, dt)
    camera.position.x = state.mx * 0.7; camera.position.y = -state.my * 0.45; camera.lookAt(0, 0, 0)
    if (pointerMoved && hover){
      pointerMoved = false; const h = pick()
      if (h !== hovered){ hovered = h; canvas.style.cursor = h ? 'pointer' : '' }
    }
    const sc = state.scatter
    for (const c of items){
      const u = c.userData, b = u.base
      u.hover = damp(u.hover, c === hovered ? 1 : 0, 7.7, dt)
      const popK = Math.sin(u.pop * Math.PI)                               // hop: up and back down
      c.position.set(
        b.x * (1 + sc * 0.6) + u.drift * sc,                                  // scatter: spread x
        b.y + Math.sin(t * u.bobS + u.ph) * u.bobA + sc * sc * (3 + u.rise) + (1 - u.enter) * -1.2 + popK * 0.9,  // rise y²
        b.z + sc * 1.5)                                                       // push toward camera
      c.scale.setScalar(u.scale * Math.max(0.0001, u.enter) * (1 + u.hover * 0.08 + popK * 0.12))
      const pp = u.popSpin * u.pop
      if (u.mode === 'face') c.rotation.set(Math.sin(t * 0.45 + u.ph) * 0.3 + sc * 1.5, Math.sin(t * 0.35 + u.ph * 1.3) * 0.75 + pp + sc * 2, u.tilt + Math.sin(t * 0.3 + u.ph) * 0.25)
      else if (u.mode === 'disc') c.rotation.set(0.45 + Math.sin(t * 0.4 + u.ph) * 0.3 + sc * 1.5, Math.sin(t * 0.3 + u.ph) * 0.5 + pp + sc * 2, u.r0.z + t * (0.25 + Math.abs(u.spin.z)) * (u.spin.z < 0 ? -1 : 1))
      else c.rotation.set(u.r0.x + t * u.spin.x + sc * 1.5, u.r0.y + t * u.spin.y + pp + sc * 2, u.r0.z + t * u.spin.z)
    }
    renderer.render(scene, camera)
  }

  function resize(){ if (usingMob !== isMobile()) build_(); else layout() }

  /* depth-of-field bokeh: render a few objects once into 2D sprites and blur them in CSS */
  function bokeh(box, picks, spots){
    const size = 256, dpr = renderer.getPixelRatio(), prevW = renderer.domElement.width, prevH = renderer.domElement.height
    const els = []
    picks.forEach((obj, i) => {
      const sc = new THREE.Scene(); sc.environment = env; addLights(sc)
      obj.rotation.set(0.4, -0.5 + i, 0.3); sc.add(obj)
      const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50); cam.position.set(0, 0, 6.4)
      renderer.setSize(size, size, false); renderer.render(sc, cam)
      const c = document.createElement('canvas'); c.width = c.height = size
      c.getContext('2d').drawImage(renderer.domElement, 0, 0, size * dpr, size * dpr, 0, 0, size, size)
      const s = spots[i]
      c.style.cssText = `position:absolute;left:${s.l};top:${s.t};width:${s.w};height:auto;filter:blur(${s.blur}px);opacity:${s.o}`
      box.appendChild(c); els.push(c)
      if (!reduced) gsap.to(c, { y: '+=' + (2 + i) * innerWidth / 100, rotation: (i % 2 ? -1 : 1) * 25, duration: 5 + i * 1.5, ease: 'sine.inOut', yoyo: true, repeat: -1 })
    })
    renderer.setSize(prevW / dpr, prevH / dpr, false)
    return els
  }

  function dispose(){
    host.removeEventListener('pointermove', onMove)
    host.removeEventListener('pointerleave', onLeave)
    canvas.removeEventListener('pointerdown', onDown)
    items.forEach(c => gsap.killTweensOf(c.userData))
    disposeScene(scene); env.dispose(); renderer.dispose()
  }

  return { renderer, scene, camera, env, state, get items(){ return items }, enter, pop, frame, resize, bokeh, dispose,
    setScatter(p){ state.scatter = Math.min(1.4, Math.max(0, p * 1.7)) } }   // scatter = clamp(progress·1.7, 0, 1.4)
}

export function disposeScene(root){
  root.traverse(ob => {
    if (ob.geometry) ob.geometry.dispose()
    const ms = Array.isArray(ob.material) ? ob.material : ob.material ? [ob.material] : []
    ms.forEach(m => { for (const k in m){ const v = m[k]; if (v && v.isTexture) v.dispose() } m.dispose() })
  })
}
```

**No-WebGL fallback (Fizzy):** float pre-rendered PNG cut-outs inside the bokeh box.
```js
export function fallbackHero(box, imgs, gsap, reduced){
  // imgs: [[src, left, top, width], ...] e.g. [['assets/obj-1.png', '64vw', '28vw', '14vw'], ...]
  imgs.forEach((d, i) => {
    const im = new Image(); im.src = d[0]; im.alt = ''
    im.style.cssText = `position:absolute;left:${d[1]};top:${d[2]};width:${d[3]};pointer-events:none`
    box.appendChild(im)
    if (!reduced) gsap.to(im, { y: -18, rotation: i % 2 ? 6 : -6, duration: 2.6 + i * 0.4, ease: 'sine.inOut', yoyo: true, repeat: -1 })
  })
}
```

```html
<section class="hero">
  <canvas class="hero__gl" aria-hidden="true"></canvas>
  <div class="hero__bokeh" aria-hidden="true"></div>
  <div class="hero__copy">…</div>
</section>
```
```css
.hero{position:relative;min-height:100svh;overflow:hidden}
.hero__gl{position:absolute;inset:0;width:100%;height:100%;display:block}
.hero__bokeh{position:absolute;inset:0;pointer-events:none}
```

Fizzy's hero also had a "tap to play" mode (pop every candy in sequence, then count taps) plus a chime, and it lifted the copy and bokeh layer on scroll. These are site-specific; `pop()` is the reusable part.

---

## 4 · Ember spices: procedural chili / star anise / peppercorn, orbit, cursor-dodge spring

The spices orbit the hero word on a wide, slow ellipse (in viewport fractions). They spiral in from outside on arrival, drift round on a lap of about 2 minutes, and fly outward as the hero scrolls away. Depth rides the orbit, so they swell on the near side. Each one dodges the cursor on a damped spring, and an A1 stoke blasts them outward.

```js
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

const TAU = Math.PI * 2
const clamp01 = v => Math.min(1, Math.max(0, v))
function rng(seed){ return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0
  let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
  return ((t ^ t >>> 14) >>> 0) / 4294967296 } }

export function spiceStage(renderer){
  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 0.8
  pmrem.dispose()
  const FOV = 30, CAMZ = 16
  const camera = new THREE.PerspectiveCamera(FOV, innerWidth / innerHeight, 0.1, 100)
  camera.position.set(0, 0, CAMZ)
  const key = new THREE.DirectionalLight(0xfff0dc, 2.4); key.position.set(-5, 7, 9)
  const rim = new THREE.DirectionalLight(0xffb48c, 1.4); rim.position.set(7, -3, -5)
  scene.add(key, rim, new THREE.HemisphereLight(0xfff5e8, 0xd9b99a, 0.5))
  return { scene, camera, FOV, CAMZ }
}

const MAT = {
  chili: (c, dry) => new THREE.MeshPhysicalMaterial({ color: c, vertexColors: true,
    roughness: dry ? 0.62 : 0.26, clearcoat: dry ? 0.15 : 1, clearcoatRoughness: dry ? 0.5 : 0.12,
    sheen: dry ? 0.4 : 0, sheenColor: new THREE.Color(0x5a1008) }),
  stem: new THREE.MeshStandardMaterial({ color: 0x5E6B34, roughness: 0.78 }),
  stemDry: new THREE.MeshStandardMaterial({ color: 0x6B5A2E, roughness: 0.85 }),
  anise: new THREE.MeshStandardMaterial({ color: 0x8A3E22, roughness: 0.74, vertexColors: true }),
  seed: new THREE.MeshPhysicalMaterial({ color: 0xB9743C, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
  pepper: new THREE.MeshStandardMaterial({ color: 0x4A2618, roughness: 0.78, vertexColors: true }),
  pepper2: new THREE.MeshStandardMaterial({ color: 0x2E1A12, roughness: 0.8, vertexColors: true }),
}

/* A real pod: tapered and slightly flattened, three shallow lobes, fine
   lengthwise creases, a few dents, and a skin that goes a shade lighter at
   the shoulder and darker toward the tip. `dry` makes a wrinkled, matte
   dried chili instead of a glossy fresh one. */
export function makeChili(seed, color, { len = 2.6, rad = 0.3, dry = false } = {}){
  const R = rng(seed)
  const bend = 0.3 + R() * 0.55, curl = (R() - 0.5) * 0.6
  const pts = []
  for (let i = 0; i <= 10; i++){ const t = i / 10
    pts.push(new THREE.Vector3(t * len, -Math.pow(t, 2) * bend + Math.sin(t * Math.PI) * 0.16, Math.sin(t * Math.PI) * curl)) }
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal')
  const TS = 90, RS = 30
  const geo = new THREE.TubeGeometry(curve, TS, 1, RS, false)
  const pos = geo.attributes.position, c = new THREE.Vector3(), v = new THREE.Vector3()
  const col = new Float32Array(pos.count * 3)
  const dents = Array.from({ length: 4 }, () => [0.2 + R() * 0.65, R() * TAU, 0.04 + R() * 0.05])
  const ph1 = R() * TAU, ph2 = R() * TAU
  for (let i = 0; i <= TS; i++){
    const t = i / TS; curve.getPointAt(t, c)
    const shoulder = Math.sin(Math.min(t / 0.16, 1) * Math.PI / 2)
    const r = Math.max(0.004, rad * (0.64 + 0.36 * shoulder) * Math.pow(1 - t, 0.75))
    for (let j = 0; j <= RS; j++){
      const kk = i * (RS + 1) + j, ang = j / RS * TAU
      let k = 1 + 0.06 * Math.cos(ang * 3 + t * 1.5)                         // lobes, twisting a little
      k *= 1 + 0.012 * Math.sin(ang * 11 + ph1) * (0.4 + t)                  // fine creases
      k *= 1 - 0.1 * Math.max(0, Math.cos(ang)) * 0.35                       // a touch flatter on one side
      for (const [dt, da, dd] of dents){
        const e = Math.exp(-((t - dt) ** 2) / 0.004 - ((Math.atan2(Math.sin(ang - da), Math.cos(ang - da))) ** 2) / 0.25)
        k -= dd * e
      }
      if (dry) k *= 1 + 0.07 * Math.sin(t * 40 + ang * 2 + ph2) * Math.sin(ang * 7 + t * 9)
      v.fromBufferAttribute(pos, kk).sub(c).multiplyScalar(r * k).add(c)
      pos.setXYZ(kk, v.x, v.y, v.z)
      const shade = (1.12 - 0.3 * t) * (0.94 + 0.06 * Math.sin(ang * 3 + t * 5 + ph2))
      col[kk * 3] = shade; col[kk * 3 + 1] = shade * (1 + (dry ? 0 : 0.06 * (1 - t))); col[kk * 3 + 2] = shade * 0.96
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  geo.computeVertexNormals()
  const g = new THREE.Group()
  g.add(new THREE.Mesh(geo, MAT.chili(color, dry)))

  /* calyx: a lobed cup over the shoulder, then the stem */
  const c0 = curve.getPointAt(0), t0 = curve.getTangentAt(0).negate()
  const r0 = rad * 0.64
  const prof = [[0, 0.02], [r0 * 0.6, 0], [r0 * 1.05, 0.04], [r0 * 1.1, 0.1], [r0 * 0.8, 0.16], [0.09, 0.2], [0.07, 0.24]]
    .map(([a, b]) => new THREE.Vector2(a, b))
  const cup = new THREE.LatheGeometry(prof, 40)
  const cp = cup.attributes.position
  for (let i = 0; i < cp.count; i++){
    v.fromBufferAttribute(cp, i); const ang = Math.atan2(v.z, v.x)
    const k2 = 1 + 0.16 * Math.max(0, Math.cos(ang * 5)) * (v.y / 0.24)
    cp.setXYZ(i, v.x * k2, v.y, v.z * k2)
  }
  cup.computeVertexNormals()
  const stemMat = dry ? MAT.stemDry : MAT.stem
  const cupM = new THREE.Mesh(cup, stemMat)
  cupM.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), t0)
  cupM.position.copy(c0).addScaledVector(t0, -0.1)
  g.add(cupM)
  const up = new THREE.Vector3(0, 1, 0)
  const stemCurve = new THREE.CatmullRomCurve3([
    c0.clone().addScaledVector(t0, 0.08),
    c0.clone().addScaledVector(t0, 0.32).addScaledVector(up, 0.04),
    c0.clone().addScaledVector(t0, 0.5).addScaledVector(up, 0.2),
  ])
  g.add(new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 16, 0.05, 10, false), stemMat))
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 8), stemMat)
  tip.position.copy(stemCurve.getPointAt(1)); g.add(tip)

  const box = new THREE.Box3().setFromObject(g), ctr = box.getCenter(new THREE.Vector3())
  g.children.forEach(ch => ch.position.sub(ctr))           // centre the group on its bounds
  return g
}

/* one star-anise pod: a woody boat, pointed at the tip, split open along
   the top, finely wrinkled, darker toward the tip */
const podGeo = (() => {
  const g = new THREE.SphereGeometry(1, 28, 18), p = g.attributes.position, v = new THREE.Vector3()
  const col = new Float32Array(p.count * 3)
  for (let i = 0; i < p.count; i++){
    v.fromBufferAttribute(p, i)
    const t = (v.x + 1) / 2                                   // 0 = hub end, 1 = tip
    const prof = Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.92 + 0.08)), 0.75) * (1 - 0.35 * t)
    const groove = Math.exp(-(v.y * v.y) / 0.04) * Math.max(0, v.z) * Math.sin(Math.PI * t)
    const wr = 1 + 0.06 * Math.sin(v.x * 26 + v.z * 9) * Math.cos(v.y * 14)
    p.setXYZ(i, 0.05 + t * 0.56, v.y * 0.17 * prof * wr, (v.z * 0.15 * prof - groove * 0.13) * wr)
    const sh = (0.7 + 0.3 * (1 - t)) * (1 - groove * 0.45) * (0.92 + 0.08 * Math.sin(v.x * 31 + v.y * 7))
    col[i * 3] = sh; col[i * 3 + 1] = sh * 0.9; col[i * 3 + 2] = sh * 0.86
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g
})()
const seedGeo = new THREE.SphereGeometry(0.075, 14, 10)
export function makeAnise(seed = 3){
  const R = rng(seed), g = new THREE.Group(), P = 8
  for (let i = 0; i < P; i++){
    const pod = new THREE.Group(), sc = 0.88 + R() * 0.22
    const m = new THREE.Mesh(podGeo, MAT.anise); m.scale.set(sc, 1, 1); pod.add(m)
    if (R() > 0.15){ const sd = new THREE.Mesh(seedGeo, MAT.seed)
      sd.position.set(0.3 * sc, 0, 0.05); sd.scale.set(1.3, 0.62, 0.55); pod.add(sd) }
    pod.rotation.z = i / P * TAU + (R() - 0.5) * 0.14
    pod.rotation.y = (R() - 0.5) * 0.3 - 0.1                  // pods droop a little, unevenly
    g.add(pod)
  }
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), MAT.anise); hub.scale.set(1, 1, 0.75); g.add(hub)
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.034, 0.24, 8), MAT.stemDry)
  stalk.rotation.x = Math.PI / 2; stalk.position.z = -0.15; g.add(stalk)
  return g
}

/* peppercorn: a ball covered in a net of wrinkles, darker in the creases */
const pepperGeo = (() => {
  const g = new THREE.IcosahedronGeometry(0.15, 5), p = g.attributes.position, v = new THREE.Vector3(), d = new THREE.Vector3()
  const col = new Float32Array(p.count * 3)
  for (let i = 0; i < p.count; i++){
    v.fromBufferAttribute(p, i); d.copy(v).normalize()
    const n1 = Math.sin(d.x * 19 + 1.3) * Math.sin(d.y * 17 + 0.4) * Math.sin(d.z * 21 + 2.1)
    const n2 = Math.sin(d.x * 37 + 2) * Math.sin(d.y * 41) * Math.sin(d.z * 33 + 1)
    const ridge = 1 - Math.abs(n1), rr = ridge * ridge
    v.multiplyScalar(0.96 + 0.08 * rr + n2 * 0.022); p.setXYZ(i, v.x, v.y, v.z)
    const sh = 0.5 + 0.5 * rr
    col[i * 3] = sh; col[i * 3 + 1] = sh * 0.92; col[i * 3 + 2] = sh * 0.88
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g
})()
export const makePepper = i => new THREE.Mesh(pepperGeo, i % 2 ? MAT.pepper : MAT.pepper2)
```

Ember also made green cardamom (a 3-lobed, ribbed, double-pointed sphere deformation) and a cinnamon quill (two open, ridged `CylinderGeometry` scrolls). They follow the same pattern: deform a primitive's vertices and bake the shading into vertex colours.

**Orbit + cursor-dodge spring + stoke shockwave:**

```js
/* a: start angle on the ellipse · rx, ry: ellipse radii as fractions of the half-frustum ·
   z: depth · s: scale · rot: base rotation · m: also shown on small screens */
export const SPICES = [
  { kind: 'chili',  a: 0.3,  rx: 1.0,  ry: 0.6,  z: 1.0,  s: 0.6,  c: 0xB81B13, rot: [0.4, 0.3, -0.5], m: true },
  { kind: 'green',  a: 2.5,  rx: 1.06, ry: 0.62, z: -0.4, s: 0.55, c: 0x3F7A1F, rot: [-0.3, 2.4, 0.8], m: true },
  { kind: 'dry',    a: 4.3,  rx: 0.98, ry: 0.56, z: 1.6,  s: 0.47, c: 0x7E120C, rot: [1.1, 0.6, 2.1] },
  { kind: 'chili',  a: 5.6,  rx: 1.08, ry: 0.6,  z: 0.2,  s: 0.4,  c: 0xC9261A, rot: [0.2, 1.4, -1.2] },
  { kind: 'anise',  a: 1.4,  rx: 1.08, ry: 0.62, z: 0.4,  s: 0.62, rot: [0.9, 0.3, 0.2] },
  { kind: 'anise',  a: 3.7,  rx: 1.02, ry: 0.58, z: 1.4,  s: 0.5,  rot: [-0.6, 0.8, 1.2], m: true },
  { kind: 'pepper', a: 0.95, rx: 0.96, ry: 0.56, z: 1.6,  s: 0.92, m: true },
  { kind: 'pepper', a: 3.2,  rx: 1.1,  ry: 0.62, z: 0.2,  s: 1.05 },
  { kind: 'pepper', a: 5.1,  rx: 1.02, ry: 0.6,  z: 2.2,  s: 0.8,  m: true },
  { kind: 'pepper', a: 2.05, rx: 1.04, ry: 0.55, z: 1.2,  s: 0.74 },
]

export function createSpiceOrbit({ scene, camera, FOV, CAMZ, ptr, list = SPICES, topInset = () => 132 }){
  const items = list.map((it, i) => {
    const obj = it.kind === 'chili' ? makeChili(11 + i * 7, it.c)
              : it.kind === 'green' ? makeChili(11 + i * 7, it.c, { len: 3.1, rad: 0.24 })
              : it.kind === 'dry'   ? makeChili(11 + i * 7, it.c, { len: 2.3, rad: 0.26, dry: true })
              : it.kind === 'anise' ? makeAnise(7 + i * 3)
              : makePepper(i)
    const R = rng(99 + i)
    scene.add(obj)
    return { ...it, obj, rot: it.rot || [R() * 3, R() * 3, R() * 3],
      spin: [(R() - 0.5) * 0.22, (R() - 0.5) * 0.3, (R() - 0.5) * 0.18],
      bob: 0.35 + R() * 0.4, ph: R() * TAU, delay: 0.1 * i + R() * 0.2,
      push: new THREE.Vector2(), pushV: new THREE.Vector2() }
  })
  const easeOut = x => 1 - Math.pow(1 - x, 3)
  const tmpV = new THREE.Vector3()
  const self = { items, start: -1, shockAt: null }

  /* t: absolute seconds · heroR: the hero's getBoundingClientRect() */
  self.update = (t, dt, heroR) => {
    const aspect = innerWidth / innerHeight
    const small = innerWidth < 760
    const sp = clamp01(-heroR.top / Math.max(1, heroR.height))          // hero scroll progress
    for (const it of items){
      const a = self.start < 0 ? 0 : clamp01((t - self.start - it.delay) / 2.2)
      const e = easeOut(a)
      it.obj.visible = a > 0.001 && !(small && !it.m)
      if (!it.obj.visible) continue

      const ang = it.a + t * 0.05 + sp * 1.6 + (1 - e) * 1.4                // lap + scroll swing + spiral-in
      const spread = 1 + sp * 0.55 + (1 - e) * 0.9
      const rx = (small ? 1.02 : it.rx) * spread, ry = (small ? 0.5 : it.ry) * spread
      const z = it.z + Math.sin(ang) * -1.2                                  // depth rides the orbit
      const halfH = Math.tan(FOV * Math.PI / 360) * (CAMZ - z), halfW = halfH * aspect
      const wpp = 2 * halfH / innerHeight                                    // world units per CSS px at this depth

      /* dodge the cursor, spring back */
      tmpV.copy(it.obj.position).project(camera)
      const sx = (tmpV.x + 1) / 2 * innerWidth, sy = (1 - tmpV.y) / 2 * innerHeight
      const dx = sx - ptr.x, dy = sy - ptr.y, dist = Math.hypot(dx, dy), RAD = 170
      let fx = 0, fy = 0
      if (ptr.active && dist < RAD && dist > 0.01){ const f = (1 - dist / RAD) * 2.2; fx = dx / dist * f; fy = -dy / dist * f }
      const sh = self.shockAt
      if (sh && !sh.done.has(it)){                                          // a stoke blasts the spices outward
        sh.done.add(it)
        const qx = sx - sh.x, qy = sy - sh.y, qd = Math.hypot(qx, qy)
        if (Number.isFinite(qd) && qd > 1){ const fall = Math.max(0, 1 - qd / 1100)
          it.pushV.x += qx / qd * 2.2 * fall; it.pushV.y += -qy / qd * 2.2 * fall }
      }
      it.pushV.x += (fx - it.push.x) * 9 * dt; it.pushV.y += (fy - it.push.y) * 9 * dt
      it.pushV.multiplyScalar(Math.pow(0.02, dt))
      it.push.x += it.pushV.x * dt * 6; it.push.y += it.pushV.y * dt * 6
      if (!Number.isFinite(it.push.x + it.push.y + it.pushV.x + it.pushV.y)){ it.push.set(0, 0); it.pushV.set(0, 0) }   // never let a bad frame poison it

      const bob = Math.sin(t * it.bob + it.ph) * 0.1
      const parX = (ptr.x / innerWidth - 0.5) * 0.3 * (z + 4) / 4
      const parY = (ptr.y / innerHeight - 0.5) * 0.22 * (z + 4) / 4
      const scrolled = -heroR.top * wpp * (1 + z * 0.05)                    // scroll away with the hero (slight depth parallax)
      it.obj.position.set(
        Math.cos(ang) * rx * halfW + parX + it.push.x * wpp * 60,
        Math.min((-0.1 + Math.sin(ang) * ry) * halfH + bob - parY + it.push.y * wpp * 60,
          halfH - topInset() * wpp) + scrolled,                              // never drift under the nav
        z)
      it.obj.rotation.set(it.rot[0] + t * it.spin[0] + sp * 2.2, it.rot[1] + t * it.spin[1] + sp * 1.4, it.rot[2] + t * it.spin[2])
      it.obj.scale.setScalar(Math.max(0.001, it.s * (small ? 0.8 : 1) * (0.2 + 0.8 * e)))
    }
  }
  self.shock = (x, y) => { self.shockAt = { x, y, done: new Set() } }
  return self
}
```

In Ember the spices and the A1 fire shared one fixed full-screen renderer. The spice scene rendered first, then `clearDepth()`, then the fire scene. `ptr` is the same `{ x, y, active }` pointer object A1 uses. Under reduced motion, render one frame with `start` set in the past and `t` fixed.

---

## 5 · motion-kit wrappers

```js
/* Fizzy-style hero: <section class="hero" data-mk="floating-objects"> with .hero__gl and .hero__bokeh inside */
MK.effect('floating-objects', (el, o) => {
  const canvas = o.q('.hero__gl'), box = o.q('.hero__bokeh')
  const hero = createFloatingHero({ canvas, host: el, gsap: o.gsap, reduced: o.is.reduce, isMobile: () => o.is.mobile })
  if (!hero){
    if (box) fallbackHero(box, o.opt('fallback', []), o.gsap, o.is.reduce)
    o.cleanup(() => { if (box) box.innerHTML = '' })
    return
  }
  let bokehEls = []
  if (box && !o.is.mobile) try { bokehEls = hero.bokeh(box,
    [build.bear('#f59db4'), build.heart('#9ed9c3'), build.ring('#ffcba8')],
    [{ l: '31vw', t: '2vw', w: '9vw', blur: 9, o: 0.75 }, { l: '84vw', t: '44vw', w: '8vw', blur: 7, o: 0.85 }, { l: '9vw', t: '46vw', w: '7vw', blur: 8, o: 0.7 }]) } catch (e) { /* decorative */ }

  if (o.is.reduce){ hero.frame(2.0, 0); o.cleanup(() => { bokehEls.forEach(c => c.remove()); hero.dispose() }); return }

  o.whenStart('intro').then(() => hero.enter(0.25))
  o.trigger({ trigger: el, start: 'top top', end: 'bottom top', scrub: true, onUpdate: s => hero.setScatter(s.progress) })
  let rsz = 0
  o.on(window, 'resize', () => { clearTimeout(rsz); rsz = setTimeout(hero.resize, 120) })
  o.loop((dt, time) => hero.frame(time, dt), { el, margin: '80px' })
  o.cleanup(() => { clearTimeout(rsz); bokehEls.forEach(c => { o.gsap.killTweensOf(c); c.remove() }); hero.dispose() })
})

/* Ember-style orbit: on the hero; listens for the A1 'fire:stoke' event */
MK.effect('spice-orbit', (el, o) => {
  const cv = document.createElement('canvas'); cv.className = 'spice-gl'; cv.setAttribute('aria-hidden', 'true')
  let renderer
  try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }) } catch (e) { return }
  el.appendChild(cv)                                   // .spice-gl{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:29}
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5)); renderer.setClearColor(0, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NeutralToneMapping
  const size = () => { renderer.setSize(innerWidth, innerHeight, false); st.camera.aspect = innerWidth / innerHeight; st.camera.updateProjectionMatrix() }
  const st = spiceStage(renderer); size()
  const ptr = { x: innerWidth / 2, y: innerHeight / 2, active: false }
  o.on(window, 'pointermove', e => { ptr.x = e.clientX; ptr.y = e.clientY; ptr.active = true }, { passive: true })
  o.on(document, 'fire:stoke', e => orbit.shock(e.detail.x, e.detail.y))
  const orbit = createSpiceOrbit({ scene: st.scene, camera: st.camera, FOV: st.FOV, CAMZ: st.CAMZ, ptr })
  let rsz = 0
  o.on(window, 'resize', () => { clearTimeout(rsz); rsz = setTimeout(size, 120) })
  if (o.is.reduce){ orbit.start = -100; orbit.update(10, 0, el.getBoundingClientRect()); renderer.render(st.scene, st.camera) }
  else {
    o.whenStart('intro').then(() => { orbit.start = o.gsap.ticker.time + 0.9 })
    o.loop((dt, time) => {
      const r = el.getBoundingClientRect()
      renderer.clear(); if (r.bottom > 0){ orbit.update(time, dt, r); renderer.render(st.scene, st.camera) }
    }, { el, onToggle: v => { if (!v) renderer.clear() } })
  }
  o.cleanup(() => { clearTimeout(rsz); disposeScene(st.scene); st.scene.environment.dispose(); renderer.dispose(); cv.remove() })
})
```

Note that `podGeo`, `seedGeo`, `pepperGeo` and the shared `MAT` entries live at module level and are shared. After `disposeScene()`, three.js simply re-uploads them if the effect runs again (for example after a reduced-motion toggle).
