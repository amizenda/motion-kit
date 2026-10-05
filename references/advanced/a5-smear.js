/* Smear test: a 2D canvas card where dragging leaves a glossy smear of the chosen formula.
   - gel:   translucent tinted body, a specular rim offset toward the light, and a gloss band that drifts.
   - cream: opaque pastel with soft edges and a low, matte sheen.
   - squa:  a thin clear film that re-draws the backdrop shifted a few px (refraction) with a fine bright rim.
   Strokes are brush paths along the pointer; width follows pointer speed (fast = thin), every point
   absorbs over 6 s (it thins to nothing on an ease-in curve). Colours are read from :root tokens.
   No pixel reads, so a file:// backdrop never taints anything.

   Ported with three fixes:
   1. every stroke owns its own state (last point, speed, smoothed width), so the scripted demo
      swipe runs in its own stroke object and can never hijack a user stroke (or vice versa);
   2. the active user stroke is bound to one pointerId — a second finger, or a stray pointerup
      from another pointer, is ignored;
   3. the canvas uses touch-action: pan-y. A touch only starts drawing after a short horizontal
      intent (INTENT px, mostly sideways); a vertical drag is left to the browser, so the page
      still scrolls over a large card on phones. Mouse and pen draw immediately. */
(function () {
  'use strict';
  var LIFE = 6000;
  var INTENT = 8;                                         // px of mostly-horizontal travel before a touch draws
  var BASE = { gel: 0.062, cream: 0.078, squa: 0.04 };    // brush width, as a fraction of card width
  var READ = {
    gel:   { slip: '8 / 10',  shine: 'Glassy',      finish: 'Dewy, no film' },
    cream: { slip: '5 / 10',  shine: 'Soft matte',  finish: 'Cushioned, velvet' },
    squa:  { slip: '10 / 10', shine: 'Clear sheen', finish: 'Bare, just glowier' }
  };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mk() { var c = document.createElement('canvas'); return { c: c, x: c.getContext('2d') }; }

  window.Smear = function (card, opt) {
    opt = opt || {};
    var cv = card.querySelector('canvas');
    var ctx = cv && cv.getContext('2d');
    if (!ctx) return null;
    var src = card.querySelector('.smear-src');
    var hint = card.querySelector('.smear-hint');
    var stateEl = card.querySelector('.smear-state');
    var root = getComputedStyle(document.documentElement);
    var tok = function (n, d) { return (root.getPropertyValue(n) || '').trim() || d; };
    var C = { tint: tok('--smear-tint', '#6F7DFF'), cream: tok('--smear-cream', '#FFB3F0'), white: tok('--smear-white', '#FFFFFF'), black: tok('--smear-black', '#000000') };
    var INK = { gel: C.tint, cream: C.cream, squa: C.white };
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var W = 2, H = 2, cw = 1;
    var L = { gel: mk(), cream: mk(), squa: mk() }, T1 = mk(), T2 = mk();
    var strokes = [], formula = 'gel';
    var active = null;          // { id: pointerId, stroke }  — the user's stroke, bound to one pointer
    var pending = null;         // { id, x, y, t } — a touch that has not shown horizontal intent yet
    var demoRaf = 0, demoStroke = null, destroyed = false;
    var visible = false, raf = 0, frozen = !!opt.frozen, still = !!opt.reduced, lastState = 0, demoDone = false;

    function size() {
      var r = card.getBoundingClientRect();
      cw = Math.max(1, r.width);
      W = Math.max(2, Math.round(r.width * dpr)); H = Math.max(2, Math.round(r.height * dpr));
      [cv, L.gel.c, L.cream.c, L.squa.c, T1.c, T2.c].forEach(function (c) { c.width = W; c.height = H; });
      kick(true);
    }

    // backdrop, cover-fitted; a drawn glass-tile fallback if the image is missing
    function backdrop(g, dx, dy, s) {
      dx = dx || 0; dy = dy || 0; s = s || 1;
      if (src && src.complete && src.naturalWidth) {
        var iw = src.naturalWidth, ih = src.naturalHeight, k = Math.max(W / iw, H / ih) * s;
        var w = iw * k, h = ih * k;
        g.drawImage(src, (W - w) / 2 + dx, (H - h) / 2 + dy, w, h);
      } else {
        g.fillStyle = C.tint; g.fillRect(0, 0, W, H);
        g.globalAlpha = 0.16; g.strokeStyle = C.white; g.lineWidth = 1 * dpr;
        var step = Math.round(W / 9);
        for (var x = (dx % step); x < W; x += step) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
        for (var y = (dy % step); y < H; y += step) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
        g.globalAlpha = 1;
      }
    }

    function absorb(age) { var k = clamp(age / LIFE, 0, 1); return 1 - k * k * k; }

    // draw every live stroke of one formula into its mask layer (opaque ink, so overlaps never darken)
    function paintMask(f, now) {
      var g = L[f].x, any = false;
      g.clearRect(0, 0, W, H);
      g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = INK[f]; g.fillStyle = INK[f];
      for (var s = 0; s < strokes.length; s++) {
        var st = strokes[s]; if (st.f !== f) continue;
        var p = st.pts, n = p.length;
        if (n === 1) {
          var r1 = p[0].w * absorb(now - p[0].t) * W / 2;
          if (r1 > 0.4) { g.beginPath(); g.arc(p[0].x * W, p[0].y * W, r1, 0, 6.2832); g.fill(); any = true; }
          continue;
        }
        for (var i = 1; i < n; i++) {
          var a = p[i - 1], b = p[i];
          var w = b.w * absorb(now - b.t) * W;
          if (w < 0.5) continue;
          g.lineWidth = w; g.beginPath(); g.moveTo(a.x * W, a.y * W); g.lineTo(b.x * W, b.y * W); g.stroke(); any = true;
        }
      }
      return any;
    }

    // T = mask minus mask shifted by (ox, oy): a crescent on one edge; then tinted
    function rim(mask, ox, oy, color) {
      var g = T1.x;
      g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H);
      g.drawImage(mask, 0, 0);
      g.globalCompositeOperation = 'destination-out'; g.drawImage(mask, ox, oy);
      g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'source-over';
      return T1.c;
    }
    function tint(mask, color) {
      var g = T1.x;
      g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H);
      g.drawImage(mask, 0, 0);
      g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'source-over';
      return T1.c;
    }

    function render(now) {
      var t = still ? 0 : now;
      var ang = -2.2 + (still ? 0 : 0.42 * Math.sin(t / 1900));      // light comes from the upper left, drifting
      var lx = Math.cos(ang), ly = Math.sin(ang);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      ctx.clearRect(0, 0, W, H);
      backdrop(ctx);

      // squalane first: it is the thinnest film and sits under the others
      if (paintMask('squa', now)) {
        var m = L.squa.c, g2 = T2.x;
        g2.globalCompositeOperation = 'source-over'; g2.clearRect(0, 0, W, H);
        backdrop(g2, -lx * 6 * dpr, -ly * 6 * dpr, 1.025);            // refraction shift
        g2.globalCompositeOperation = 'destination-in'; g2.drawImage(m, 0, 0);
        g2.globalCompositeOperation = 'source-over';
        ctx.drawImage(T2.c, 0, 0);
        ctx.globalAlpha = 0.12; ctx.drawImage(tint(m, C.white), 0, 0);
        ctx.globalAlpha = 0.2; ctx.drawImage(rim(m, lx * 2 * dpr, ly * 2 * dpr, C.black), 0, 0);
        ctx.globalAlpha = 0.85; ctx.drawImage(rim(m, -lx * 2.2 * dpr, -ly * 2.2 * dpr, C.white), 0, 0);
        ctx.globalAlpha = 1;
      }

      if (paintMask('gel', now)) {
        var mg = L.gel.c;
        ctx.globalAlpha = 0.2; ctx.drawImage(rim(mg, lx * 3 * dpr, ly * 3 * dpr, C.black), 0, 0);
        ctx.globalAlpha = 0.5; ctx.drawImage(mg, 0, 0);
        // specular rim toward the light, softened with a glow
        ctx.save(); ctx.shadowColor = C.white; ctx.shadowBlur = 5 * dpr;
        ctx.globalAlpha = 0.9; ctx.drawImage(rim(mg, -lx * 4 * dpr, -ly * 4 * dpr, C.white), 0, 0);
        ctx.restore();
        // gloss band that drifts across the gel
        var g3 = T2.x, gx = -ly, gy = lx;  // the band sweeps along this axis
        var pr = [0, gx * W, gy * H, gx * W + gy * H], lo = Math.min.apply(null, pr), hi = Math.max.apply(null, pr), bw = W * 0.16;
        var pos = lo - bw + ((t / 2600) % 1) * (hi - lo + bw * 2);
        g3.globalCompositeOperation = 'source-over'; g3.clearRect(0, 0, W, H);
        var grad = g3.createLinearGradient(gx * pos, gy * pos, gx * (pos + bw), gy * (pos + bw));
        grad.addColorStop(0, 'rgba(255,255,255,0)'); grad.addColorStop(0.5, 'rgba(255,255,255,.55)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
        g3.fillStyle = grad; g3.fillRect(0, 0, W, H);
        g3.globalCompositeOperation = 'destination-in'; g3.drawImage(mg, 0, 0);
        g3.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = still ? 0 : 0.7; ctx.drawImage(T2.c, 0, 0);
        ctx.globalAlpha = 1;
      }

      if (paintMask('cream', now)) {
        var mc = L.cream.c;
        ctx.globalAlpha = 0.14; ctx.drawImage(rim(mc, lx * 5 * dpr, ly * 5 * dpr, C.black), lx * 1.5 * dpr, ly * 1.5 * dpr);
        ctx.save(); ctx.shadowColor = C.cream; ctx.shadowBlur = 14 * dpr;
        ctx.globalAlpha = 0.97; ctx.drawImage(mc, 0, 0);
        ctx.restore();
        ctx.save(); ctx.shadowColor = C.white; ctx.shadowBlur = 12 * dpr;
        ctx.globalAlpha = 0.2; ctx.drawImage(rim(mc, -lx * 10 * dpr, -ly * 10 * dpr, C.white), 0, 0);
        ctx.restore();
        ctx.globalAlpha = 1;
      }
    }

    // drop absorbed points; drop a stroke once it is empty and nothing is still drawing into it
    function prune(now) {
      for (var s = strokes.length - 1; s >= 0; s--) {
        var p = strokes[s].pts;
        while (p.length && now - p[0].t > LIFE) p.shift();
        if (!p.length && !strokes[s].live) strokes.splice(s, 1);
      }
    }

    function status(now) {
      if (!stateEl || now - lastState < 120) return;
      lastState = now;
      var newest = 0;
      strokes.forEach(function (st) { var p = st.pts; if (p.length) newest = Math.max(newest, p[p.length - 1].t); });
      stateEl.textContent = newest ? 'Absorbing · ' + Math.max(0, (LIFE - (now - newest)) / 1000).toFixed(1) + ' s' : 'Glass is clean';
    }

    function frame() {
      raf = 0;
      if (destroyed) return;
      var now = performance.now();
      if (!frozen) prune(now);
      render(frozen ? (opt.frozenAt || now) : now);
      status(now);
      if (!frozen && visible && strokes.length) raf = requestAnimationFrame(frame);
    }
    function kick(force) { if (!raf && !destroyed && (visible || force)) raf = requestAnimationFrame(frame); }

    /* ---- strokes: each one carries its own pen state ---- */
    function newStroke(f) { var st = { f: f, pts: [], last: null, speed: 0, wS: null, live: true }; strokes.push(st); return st; }
    function endStroke(st) { if (st) { st.live = false; st.last = null; } }

    // points are stored in card-width units (x and y both / card width)
    function norm(cx, cy) { var r = cv.getBoundingClientRect(); return { x: (cx - r.left) / r.width, y: (cy - r.top) / r.width, cw: r.width }; }
    function addPoint(st, x, y, t, cwNow) {
      var cwp = cwNow || cw, last = st.last;
      if (last) {
        var d = Math.hypot(x - last.x, y - last.y) * cwp;
        if (d < 1.5) return;
        var dt = Math.max(1, t - last.t);
        st.speed = st.speed * 0.72 + (d / dt) * 0.28;
      }
      var target = BASE[st.f] * clamp(1.25 - st.speed * 0.42, 0.34, 1.25);
      st.wS = st.wS == null ? target : st.wS + (target - st.wS) * 0.28;
      // fill long gaps with in-between stamps so width eases and the path stays round
      if (last) {
        var gap = Math.hypot(x - last.x, y - last.y) * cwp, n = Math.floor(gap / 5);
        for (var i = 1; i < n; i++) {
          var k = i / n;
          st.pts.push({ x: last.x + (x - last.x) * k, y: last.y + (y - last.y) * k, w: last.w + (st.wS - last.w) * k, t: last.t + (t - last.t) * k });
        }
      }
      st.last = { x: x, y: y, w: st.wS, t: t };
      st.pts.push(st.last);
    }
    function addClient(st, cx, cy, t) { var p = norm(cx, cy); addPoint(st, p.x, p.y, t, p.cw); }

    function startUser(e, x0, y0, t0) {
      try { cv.setPointerCapture(e.pointerId); } catch (err) {}
      frozen = false;
      active = { id: e.pointerId, stroke: newStroke(formula) };
      addClient(active.stroke, x0, y0, t0);
      if (hint) hint.classList.add('is-gone');
      kick(true);
    }

    function onDown(e) {
      if (e.button > 0 || active || pending) return;          // one drawing pointer at a time
      if (e.pointerType === 'touch') {                         // wait for horizontal intent; let vertical drags scroll
        pending = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() };
        return;
      }
      startUser(e, e.clientX, e.clientY, performance.now());
    }
    function onMove(e) {
      if (pending && e.pointerId === pending.id) {
        var dx = e.clientX - pending.x, dy = e.clientY - pending.y;
        if (Math.abs(dy) > INTENT && Math.abs(dy) >= Math.abs(dx)) { pending = null; return; }   // a scroll: give up
        if (Math.abs(dx) > INTENT && Math.abs(dx) > Math.abs(dy) * 1.2) {
          var p0 = pending; pending = null;
          startUser(e, p0.x, p0.y, p0.t);                      // the stroke starts where the finger landed
        } else return;
      }
      if (!active || e.pointerId !== active.id) return;
      var list = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
      if (!list || !list.length) list = [e];
      for (var i = 0; i < list.length; i++) addClient(active.stroke, list[i].clientX, list[i].clientY, performance.now());
      kick(true);
    }
    function onEnd(e) {
      if (pending && e.pointerId === pending.id) pending = null;
      if (active && e.pointerId === active.id) { endStroke(active.stroke); active = null; }
    }
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) { cv.addEventListener(ev, onEnd); });

    // a scripted swipe so the glass is never blank on arrival — in its OWN stroke object
    function demo(f, ms, done) {
      f = f || formula; ms = ms || 1300;
      var t0 = performance.now(), ar = H / W;
      var st = demoStroke = newStroke(f);
      (function step() {
        demoRaf = 0;
        if (destroyed) return;
        var now = performance.now(), k = clamp((now - t0) / ms, 0, 1);
        var e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        addPoint(st, 0.14 + 0.72 * e, ar * (0.52 + Math.sin(e * Math.PI * 2) * 0.2), now);
        kick(true);
        if (k < 1) demoRaf = requestAnimationFrame(step);
        else { endStroke(st); demoStroke = null; if (done) done(); }
      })();
    }

    // frozen still (e.g. a ?static screenshot mode): three swipes, rendered once
    function still3() {
      var now = performance.now(), ar = H / W;
      ['squa', 'gel', 'cream'].forEach(function (f, j) {
        var st = newStroke(f);
        for (var i = 0; i <= 60; i++) {
          var e = i / 60;
          addPoint(st, 0.12 + 0.76 * e, ar * (0.28 + j * 0.22 + Math.sin(e * 6.2832 + j) * 0.07), now - 600 + i * 10);
        }
        endStroke(st);
      });
      opt.frozenAt = now + 400; frozen = true; raf = requestAnimationFrame(frame);
    }

    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (en) {
      visible = en[0].isIntersecting;
      if (visible) {
        kick(true);
        if (!demoDone && !frozen && !still && en[0].intersectionRatio > 0.45) { demoDone = true; setTimeout(function () { if (!destroyed) demo('gel', 1400); }, 250); }
      }
    }, { threshold: [0, 0.5] }) : null;
    if (io) io.observe(card); else visible = true;

    function onSrcLoad() { kick(true); }
    if (src && !(src.complete && src.naturalWidth)) src.addEventListener('load', onSrcLoad);
    var rt = 0;
    function onResize() { clearTimeout(rt); rt = setTimeout(size, 120); }
    window.addEventListener('resize', onResize);
    size();
    if (frozen) still3();

    return {
      setFormula: function (f) { if (BASE[f]) formula = f; return READ[f]; },
      clear: function () {
        strokes = strokes.filter(function (st) { return st.live; });      // keep in-progress strokes, drop their old points
        strokes.forEach(function (st) { st.pts.length = 0; st.last = null; });
        kick(true);
      },
      read: READ,
      destroy: function () {
        destroyed = true;
        if (raf) cancelAnimationFrame(raf);
        if (demoRaf) cancelAnimationFrame(demoRaf);
        clearTimeout(rt);
        if (io) io.disconnect();
        window.removeEventListener('resize', onResize);
        if (src) src.removeEventListener('load', onSrcLoad);
        cv.removeEventListener('pointerdown', onDown);
        cv.removeEventListener('pointermove', onMove);
        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) { cv.removeEventListener(ev, onEnd); });
        strokes = []; active = null; pending = null; demoStroke = null;
      }
    };
  };
})();
