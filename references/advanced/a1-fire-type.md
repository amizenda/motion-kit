# A1 · WebGL fire typography — reference code

A display word drawn as chunky red glass letters (extruded side, bevel) that a ragged white-hot front climbs, with two parallax sheets of domain-warped flame, rising sparks, a click "stoke" and a scroll-linked "burn".
Origin: Ember. Dependencies: three.js r169 as an ES module (any r162+ works; `NeutralToneMapping` needs r162). The wrapper uses motion-kit's GSAP + ScrollTrigger.
Wrap it as `MK.effect('fire-type', (el, o) => { … })` (section 6). `o.loop(fn, { el })` drives `stage.frame`, `o.cleanup` disposes the renderer, textures and listeners, smoothing goes through `damp` (identical to `MK.damp`), and the static fallback is red display type with a CSS glow, used when motion is reduced or WebGL is missing.

---

## 1 · Markup and CSS

The DOM word stays the accessible text. Once the effect is running its colour turns transparent, and the canvas draws the fire over it. The `.fire` span must hold **one plain text node**, because glyph positions come from a `Range` per character. The zero-size `.bl` probe after it marks the baseline.

```html
<h1 class="fire-word">
  <span class="fire" data-mk="fire-type">FIRE</span><i class="bl"></i>
</h1>
```

```css
.fire-word{display:block;font-weight:800;font-size:clamp(96px,22vw,320px);line-height:.8;
  letter-spacing:-.06em;white-space:nowrap;padding-left:.06em;color:#C8231A}
.fire{display:inline-block;cursor:pointer;touch-action:manipulation}
.bl{display:inline-block;width:0;height:0;vertical-align:baseline}
.fire.fire--live{color:transparent}
/* fallback: reduced motion / no WebGL */
.fire.fire--static{color:#C8231A;text-shadow:0 0 .08em rgba(255,120,40,.55),0 0 .3em rgba(255,80,20,.35),0 .02em 0 #5E1207}
/* the fire canvas: fixed, full-screen, click-through */
.fire-gl{position:fixed;inset:0;width:100%;height:100%;z-index:30;pointer-events:none;display:block}
```

---

## 2 · GLSL (complete, unchanged)

```js
/* simplex noise + fbm (4 octaves, shaping) + fbm3 (3 octaves, warp and surfaces) */
const NOISE = `
  vec2 h2(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123); }
  float snoise(vec2 p){
    const float K1 = 0.366025404, K2 = 0.211324865;
    vec2 i = floor(p + (p.x + p.y) * K1), a = p - i + (i.x + i.y) * K2;
    float m = step(a.y, a.x); vec2 o = vec2(m, 1.0 - m);
    vec2 b = a - o + K2, c = a - 1.0 + 2.0 * K2;
    vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
    vec3 n = h * h * h * h * vec3(dot(a, h2(i)), dot(b, h2(i + o)), dot(c, h2(i + 1.0)));
    return dot(n, vec3(70.0));
  }
  float fbm(vec2 p){                       /* 4 octaves: the shaping noise */
    float f = 0.0, a = 0.5; mat2 r = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 4; i++){ f += a * snoise(p); p = r * p; a *= 0.5; }
    return f;
  }
  float fbm3(vec2 p){                      /* 3 octaves: warp and surfaces */
    float f = 0.0, a = 0.5; mat2 r = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 3; i++){ f += a * snoise(p); p = r * p; a *= 0.5; }
    return f;
  }`

const fireVert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`

const fireFrag = `
  precision highp float;
  uniform sampler2D uMask, uEnv;
  uniform float uTime, uIgnite, uReveal, uHeat, uWind, uAspect, uSpanB, uSpanH, uFill, uBurn;
  uniform vec2 uExt; uniform vec3 uLight;
  varying vec2 vUv;
  ${NOISE}
  const vec3 CHAR = vec3(0.30, 0.03, 0.02);
  const vec3 DEEP = vec3(0.52, 0.06, 0.035);
  const vec3 RED  = vec3(0.784, 0.137, 0.102);
  const vec3 ORNG = vec3(0.97, 0.36, 0.07);
  const vec3 AMBR = vec3(1.0, 0.56, 0.12);
  const vec3 GOLD = vec3(1.0, 0.78, 0.32);
  const vec3 HOT  = vec3(1.0, 0.95, 0.80);
  /* temperature → colour: cool deep-red tips up to a near-white core */
  vec3 heatRamp(float x){
    x = clamp(x, 0.0, 1.0);
    vec3 c = mix(DEEP, RED, smoothstep(0.0, 0.2, x));
    c = mix(c, ORNG, smoothstep(0.2, 0.46, x));
    c = mix(c, AMBR, smoothstep(0.46, 0.66, x));
    c = mix(c, GOLD, smoothstep(0.66, 0.86, x));
    return mix(c, HOT, smoothstep(0.86, 1.0, x));
  }
  void main(){
    vec2 uv = vUv;
    float t = uTime;
    vec2 ruv = uv + vec2(0.0, (1.0 - uReveal) * uSpanH * 1.05);
    float clipLine = mix(step(uSpanB, uv.y), 1.0, step(0.999, uReveal));

    /* work in letter-heights, so the flames keep the same character at
       any size of word */
    vec2 p = vec2(uv.x * uAspect, uv.y) / max(uSpanH, 0.05);
    float lift = max(uv.y - uSpanB, 0.0) / max(uSpanH, 0.05);

    /* Slow domain-warped turbulence. The warp field drifts at a walking
       pace and the detail rides it upward a little faster — big lazy
       rolls with finer licks inside them, which is how real flame moves. */
    vec2 fp = p * vec2(1.5, 0.85);
    vec2 w = vec2(fbm3(fp * 1.05 + vec2(0.0, -t * 0.32)),
                  fbm3(fp * 1.05 + vec2(4.3, -t * 0.38)));
    float turb = fbm(fp * 2.1 + w * 1.4 + vec2(0.0, -t * 0.78));
    float fine = snoise(vec2(p.x * 6.5, p.y * 2.8 - t * 1.5));

    /* the burn front climbs from the foot of the letters to the top with a
       ragged, licking edge, and the flames around the word grow taller
       behind it. uIgnite is how far it has climbed. */
    float yl = (uv.y - uSpanB) / max(uSpanH, 0.05);                 // 0 at the baseline, 1 at the cap line
    float fn = fbm3(vec2(p.x * 1.6, p.y * 1.2 - t * 0.7)) * 0.2 + snoise(vec2(p.x * 7.0, t * 2.6)) * 0.035;
    float run = uIgnite * 1.5 - 0.12 - (clamp(yl, -0.2, 1.0) * 1.0 + fn);
    float lit = smoothstep(0.0, 0.12, run);
    float scorch = smoothstep(-0.14, 0.0, run) * (1.0 - lit);
    float runF = uIgnite * 3.4 - 0.25 - (max(yl, 0.0) + fn * 1.6);
    float litF = smoothstep(0.0, 0.35, runF);
    float sway = w.y * 0.12;

    /* the envelope, pulled sideways by the warp, swaying with height,
       leaning into the wind, and dragged down so tails stretch up */
    vec2 off = vec2((w.x * 0.09 + sway * lift - uWind * lift * 0.3) * uSpanH / uAspect,
                    -(0.07 + 0.06 * (turb * 0.5 + 0.5)) * uSpanH);
    vec4 envT = texture2D(uEnv, ruv + off);
    /* the halo hugs every side of the word; below the baseline it only
       glows a little, so the tagline underneath stays clear */
    float below = smoothstep(uSpanB - uSpanH * 0.12, uSpanB + uSpanH * 0.05, uv.y);
    float env = max(envT.r, smoothstep(0.04, 0.55, envT.g) * (0.55 + 0.45 * below));

    /* erosion grows with height: tongues narrow as they climb and break
       into detached licks near the top instead of ending in a wall */
    float erode = 0.13 + lift * 0.62;
    float flame = env * (1.0 + uHeat * 0.3) + turb * 0.56 + fine * 0.08 - erode;
    flame = clamp(flame / 0.72, 0.0, 1.0);
    float breathe = 0.92 + 0.08 * snoise(vec2(t * 0.35, 3.7));
    float flick = 0.9 + 0.1 * snoise(vec2(p.x * 1.2, t * 2.4));
    float gflick = 0.93 + 0.07 * snoise(vec2(t * 1.7, 9.1)) + 0.04 * snoise(vec2(t * 5.3, 2.4));

    /* a second, deeper sheet of flame behind the first: bigger, slower,
       darker — the parallax between the two is what reads as volume */
    vec2 wB = vec2(fbm3(fp * 0.8 + vec2(7.1, -t * 0.24)), fbm3(fp * 0.8 + vec2(2.2, -t * 0.29)));
    float turbB = fbm(fp * 1.55 + wB * 1.5 + vec2(3.0, -t * 0.58));
    vec2 offB = vec2((wB.x * 0.14 - uWind * lift * 0.22) * uSpanH / uAspect, -(0.1 + 0.08 * (turbB * 0.5 + 0.5)) * uSpanH);
    vec4 eB = texture2D(uEnv, ruv + offB);
    float envB = max(eB.r, smoothstep(0.03, 0.5, eB.g) * (0.55 + 0.45 * below));
    float flameB = clamp((envB * (1.14 + uHeat * 0.35) + turbB * 0.62 - (0.08 + lift * 0.46)) / 0.8, 0.0, 1.0);
    flameB *= smoothstep(1.0, 0.72, uv.y) * litF * gflick;
    float bodyB = smoothstep(0.12, 0.34, flameB);
    vec3 colB = mix(DEEP, heatRamp(flameB * 0.72), 0.75);

    /* the fire lights the paper around it: a warm, breathing glow */
    float castL = smoothstep(0.02, 0.7, max(envT.g, envT.r * 0.6)) * litF * gflick;
    float castA = castL * 0.2 * (1.0 - bodyB);
    flame *= breathe * flick * gflick * smoothstep(1.0, 0.78, uv.y) * litF;

    float temp = clamp(flame * (1.3 - lift * 0.62), 0.0, 1.0);
    float body = smoothstep(0.1, 0.32, flame);
    float glow = smoothstep(0.0, 0.26, flame) * 0.26;
    vec3 fCol = mix(mix(DEEP, ORNG, temp * 0.8), heatRamp(temp), body);
    float fA = max(body, glow) * clipLine;

    /* a thin warm smoke above the tips — barely there on cream, but it is
       what stops the flames looking pasted on */
    float sm = (w.y * 0.6 + turb * 0.4) * 0.5 + 0.5;
    float smokeA = smoothstep(0.03, 0.3, env) * (1.0 - body) * smoothstep(0.45, 1.2, lift)
                 * smoothstep(0.5, 0.85, sm) * 0.13 * litF * smoothstep(1.0, 0.72, uv.y) * clipLine;
    vec3 smokeCol = vec3(0.32, 0.22, 0.18);

    /* the letters: tinted glass with a dark rim. Fire pours in from the
       bottom (uFill) with a bright rolling surface, then keeps churning. */
    float m = texture2D(uMask, ruv).r * clipLine;
    /* scrolling away burns the word off from the top: a ragged front with a
       glowing ember edge and a charred rim eats down through the letters */
    float bn = fbm3(p * 2.4 + vec2(0.0, -t * 0.15)) * 0.5 + 0.5;
    float bField = (1.0 - clamp(yl, 0.0, 1.0)) * 0.62 + bn * 0.38;
    float dB = bField - (uBurn * 1.3 - 0.25);
    float alive = smoothstep(-0.01, 0.01, dB);
    float emberB = (1.0 - smoothstep(0.0, 0.045, dB)) * alive;
    float charB = (1.0 - smoothstep(0.045, 0.11, dB)) * alive * (1.0 - emberB);
    float e1 = 0.0032;
    float inner = min(min(texture2D(uMask, ruv + vec2(e1 / uAspect, 0.0)).r, texture2D(uMask, ruv - vec2(e1 / uAspect, 0.0)).r),
                      min(texture2D(uMask, ruv + vec2(0.0, e1)).r, texture2D(uMask, ruv - vec2(0.0, e1)).r));
    float rim = clamp(m - inner, 0.0, 1.0);

    /* depth: the letter pushed back down-right in slices, like a block */
    float ext = 0.0, extK = 0.0;
    for (int k = 1; k <= 9; k++){
      float fk = float(k);
      float mk = texture2D(uMask, ruv + vec2(uExt.x * fk / uAspect, uExt.y * fk)).r;   // depth follows the viewer
      if (mk > ext){ ext = mk; extK = fk / 9.0; }
    }
    ext *= clipLine * alive;
    /* bevel: the mask's slope near the edges, lit from the upper left */
    float e2 = 0.006;
    float gx = texture2D(uMask, ruv + vec2(e2 / uAspect, 0.0)).r - texture2D(uMask, ruv - vec2(e2 / uAspect, 0.0)).r;
    float gy = texture2D(uMask, ruv + vec2(0.0, e2)).r - texture2D(uMask, ruv - vec2(0.0, e2)).r;
    vec3 nrm = normalize(vec3(-gx, -gy, 0.55));
    float lamb = dot(nrm, normalize(uLight));
    float bevel = clamp(lamb, 0.0, 1.0);

    vec2 lp = p * 3.4;
    float churn = fbm(lp + w * 0.9 + vec2(0.0, -t * 1.2));
    float lick = snoise(vec2(p.x * 9.0, p.y * 4.0 - t * 3.0));
    float fireIn = clamp((0.64 + churn * 0.44 + lick * 0.12 + uHeat * 0.12) * gflick, 0.0, 1.0);
    fireIn = mix(fireIn * 0.72, fireIn, smoothstep(0.2, 0.9, inner));
    vec3 inCol = heatRamp(fireIn);

    /* ahead of the front the red chars; on the front a white-hot seam */
    vec3 glass = mix(RED, CHAR, scorch * 0.85);
    float glassA = 1.0;
    float seamF = smoothstep(0.0, 0.05, run) * (1.0 - smoothstep(0.05, 0.16, run));
    inCol = mix(inCol, HOT, seamF * 0.85);
    float filled = max(lit, seamF);
    vec3 letter = mix(glass, inCol, filled);
    float letA = mix(glassA, 0.97, filled);
    letter = mix(letter, mix(CHAR, DEEP, 0.35), rim);                         // the rim stays crisp
    letA = max(letA, rim * 0.95);
    letter = mix(letter, HOT, seamF * (1.0 - lit) * 0.6);
    letter *= 0.72 + 0.5 * bevel;                                             // raised face
    letter = mix(letter, vec3(1.0, 0.95, 0.85), smoothstep(0.9, 1.0, bevel) * 0.35 * (1.0 - rim));
    m *= letA;
    letter = mix(letter, CHAR * 0.7, charB * 0.85);
    letter = mix(letter, mix(ORNG, HOT, emberB * 0.7), emberB);
    m *= alive;
    /* back to front: smoke, flame, letters */
    /* nothing burns, smokes or glows under the word, and every effect
       fades before the edges of the quad — no hard box anywhere */
    float under = smoothstep(uSpanB - uSpanH * 0.02, uSpanB + uSpanH * 0.1, uv.y);
    float edge = smoothstep(0.0, 0.06, uv.x) * smoothstep(1.0, 0.94, uv.x) * smoothstep(0.96, 0.8, uv.y);
    float keep = under * edge;
    castA *= keep; smokeA *= keep; fA *= keep; bodyB *= keep;
    fA *= 1.0 - uBurn * 0.85; bodyB *= 1.0 - uBurn * 0.85; castA *= 1.0 - uBurn;
    vec3 acc = vec3(1.0, 0.62, 0.3) * castA; float a = castA;
    acc = smokeCol * smokeA + acc * (1.0 - smokeA); a = smokeA + a * (1.0 - smokeA);
    float bA = bodyB * clipLine * 0.9 * (1.0 - step(0.5, m));
    acc = colB * bA + acc * (1.0 - bA); a = bA + a * (1.0 - bA);
    float fa = fA * (1.0 - m);
    acc = fCol * fa + acc * (1.0 - fa); a = fa + a * (1.0 - fa);
    /* the block's side: dark, deeper toward the back, warmed by the fire */
    float sideA = ext * (1.0 - step(0.5, m));
    vec3 side = mix(mix(DEEP, CHAR, 0.3), CHAR * 0.6, extK);
    side = mix(side, mix(RED, ORNG, 0.5), lit * (1.0 - extK) * 0.55);
    acc = side * sideA + acc * (1.0 - sideA); a = sideA + a * (1.0 - sideA);
    acc = letter * m + acc * (1.0 - m); a = m + a * (1.0 - m);
    gl_FragColor = vec4(acc / max(a, 1e-4), clamp(a, 0.0, 1.0));
  }`

/* sparks: point sprites with a hot core, a soft halo and a per-spark flicker */
const sparkVert = `attribute float aLife; attribute float aSize; uniform float uPix, uT; varying float vLife, vFl;
  void main(){ vLife = aLife; vFl = 0.65 + 0.35 * sin(uT * (9.0 + aSize * 3.0) + aSize * 17.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * 2.2 * uPix * (0.35 + 0.65 * aLife); }`
const sparkFrag = `precision mediump float; varying float vLife, vFl;
  void main(){
    float r = length(gl_PointCoord - 0.5) * 2.0; if (r > 1.0) discard;
    float core = smoothstep(0.42, 0.0, r), halo = smoothstep(1.0, 0.3, r) * 0.28;
    vec3 c = mix(vec3(0.62, 0.1, 0.06), vec3(1.0, 0.6, 0.16), vLife);
    c = mix(c, vec3(1.0, 0.95, 0.78), core * vLife * vFl);
    gl_FragColor = vec4(c, (core + halo) * smoothstep(0.0, 0.3, vLife) * vFl);
  }`
```

The fragment shader runs about 30 noise evaluations per pixel. Keep the quad tight to the word (the padding below is all it needs), and cap DPR at 1.5.

**Uniforms:** `uIgnite` 0→1 (the burn front, tweened over 4.2 s with ease `.45,0,.35,1`) · `uReveal` 0→1 (the word rises out of its baseline, optional intro) · `uBurn` 0→1 (scroll-linked, eats the letters from the top) · `uHeat` (cursor proximity + stoke + ignite flare) · `uWind` (cursor x velocity) · `uExt` (extrusion vector, follows the cursor) · `uLight` (bevel light, follows the cursor) · `uAspect/uSpanB/uSpanH` (quad geometry, set on build) · `uFill` (kept at 1, unused by the current shader body).

---

## 3 · FireText: mask, envelope, plane, sparks, per-frame update

```js
import * as THREE from 'three'

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const map = (v, a, b) => clamp((v - a) / (b - a))
/* frame-rate independent smoothing, identical to MK.damp. Original per-frame lerps at 60 fps:
   0.035 → rate 2.1 · 0.06 → 3.7 · 0.08 → 5 · 0.12 → 7.7 */
const damp = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt))

export class FireText {
  /* stage: { scene, ptr, dpr, reduced } — see createFireStage */
  constructor(el, stage, { sparks = 70 } = {}){
    this.el = el
    this.stage = stage
    this.probe = el.parentElement.querySelector('.bl')
    this.ignite = 0; this.reveal = 1; this.fill = 1; this.heat = 0; this.visible = false
    this.burn = 0; this.burnS = 0; this.boost = 0; this.tilt = { x: 0, y: 0 }; this.flareT = -9; this.burstN = 0
    this.pad = null
    this.uniforms = {
      uMask: { value: null }, uEnv: { value: null }, uTime: { value: 0 }, uIgnite: { value: 0 },
      uReveal: { value: 1 }, uHeat: { value: 0 }, uWind: { value: 0 }, uAspect: { value: 1 },
      uSpanB: { value: 0.1 }, uSpanH: { value: 0.5 }, uFill: { value: 1 }, uBurn: { value: 0 },
      uExt: { value: new THREE.Vector2(-0.0021, 0.0034) }, uLight: { value: new THREE.Vector3(-0.45, 0.6, 0.66) },
    }
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: fireVert, fragmentShader: fireFrag,
      transparent: true, depthTest: false, depthWrite: false,
    }))
    this.mesh.frustumCulled = false
    stage.scene.add(this.mesh)

    /* sparks: a fixed pool, integrated on the CPU */
    this.N = sparks
    this.sp = { x: new Float32Array(sparks), y: new Float32Array(sparks), vx: new Float32Array(sparks),
                vy: new Float32Array(sparks), life: new Float32Array(sparks), max: new Float32Array(sparks),
                seed: new Float32Array(sparks) }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(sparks * 3), 3))
    g.setAttribute('aLife', new THREE.BufferAttribute(new Float32Array(sparks), 1))
    const sizes = new Float32Array(sparks)
    for (let i = 0; i < sparks; i++){ sizes[i] = 1.4 + Math.pow(Math.random(), 2.2) * 4.2; this.sp.seed[i] = Math.random() * 100 }
    g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    this.sparks = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: { uPix: { value: stage.dpr }, uT: { value: 0 } }, vertexShader: sparkVert, fragmentShader: sparkFrag,
      transparent: true, depthTest: false, depthWrite: false,
    }))
    this.sparks.frustumCulled = false
    stage.scene.add(this.sparks)
    this.edges = []
    this.spawnAcc = 0
  }

  /* Rasterise the word into a mask, build the flame envelope and the spark
     sources. Call after fonts load and on (debounced) resize — never per frame. */
  build(){
    const r = this.el.getBoundingClientRect()
    if (r.width < 4 || r.height < 4) return
    const DPR = this.stage.dpr
    const cs = getComputedStyle(this.el)
    const h = r.height
    const padX = h * 0.3, padT = h * 1.15, padB = h * 0.16
    const W = r.width + padX * 2, H = h + padT + padB
    const sc = Math.min(1.5, DPR, 2400 / W)
    const cw = Math.max(4, Math.round(W * sc)), ch = Math.max(4, Math.round(H * sc))
    this.pad = { x: padX, t: padT, b: padB, W, H }

    const c = document.createElement('canvas'); c.width = cw; c.height = ch
    const x = c.getContext('2d', { willReadFrequently: true })
    x.fillStyle = '#000'; x.fillRect(0, 0, cw, ch)
    x.fillStyle = '#fff'
    x.font = `${cs.fontWeight} ${parseFloat(cs.fontSize) * sc}px ${cs.fontFamily}`
    x.textBaseline = 'alphabetic'
    const baseline = ((this.probe ? this.probe.getBoundingClientRect().top : r.bottom - h * 0.12) - r.top + padT) * sc
    /* Each glyph goes exactly where the browser laid it out (a Range per
       character), squeezed to that advance. Canvas text cannot use the
       font's optical-size axis, so its glyphs run wider than the page's;
       without this the letters pile into each other. */
    const tn = [...this.el.childNodes].find(n => n.nodeType === 3)
    const lsDom = parseFloat(cs.letterSpacing) || 0
    for (let i = 0; i < tn.textContent.length; i++){
      const chr = tn.textContent[i]; if (!chr.trim()) continue
      const rg = document.createRange(); rg.setStart(tn, i); rg.setEnd(tn, i + 1)
      const cr = rg.getBoundingClientRect()
      const w = x.measureText(chr).width
      const sx = clamp((cr.width - lsDom) * sc / Math.max(1, w), 0.45, 1.25)
      x.save(); x.translate((cr.left - r.left + padX) * sc, baseline); x.scale(sx, 1)
      x.fillText(chr, 0, 0); x.restore()
    }

    /* envelope at half resolution: drag each column's mask upward with an
       exponential falloff (R channel = where tongues may rise), plus a
       blurred halo (G channel = glow hugging every side of the word) */
    const img = x.getImageData(0, 0, cw, ch).data
    const ew = Math.ceil(cw / 2), eh = Math.ceil(ch / 2)
    const env = new Float32Array(ew * eh)
    for (let yy = 0; yy < eh; yy++) for (let xx = 0; xx < ew; xx++)
      env[yy * ew + xx] = img[(Math.min(ch - 1, yy * 2) * cw + Math.min(cw - 1, xx * 2)) * 4] / 255
    const halo = env.slice()
    const k = Math.exp(-1 / Math.max(2, h * sc / 2 * 0.42))   // longer tail: taller tongues
    for (let xx = 0; xx < ew; xx++){
      let prev = 0
      for (let yy = eh - 1; yy >= 0; yy--){ const i = yy * ew + xx; const v = Math.max(env[i], prev * k); env[i] = v; prev = v }
    }
    /* separable running-sum box blur, in place */
    const blur = (rad, horiz, buf) => {
      const out = new Float32Array(buf.length), n = horiz ? ew : eh, m = horiz ? eh : ew
      for (let a = 0; a < m; a++){
        let sum = 0, cnt = 0
        const at = b => horiz ? buf[a * ew + b] : buf[b * ew + a]
        for (let b = -rad; b <= rad; b++) if (b >= 0 && b < n){ sum += at(b); cnt++ }
        for (let b = 0; b < n; b++){
          out[horiz ? a * ew + b : b * ew + a] = sum / cnt
          const add = b + rad + 1, rem = b - rad
          if (add < n){ sum += at(add); cnt++ }
          if (rem >= 0){ sum -= at(rem); cnt-- }
        }
      }
      buf.set(out)
    }
    const rb = Math.max(1, Math.round(h * sc / 2 * 0.045))
    blur(rb, true, env); blur(Math.max(1, rb >> 1), false, env)
    const hr = Math.max(2, Math.round(h * sc / 2 * 0.07))
    for (let pass = 0; pass < 2; pass++){ blur(hr, true, halo); blur(hr, false, halo) }
    const ec = document.createElement('canvas'); ec.width = ew; ec.height = eh
    const ex = ec.getContext('2d'), eimg = ex.createImageData(ew, eh)
    for (let i = 0; i < env.length; i++){ const v = Math.min(255, env[i] * 255); const j = i * 4
      eimg.data[j] = eimg.data[j + 2] = v; eimg.data[j + 1] = Math.min(255, halo[i] * 2.2 * 255); eimg.data[j + 3] = 255 }
    ex.putImageData(eimg, 0, 0)

    /* spark sources: the top edges of the letters (normalised quad coords, pairs) */
    this.edges = []
    const st = Math.max(2, Math.round(3 * sc))
    for (let py = st * 2; py < ch; py += st) for (let px = 0; px < cw; px += st){
      if (img[(py * cw + px) * 4] > 160 && img[((py - st * 2) * cw + px) * 4] < 40) this.edges.push(px / cw, py / ch)
    }

    for (const key of ['uMask', 'uEnv']) this.uniforms[key].value?.dispose()
    const mk = cnv => { const tx = new THREE.CanvasTexture(cnv); tx.colorSpace = THREE.NoColorSpace
      tx.minFilter = tx.magFilter = THREE.LinearFilter; tx.generateMipmaps = false; return tx }
    this.uniforms.uMask.value = mk(c)
    this.uniforms.uEnv.value = mk(ec)
    this.uniforms.uAspect.value = W / H
    this.uniforms.uSpanB.value = padB / H
    this.uniforms.uSpanH.value = h / H
  }

  /* stoke: the flames surge and a spray of sparks is thrown out */
  burst(){ this.flareT = performance.now() / 1000; this.burstN = Math.round(this.N * 0.55) }

  update(t, dt){
    const { ptr, reduced } = this.stage
    const r = this.el.getBoundingClientRect()
    const p = this.pad
    if (!p) return
    const x0 = r.left - p.x, y0 = r.top - p.t
    this.visible = r.bottom + p.b > 0 && y0 < innerHeight && this.ignite + this.reveal + this.fill > 0.004
    this.mesh.visible = this.sparks.visible = this.visible
    if (!this.visible) return
    /* the quad follows the DOM rect (ortho camera in CSS px, y up) */
    this.mesh.position.set(x0 + p.W / 2, innerHeight - (y0 + p.H / 2), 0)
    this.mesh.scale.set(p.W, p.H, 1)

    /* pointer: closer is hotter, sideways flicks lean the flames */
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2
    const d = Math.hypot((ptr.x - cx) / (r.width * 0.7), (ptr.y - cy) / (r.height * 1.3))
    this.heat = damp(this.heat, Math.max(ptr.active ? clamp(1.25 - d) : 0, this.boost || 0), 2.1, dt)
    const u = this.uniforms
    u.uTime.value = t; u.uIgnite.value = this.ignite; u.uReveal.value = this.reveal; u.uFill.value = this.fill
    const ig = this.ignite, flare = ig > 0 && ig < 1 ? Math.pow(4 * ig * (1 - ig), 1.5) * 0.55 : 0
    const stoke = Math.exp(-Math.max(0, performance.now() / 1000 - this.flareT) * 1.5) * 1.15
    u.uHeat.value = Math.min(1.9, this.heat + flare + stoke); u.uWind.value = ptr.wind
    /* the block turns toward the viewer: depth and light follow the cursor
       (a slow sway on touch screens, where there is no cursor) */
    let tx = Math.sin(t * 0.4) * 0.45, ty = Math.sin(t * 0.29 + 1) * 0.3
    if (ptr.active){ tx = clamp((ptr.x - cx) / (innerWidth * 0.45), -1, 1); ty = clamp((ptr.y - cy) / (innerHeight * 0.45), -1, 1) }
    if (reduced){ tx *= 0.3; ty *= 0.3 }
    this.tilt.x = damp(this.tilt.x, tx, 3.7, dt); this.tilt.y = damp(this.tilt.y, ty, 3.7, dt)
    u.uExt.value.set(-0.0021 - this.tilt.x * 0.0026, 0.0034 + this.tilt.y * 0.0026)
    u.uLight.value.set(-0.45 + this.tilt.x * 0.5, 0.6 - this.tilt.y * 0.5, 0.66)
    this.burnS = damp(this.burnS, this.burn, 7.7, dt); u.uBurn.value = this.burnS
    this.sparks.material.uniforms.uT.value = t

    /* sparks: buoyancy, sideways drag 0.6^dt, wind; spawned from the letter tops */
    const s = this.sp, pos = this.sparks.geometry.attributes.position.array
    const life = this.sparks.geometry.attributes.aLife.array
    const scale = r.height / 300
    this.spawnAcc += dt * (reduced ? 3 : 9) * Math.min(1, this.ignite * 1.6) * (1 + this.heat * 1.4 + (this.ignite > 0.02 && this.ignite < 0.95 ? 1.2 : 0) + this.burnS * 5)
    for (let i = 0; i < this.N; i++){
      if (s.life[i] <= 0 && this.burstN > 0 && this.edges.length){           // stoke burst: fast, wide
        this.burstN--
        const e = (Math.random() * (this.edges.length / 2) | 0) * 2
        s.x[i] = x0 + this.edges[e] * p.W; s.y[i] = y0 + this.edges[e + 1] * p.H
        s.vx[i] = (Math.random() - 0.5) * 300 * scale
        s.vy[i] = -(140 + Math.random() * 260) * scale
        s.max[i] = s.life[i] = 1.2 + Math.random() * 1.6
      }
      if (s.life[i] <= 0 && this.spawnAcc >= 1 && this.edges.length){         // steady trickle
        this.spawnAcc -= 1
        const e = (Math.random() * (this.edges.length / 2) | 0) * 2
        s.x[i] = x0 + this.edges[e] * p.W; s.y[i] = y0 + this.edges[e + 1] * p.H
        s.vx[i] = (Math.random() - 0.5) * 24 * scale
        s.vy[i] = -(38 + Math.random() * 70) * scale * (1 + this.heat * 0.5)
        s.max[i] = s.life[i] = 1.4 + Math.random() * 2.2
      }
      if (s.life[i] > 0){
        s.life[i] -= dt
        const ph = s.seed[i] + t * 0.9
        s.vx[i] += (Math.sin(ph * 1.7) * 46 + Math.sin(ph * 4.3 + s.y[i] * 0.02) * 30 - ptr.wind * 110) * scale * dt
        s.vx[i] *= Math.pow(0.6, dt)
        s.vy[i] -= (14 + Math.sin(ph * 2.1) * 10) * scale * dt
        s.x[i] += s.vx[i] * dt; s.y[i] += s.vy[i] * dt
      }
      pos[i * 3] = s.x[i]                     // sparks live in viewport px (they do not scroll with the word)
      pos[i * 3 + 1] = innerHeight - s.y[i]
      life[i] = Math.max(0, s.life[i] / (s.max[i] || 1))
    }
    this.spawnAcc = Math.min(this.spawnAcc, 3)
    this.sparks.geometry.attributes.position.needsUpdate = true
    this.sparks.geometry.attributes.aLife.needsUpdate = true
  }

  dispose(){
    this.stage.scene.remove(this.mesh, this.sparks)
    this.uniforms.uMask.value?.dispose(); this.uniforms.uEnv.value?.dispose()
    this.mesh.geometry.dispose(); this.mesh.material.dispose()
    this.sparks.geometry.dispose(); this.sparks.material.dispose()
  }
}
```

---

## 4 · Stage: renderer, ortho camera in CSS px, pointer, frame, resize

```js
export function createFireStage({ dpr = Math.min(devicePixelRatio || 1, 1.5), reduced = false } = {}){
  const canvas = document.createElement('canvas')
  canvas.className = 'fire-gl'; canvas.setAttribute('aria-hidden', 'true')
  let renderer
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }) }
  catch (e) { return null }
  document.body.appendChild(canvas)
  renderer.setPixelRatio(dpr)
  renderer.setClearColor(0x000000, 0)
  renderer.autoClear = false                       // cleared manually, so an all-hidden frame still wipes the canvas
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.setSize(innerWidth, innerHeight, false)

  /* pixel-space scene for the burning words: x right, y up, in CSS px */
  const scene = new THREE.Scene()
  const cam = new THREE.OrthographicCamera(0, innerWidth, innerHeight, 0, -10, 10)
  const ptr = { x: innerWidth / 2, y: innerHeight / 2, vx: 0, wind: 0, active: false }
  const fires = []

  const stage = {
    canvas, renderer, scene, cam, ptr, dpr, reduced, fires,
    add(el, opts){ const f = new FireText(el, stage, opts); fires.push(f); return f },
    onPointer(e){ ptr.vx = e.clientX - ptr.x; ptr.x = e.clientX; ptr.y = e.clientY; ptr.active = true },
    frame(t, dt){
      ptr.wind = damp(ptr.wind, clamp(ptr.vx * 0.05, -1, 1), 5, dt); ptr.vx *= Math.pow(0.85, dt * 60)
      renderer.clear()
      let any = false
      for (const f of fires){ f.update(t * (reduced ? 0.4 : 1), dt); any = any || f.visible }
      if (any) renderer.render(scene, cam)
    },
    resize(){
      renderer.setSize(innerWidth, innerHeight, false)
      cam.right = innerWidth; cam.top = innerHeight; cam.updateProjectionMatrix()
      fires.forEach(f => f.build())
    },
    dispose(){ fires.forEach(f => f.dispose()); fires.length = 0; renderer.dispose(); canvas.remove() },
  }
  return stage
}
```

Two words (Ember lit "FIRE" in the hero and "HUNGRY?" in the CTA) should share **one** stage: call `stage.add()` for each word so they render in one scene, rather than creating two WebGL contexts.

---

## 5 · Hooks: ignite, stoke, scroll burn

- **Ignite:** tween `fire.ignite` 0→1 over `4.2 * (1 - fire.ignite * 0.8)` s with ease `.45,0,.35,1`. When the word leaves view, tween it back to 0 over 0.6 s. Optionally tween `fire.reveal` 0→1 over 1.5 s for an intro rise. **Never light it under a loader**: wait until the intro has finished.
- **Stoke:** on `pointerdown` over the word, if `ignite >= 0.5 && burnS <= 0.3`, call `fire.burst()`. That sends a heat spike (`exp(-age·1.5)·1.15`) plus 55 % of the spark pool thrown out at speed. In Ember the same tap also sent a shockwave through the A2 spices. Here it is exposed as a `fire:stoke` event.
- **Scroll burn:** as the hero scrolls away (`start: 'top top', end: 'bottom top'`), `fire.boost = map(p, .02, .5) * .9` (a last flare) and `fire.burn = map(p, .1, .72)`. `burnS` damps toward `burn`, and the shader eats the letters from the top with an ember edge. Ember also moved the word at 26 vh × progress and faded the tagline, but that part is site-specific.

---

## 6 · motion-kit wrapper

```js
// <script type="importmap">{ "imports": { "three": "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js" } }</script>
// load this file as type="module" before MK.start(); FireText + createFireStage from above live in the same module.
MK.effect('fire-type', (el, o) => {
  const fallback = () => { el.classList.add('fire--static'); o.cleanup(() => el.classList.remove('fire--static')) }
  if (o.is.reduce) return fallback()
  const stage = createFireStage({ reduced: false })
  if (!stage) return fallback()                                   // no WebGL

  el.classList.add('fire--live')
  const fire = stage.add(el, { sparks: o.opt('sparks', 70) })
  o.on(window, 'pointermove', stage.onPointer, { passive: true })

  let rsz = 0
  o.on(window, 'resize', () => { clearTimeout(rsz); rsz = setTimeout(stage.resize, 120) })
  document.fonts.ready.then(() => { if (o.alive()){ stage.resize(); stage.renderer.compile(stage.scene, stage.cam) } })

  /* frame loop: paused while the word is far off-screen; wipe the fixed canvas when it sleeps */
  o.loop((dt, time) => stage.frame(time, dt), { el, margin: '60% 0px', onToggle: v => { if (!v) stage.renderer.clear() } })

  /* ignite when it arrives, douse when it leaves */
  const igniteEase = MK.customEase('mk-fire-ignite', '0.45,0,0.35,1', 'power2.inOut')
  let tw = null
  const light = (delay = 0) => { tw?.kill(); tw = o.gsap.to(fire, { ignite: 1, duration: 4.2 * (1 - fire.ignite * 0.8), ease: igniteEase, delay }) }
  const douse = () => { tw?.kill(); tw = o.gsap.to(fire, { ignite: 0, duration: 0.6, ease: 'none' }) }
  o.trigger({ trigger: el, start: 'top 85%', end: 'bottom 15%', onToggle: s => (s.isActive ? light(0.15) : douse()) })

  /* stoke */
  o.on(el, 'pointerdown', e => {
    if (fire.ignite < 0.5 || fire.burnS > 0.3) return
    fire.burst()
    el.dispatchEvent(new CustomEvent('fire:stoke', { bubbles: true, detail: { x: e.clientX, y: e.clientY } }))
  })

  /* scroll burn (opt out with data-mk-burn="false") */
  if (o.opt('burn', true)){
    const host = el.closest('section') || el
    o.trigger({ trigger: host, start: 'top top', end: 'bottom top', scrub: true,
      onUpdate: s => { fire.boost = map(s.progress, 0.02, 0.5) * 0.9; fire.burn = map(s.progress, 0.1, 0.72) } })
  }

  o.cleanup(() => { tw?.kill(); clearTimeout(rsz); stage.dispose(); el.classList.remove('fire--live') })
}, { reduced: (el, o) => { el.classList.add('fire--static'); o.cleanup(() => el.classList.remove('fire--static')) } })
```
