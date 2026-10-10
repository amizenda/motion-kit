/*!
 * motion-kit · effects/media.js
 * clip-reveal · parallax · settle · window-grow · grow-inline · zoom-through · velocity-skew · lightbox
 * frame-scrub · loop-video
 * Load after motion-core.js. In a bundler: import registerMedia from './effects/media'; registerMedia(MK).
 */
(function (root, register) {
  if (typeof module === 'object' && module.exports) module.exports = register;
  else if (root && root.MK) register(root.MK);
  else if (typeof console !== 'undefined') console.warn('[motion-kit] Load motion-core.js before effects/media.js');
})(typeof window !== 'undefined' ? window : this, function (MK) {
  'use strict';
  var SVG = 'http://www.w3.org/2000/svg';
  function flag(el, cls, o) { el.classList.add(cls); o.cleanup(function () { el.classList.remove(cls); }); }

  function svgEl(tag, attrs) {
    var n = document.createElementNS(SVG, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }

  /* M1 · Clip reveal (nova gallery & residences, Oval range, Dewpoint ritual)
     The frame wipes open from an edge, the centre or a circle; the image inside settles from a zoom. */
  var EDGES = {
    bottom: 'inset(100% 0% 0% 0%)', top: 'inset(0% 0% 100% 0%)',
    left: 'inset(0% 100% 0% 0%)', right: 'inset(0% 0% 0% 100%)',
    center: 'inset(50% 50% 50% 50%)'
  };
  MK.effect('clip-reveal', function (el, o) {
    var gs = o.gsap;
    var from = o.opt('from', 'bottom');
    var radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
    var round = radius ? ' round ' + radius + 'px' : '';
    var hidden, shown;
    if (from === 'circle') {
      var at = o.opt('at', '50% 50%');
      hidden = 'circle(0% at ' + at + ')';
      shown = 'circle(' + o.opt('radius', 75) + '% at ' + at + ')';
    } else {
      hidden = (EDGES[from] || EDGES.bottom).replace(')', round + ')');
      shown = 'inset(0% 0% 0% 0%' + round + ')';
    }
    var zoom = o.opt('zoom', 1.15);
    var inner = el.querySelector('[data-mk-inner]') || el.querySelector('img, video, picture, canvas');
    if (inner && inner.matches('[data-mk~="parallax"]')) inner = null;      // parallax owns that transform
    o.own(el);
    if (inner) o.own(inner);
    var scrub = o.opt('scrub', false);
    if (scrub) {
      var tl = gs.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: MK.withContainer(el, { trigger: el, start: o.opt('start', 'top bottom'), end: o.opt('end', 'center center'), scrub: scrub })
      });
      tl.fromTo(el, { clipPath: hidden }, { clipPath: shown }, 0);
      if (inner && zoom !== 1) tl.fromTo(inner, { scale: zoom }, { scale: 1 }, 0);
      return;
    }
    var dur = o.dur(o.opt('duration', 'l'));
    o.reveal(el, { clipPath: hidden }, { clipPath: shown, duration: dur, ease: o.ease(o.opt('ease', 'inOut')) });
    if (inner && zoom !== 1) o.reveal(inner, { scale: zoom }, { scale: 1, duration: dur * 1.35, ease: o.ease('out') }, { trigger: el });
  });

  /* M2 · Inner parallax (nova data-inner, Solenne data-par, Oval) — the image drifts inside a still frame.
     Overscan is automatic (the image is scaled just enough to never show an edge). */
  MK.effect('parallax', function (el, o) {
    var sel = o.opt('frame', null);
    var frame = sel ? document.querySelector(sel) : el.parentElement;
    if (!frame) return;
    var amt = MK.clamp(o.opt('amount', 0.1), 0, 0.4);
    var dir = o.opt('direction', 1) < 0 ? -1 : 1;
    o.own([el, frame]);
    if (getComputedStyle(frame).overflow === 'visible') frame.style.overflow = 'hidden';
    var h = function () { return el.offsetHeight; };
    o.gsap.fromTo(el, { y: function () { return -dir * amt * h(); }, scale: 1 + 2 * amt * 1.02 }, {
      y: function () { return dir * amt * h(); }, ease: 'none',
      scrollTrigger: MK.withContainer(frame, {
        trigger: frame,
        start: o.opt('start', 'top bottom'),
        end: o.opt('end', 'bottom top'),
        scrub: o.opt('scrub', true),
        invalidateOnRefresh: true
      })
    });
  });

  /* M3 · Settle (Solenne hero, Dewpoint product) — the element grows/settles into place (scale ± fade) */
  MK.effect('settle', function (el, o) {
    o.own(el);
    o.reveal(el, { scale: o.opt('from', 0.75), opacity: o.opt('fade', false) ? 0 : 1, transformOrigin: o.opt('origin', '50% 0%') }, {
      scale: 1, opacity: 1,
      duration: o.dur(o.opt('duration', 'l')),
      ease: o.ease(o.opt('ease', 'inOut'))
    });
  });

  /* M4 · Window grow (Oval CTA) — a small oval window into a photo grows into the full frame while pinned */
  MK.effect('window-grow', function (el, o) {
    var gs = o.gsap;
    var win = el.querySelector('[data-mk-window]');
    if (!win) return;
    var media = win.querySelector('img, video, [data-mk-inner]');
    var after = o.qa('[data-mk-after]');
    var start = o.is.mobile ? { rx: o.opt('mobileRx', 28), ry: o.opt('mobileRy', 34) } : { rx: o.opt('rx', 18), ry: o.opt('ry', 30) };
    var shape = { rx: start.rx, ry: start.ry };
    o.own([win].concat(media ? [media] : [], after));
    var ring = null, ringEl = null;
    if (o.opt('ring', true) !== false) {
      ring = svgEl('svg', { 'class': 'mk-wg-ring', viewBox: '0 0 100 100', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
      ringEl = svgEl('ellipse', {
        cx: 50, cy: 50, rx: shape.rx, ry: shape.ry, fill: 'none',
        stroke: o.opt('ringColor', 'currentColor'), 'stroke-width': o.opt('ringWidth', 14), 'vector-effect': 'non-scaling-stroke'
      });
      ring.appendChild(ringEl);
      win.parentNode.insertBefore(ring, win.nextSibling);
      o.cleanup(function () { if (ring.parentNode) ring.parentNode.removeChild(ring); });
    }
    function paint() {
      var c = 'ellipse(' + shape.rx.toFixed(3) + '% ' + shape.ry.toFixed(3) + '% at 50% 50%)';
      win.style.clipPath = c;
      win.style.webkitClipPath = c;
      if (ringEl) { ringEl.setAttribute('rx', shape.rx); ringEl.setAttribute('ry', shape.ry); }
    }
    paint();
    if (media) gs.set(media, { scale: o.opt('zoom', 1.3) });
    if (after.length) gs.set(after, { opacity: 0, y: 16 });
    var tl = gs.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: el, start: 'top top', end: '+=' + o.opt('length', 110) + '%', pin: true, scrub: true, anticipatePin: 1, invalidateOnRefresh: true }
    });
    tl.to(shape, { rx: o.opt('endRx', 75), ry: o.opt('endRy', 80), duration: 5, ease: 'power1.inOut', onUpdate: paint }, 0);
    if (media) tl.to(media, { scale: 1, duration: 5, ease: 'power1.out' }, 0);
    if (ring) tl.to(ring, { opacity: 0, duration: 1.3 }, 1.8);
    if (after.length) tl.to(after, { opacity: 1, y: 0, duration: 1, stagger: 0.15 }, 4.4);
    tl.to({}, { duration: 0.8 });
    o.on(el, 'focusin', function () { if (after.length) gs.set(after, { opacity: 1, y: 0 }); });
  });

  /* M5 · Grow inline (Solenne "Four [image] houses") — a thumbnail between two words grows to cover the
     viewport while the words ride its edges. Pinned for one viewport of scroll. */
  MK.effect('grow-inline', function (el, o) {
    var gs = o.gsap;
    var media = el.querySelector('[data-mk-media]');
    if (!media) return;
    var L = el.querySelector('[data-mk-left]'), R = el.querySelector('[data-mk-right]');
    o.own([el, media].concat(L ? [L] : [], R ? [R] : []));
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.classList.add('mk-gi-on');
    o.cleanup(function () { el.classList.remove('mk-gi-on'); });
    var m = { W: 1, H: 1, MW: 1, MH: 1, start: 1, cx: 0, cy: 0 };
    var aspect = o.opt('aspect', 0.5625);                  // media height / width (16:9); it always ends covering the viewport
    function measure() {
      m.W = el.clientWidth;
      m.H = window.innerHeight;
      m.MW = Math.max(m.W, m.H / aspect) * 1.01;
      m.MH = m.MW * aspect;
      m.start = m.W * (o.is.mobile ? o.opt('mobileSize', 0.2) : o.opt('size', 0.05));
      var gap = m.W * 0.012;
      if (L) L.style.marginRight = (m.start / 2 + gap) + 'px';
      if (R) R.style.marginLeft = (m.start / 2 + gap) + 'px';
      media.style.width = m.MW + 'px';
      media.style.height = m.MH + 'px';
      media.style.left = ((m.W - m.MW) / 2) + 'px';
      media.style.top = ((m.H - m.MH) / 2) + 'px';
      var off = function (n) { var x = 0, y = 0; while (n && n !== el) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; } return { x: x, y: y }; };
      if (L && R) {
        var lp = off(L), rp = off(R);
        m.cx = (lp.x + L.offsetWidth + rp.x) / 2;
        m.cy = lp.y + L.offsetHeight / 2;
      } else { m.cx = m.W / 2; m.cy = el.clientHeight / 2; }
    }
    measure();
    var onInit = function () { measure(); };
    o.ST.addEventListener('refreshInit', onInit);
    o.cleanup(function () { o.ST.removeEventListener('refreshInit', onInit); });
    var tl = gs.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: el, start: 'top top', end: function () { return '+=' + window.innerHeight * o.opt('length', 1); }, pin: true, scrub: true, anticipatePin: 1, invalidateOnRefresh: true }
    });
    tl.fromTo(media, { x: function () { return m.cx - m.W / 2; }, y: function () { return m.cy - m.H / 2; }, scale: function () { return m.start / m.MW; } },
      { x: 0, y: 0, scale: 1, duration: 1 }, 0);
    // the words ride the media's edges: from the thumbnail's edges to the full-size edges
    if (L) tl.fromTo(L, { x: 0 }, { x: function () { return (m.W - m.MW) / 2 - (m.cx - m.start / 2); }, duration: 1 }, 0);
    if (R) tl.fromTo(R, { x: 0 }, { x: function () { return (m.W + m.MW) / 2 - (m.cx + m.start / 2); }, duration: 1 }, 0);
    tl.to({}, { duration: o.opt('hold', 0.2) });
  });

  /* M6 · Zoom through (Oval "dive through the zero") — a colour field with a shaped hole zooms
     exponentially until the hole swallows the screen and you are inside the photo. */
  MK.effect('zoom-through', function (el, o) {
    var gs = o.gsap;
    var scene = el.querySelector('[data-mk-scene]');
    var media = scene ? scene.querySelector('img, video') : null;
    var marks = el.querySelector('[data-mk-marks]');
    var after = o.qa('[data-mk-after]');
    var shape = o.opt('shape', 'zero');
    o.own([media, marks].filter(Boolean).concat(after));
    if (getComputedStyle(el).position === 'static') { o.own(el); el.style.position = 'relative'; }
    var layer = document.createElement('div');
    layer.className = 'mk-zt-layer';
    layer.setAttribute('aria-hidden', 'true');
    var svg = svgEl('svg', { 'class': 'mk-zt-svg', preserveAspectRatio: 'none' });
    var field = svgEl('path', { fill: o.opt('color', '#E4F76B'), 'fill-rule': 'evenodd' });
    var ring = shape === 'zero' ? svgEl('path', { fill: o.opt('ringColor', '#245C3E'), 'fill-rule': 'evenodd' }) : null;
    svg.appendChild(field);
    if (ring) svg.appendChild(ring);
    layer.appendChild(svg);
    el.insertBefore(layer, scene ? scene.nextSibling : el.firstChild);
    if (marks && marks.parentNode !== layer) layer.appendChild(marks);
    o.cleanup(function () {
      if (marks && marks.parentNode === layer) el.insertBefore(marks, layer);
      if (layer.parentNode) layer.parentNode.removeChild(layer);
    });

    var g = {}, state = { z: 0 };
    function measure() {
      var W = el.clientWidth, H = el.clientHeight;
      g.W = W; g.H = H; g.cx = W / 2; g.cy = H / 2;
      var ory = Math.min(H * 0.43, (W * 0.44) / 0.74);
      if (shape === 'circle') { var r = Math.min(W, H) * 0.3; g.orx = g.ory = g.irx = g.iry = r; }
      else if (shape === 'ellipse') { g.ory = g.iry = ory; g.orx = g.irx = ory * 0.74; }
      else { g.ory = ory; g.orx = ory * 0.74; g.irx = g.orx * 0.44; g.iry = ory * 0.7; }
      g.ok = W > 0 && H > 0;                               // a hidden or zero-size viewport has nothing to draw
      g.sEnd = g.ok ? Math.sqrt(Math.pow(g.cx / g.irx, 2) + Math.pow(g.cy / g.iry, 2)) * 1.15 : 1;
      if (g.ok) svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    }
    function ell(cx, cy, rx, ry) {
      return 'M' + (cx - rx) + ' ' + cy + 'a' + rx + ' ' + ry + ' 0 1 0 ' + (2 * rx) + ' 0a' + rx + ' ' + ry + ' 0 1 0 ' + (-2 * rx) + ' 0Z';
    }
    function draw() {
      if (!g.ok) return;
      var s = Math.pow(g.sEnd, state.z), pad = Math.max(g.W, g.H) * s;
      var hole = ring ? [g.orx, g.ory] : [g.irx, g.iry];
      field.setAttribute('d', 'M' + (g.cx - pad) + ' ' + (g.cy - pad) + 'H' + (g.cx + pad) + 'V' + (g.cy + pad) + 'H' + (g.cx - pad) + 'Z' + ell(g.cx, g.cy, hole[0] * s, hole[1] * s));
      if (ring) ring.setAttribute('d', ell(g.cx, g.cy, g.orx * s + 1, g.ory * s + 1) + ell(g.cx, g.cy, g.irx * s, g.iry * s));
      if (marks) gs.set(marks, { scale: s, opacity: Math.max(0, 1 - state.z * 5) });
    }
    measure();
    if (media) gs.set(media, { scale: 1.4 });
    if (after.length) gs.set(after, { opacity: 0, y: 40 });
    var onInit = function () { measure(); draw(); };
    o.ST.addEventListener('refreshInit', onInit);
    o.cleanup(function () { o.ST.removeEventListener('refreshInit', onInit); });
    var tl = gs.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: el, start: 'top top', end: '+=' + o.opt('length', 340) + '%', pin: true, scrub: true, anticipatePin: 1, invalidateOnRefresh: true }
    });
    tl.to(state, { z: 1, duration: 6, onUpdate: draw }, 0);
    if (media) tl.to(media, { scale: 1.15, duration: 6 }, 0).to(media, { scale: 1, duration: 3 }, 6);
    tl.set(layer, { autoAlpha: 0 }, 6);
    if (after.length) tl.to(after, { opacity: 1, y: 0, duration: 1.2, stagger: 0.28 }, 6.4);
    tl.to({}, { duration: 1.2 });
    draw();
    o.on(el, 'focusin', function () { if (after.length) gs.set(after, { opacity: 1, y: 0 }); });
  });

  /* M7 · Velocity skew (nova) — images lean with scroll speed and straighten when the page rests */
  MK.effect('velocity-skew', function (el, o) {
    var set = o.gsap.quickSetter(el, 'skewY', 'deg');
    var max = o.opt('max', 1.1), k = o.opt('factor', 260), cur = 0;
    o.own(el);
    o.loop(function (dt) {
      var target = MK.clamp(MK.velocity() / k, -max, max);
      var next = MK.damp(cur, target, 7, dt);
      if (target === 0 && Math.abs(next) < 0.002) next = 0;
      if (next !== cur) { cur = next; set(cur); }
    }, { el: el });
  });

  /* M8 · Lightbox (nova viewer) — the picture expands from where it sits to a centred view; Esc/backdrop closes */
  var LB = null;
  function lightboxRoot() {
    if (LB) return LB;
    var root = document.createElement('div');
    root.className = 'mk-lb';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Image viewer');
    root.setAttribute('data-lenis-prevent', '');
    root.hidden = true;
    root.innerHTML = '<div class="mk-lb-bg"></div><div class="mk-lb-fig"><img class="mk-lb-img" alt=""></div><p class="mk-lb-cap"></p><button type="button" class="mk-lb-close" aria-label="Close">&times;</button>';
    document.body.appendChild(root);
    LB = { root: root, bg: root.querySelector('.mk-lb-bg'), fig: root.querySelector('.mk-lb-fig'), img: root.querySelector('.mk-lb-img'), cap: root.querySelector('.mk-lb-cap'), close: root.querySelector('.mk-lb-close') };
    return LB;
  }
  function setupLightbox(el, o, instant) {
    var gs = o.gsap, t = o.t;
    var busy = false, isOpen = false, opener = null, lb = null;
    var thumb = el.matches('img') ? el : el.querySelector('img');
    var frame = function () { return el.querySelector('[data-mk-frame]') || el; };
    var src = function () { return el.getAttribute('data-mk-src') || (el.tagName === 'A' ? el.getAttribute('href') : '') || (thumb ? thumb.currentSrc || thumb.src : ''); };
    var dur = function (k) { return instant ? 0 : t.dur[k]; };
    function fit() {
      var nw = (thumb && thumb.naturalWidth) || frame().offsetWidth || 4, nh = (thumb && thumb.naturalHeight) || frame().offsetHeight || 3;
      var pad = Math.min(window.innerWidth, window.innerHeight) * 0.06;
      var r = Math.min((window.innerWidth - pad * 2) / nw, (window.innerHeight - pad * 2) / nh);
      return { left: (window.innerWidth - nw * r) / 2, top: (window.innerHeight - nh * r) / 2, width: nw * r, height: nh * r };
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); hide(); }
      else if (e.key === 'Tab') { e.preventDefault(); lb.close.focus(); }
    }
    function show(e) {
      if (e) e.preventDefault();
      if (busy || isOpen) return;
      busy = true; isOpen = true;
      opener = document.activeElement;
      lb = lightboxRoot();
      var r = frame().getBoundingClientRect();
      lb.img.src = src();
      lb.img.alt = thumb ? thumb.alt || '' : '';
      lb.cap.textContent = el.getAttribute('data-mk-caption') || '';
      lb.root.hidden = false;
      MK.lock();
      gs.set(lb.fig, { left: r.left, top: r.top, width: r.width, height: r.height });
      gs.set(lb.bg, { opacity: 0 });
      gs.set([lb.cap, lb.close], { opacity: 0 });
      var f = fit();
      gs.timeline({ onComplete: function () { busy = false; lb.close.focus(); } })
        .to(lb.bg, { opacity: 1, duration: dur('m') * 0.7 }, 0)
        .to(lb.fig, { left: f.left, top: f.top, width: f.width, height: f.height, duration: dur('l'), ease: o.ease('inOut') }, 0)
        .to([lb.cap, lb.close], { opacity: 1, duration: dur('s'), stagger: instant ? 0 : 0.05 }, dur('l') * 0.5);
      lb.close.addEventListener('click', hide);
      lb.bg.addEventListener('click', hide);
      document.addEventListener('keydown', onKey);
    }
    function hide() {
      if (busy || !isOpen || !lb) return;
      busy = true;
      lb.close.removeEventListener('click', hide);
      lb.bg.removeEventListener('click', hide);
      document.removeEventListener('keydown', onKey);
      var r = frame().getBoundingClientRect();
      gs.timeline({
        onComplete: function () {
          lb.root.hidden = true;
          MK.unlock();
          busy = false; isOpen = false;
          if (opener && opener.focus) opener.focus({ preventScroll: true });
        }
      })
        .to([lb.cap, lb.close], { opacity: 0, duration: dur('xs') }, 0)
        .to(lb.fig, { left: r.left, top: r.top, width: r.width, height: r.height, duration: dur('l') * 0.9, ease: o.ease('inOut') }, instant ? 0 : 0.05)
        .to(lb.bg, { opacity: 0, duration: dur('m') * 0.6 }, instant ? 0 : dur('l') * 0.35);
    }
    o.on(el, 'click', show);
    if (!el.matches('a[href], button')) {
      var hadTab = el.hasAttribute('tabindex'), hadRole = el.hasAttribute('role');
      if (!hadTab) el.tabIndex = 0;
      if (!hadRole) el.setAttribute('role', 'button');
      o.on(el, 'keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') show(e); });
      o.cleanup(function () { if (!hadTab) el.removeAttribute('tabindex'); if (!hadRole) el.removeAttribute('role'); });
    }
    o.cleanup(function () { if (isOpen) { busy = false; hide(); } });
  }
  MK.effect('lightbox', function (el, o) { setupLightbox(el, o, false); }, { reduced: function (el, o) { setupLightbox(el, o, true); } });

  /* M9 · Frame scrub (Apple-style sequences; AI start/end-frame video chains) — the section pins and scroll
     draws an image sequence on a canvas, frame-exact in both directions (or seeks a video with `video`).
     Frames load coarse-to-fine, so scrubbing works before the set is complete; the nearest loaded frame
     stands in meanwhile. Children [data-mk-band="0.1 0.35"] fade in and out over that progress range (0..1).
     Without motion: the [data-mk-poster] image and the bands show as a normal static section. */
  function seqUrls(spec, count, first) {
    // "seq/f_####.webp" + count → seq/f_0001.webp …; a JSON array or a comma list is used as given
    if (!spec) return [];
    var s = String(spec).trim();
    if (s.charAt(0) === '[') { try { return JSON.parse(s); } catch (e) { return []; } }
    if (s.indexOf(',') > -1) return s.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    var m = /#+/.exec(s);
    if (!m || !count) return [s];
    var out = [];
    for (var i = 0; i < count; i++) {
      var n = String(i + first);
      while (n.length < m[0].length) n = '0' + n;
      out.push(s.slice(0, m.index) + n + s.slice(m.index + m[0].length));
    }
    return out;
  }
  function coarseToFine(n) {
    var seen = new Uint8Array(n), order = [];
    function add(i) { if (i >= 0 && i < n && !seen[i]) { seen[i] = 1; order.push(i); } }
    add(0); add(n - 1);
    for (var step = 32; step >= 1; step = step >> 1) for (var i = 0; i < n; i += step) add(i);
    return order;
  }
  MK.effect('frame-scrub', function (el, o) {
    var gs = o.gsap, phone = !o.is.desktop;
    var pick = function (k, d) { var v = phone ? o.opt(k + 'Mobile', null) : null; return v == null ? o.opt(k, d) : v; };
    var urls = seqUrls(pick('frames', null), pick('count', 0), o.opt('first', 1));
    var vsrc = pick('video', null);
    if (!urls.length && !vsrc) return;
    flag(el, 'mk-fs-on', o);
    var stage = el.querySelector('[data-mk-stage]') || el;
    var poster = el.querySelector('[data-mk-poster]');
    var bands = o.qa('[data-mk-band]');
    o.own(bands);
    var surface, made = false, ctx2 = null, video = null;
    if (urls.length) {
      surface = stage.querySelector('canvas[data-mk-canvas]');
      if (!surface) { surface = document.createElement('canvas'); made = true; }
      surface.classList.add('mk-fs-canvas');
      ctx2 = surface.getContext('2d');
    } else {
      surface = video = document.createElement('video');
      made = true;
      video.className = 'mk-fs-video';
      video.muted = true; video.playsInline = true; video.preload = 'auto';
      video.setAttribute('muted', ''); video.setAttribute('playsinline', '');
    }
    surface.setAttribute('aria-hidden', 'true');
    if (made) stage.insertBefore(surface, poster && poster.parentNode === stage ? poster.nextSibling : stage.firstChild);
    o.cleanup(function () {
      if (video) { video.removeAttribute('src'); video.load(); }
      if (made && surface.parentNode) surface.parentNode.removeChild(surface);
      el.classList.remove('mk-fs-ready');
    });
    var ready = function () { if (!el.classList.contains('mk-fs-ready')) el.classList.add('mk-fs-ready'); };
    var state = { p: 0 }, fit = o.opt('fit', 'cover');

    // ── image sequence on a canvas
    var N = urls.length, imgs = new Array(N), ok = new Uint8Array(N), drawn = -1, g = { W: 0, H: 0, dpr: 1 };
    var queue = N ? coarseToFine(N) : [], qi = 0, active = 0, started = false, maxJobs = o.opt('concurrency', 6);
    function pump() {
      while (o.alive() && active < maxJobs && qi < queue.length) {
        (function (i) {
          var im = new Image();
          im.decoding = 'async';
          active++;
          var done = function (good) {
            active--;
            if (!o.alive()) return;
            if (good) { ok[i] = 1; if (drawn < 0 || Math.abs(i - target()) < Math.abs(drawn - target())) draw(true); }
            pump();
          };
          // ready on load; decode() only warms the decoder (it can stall in a background tab, so never wait on it)
          im.onload = function () { if (im.decode) im.decode().catch(function () {}); done(true); };
          im.onerror = function () { done(false); };
          im.src = urls[i];
          imgs[i] = im;
        })(queue[qi++]);
      }
    }
    function startLoading() { if (started) return; started = true; pump(); }
    function target() { return Math.round(state.p * (N - 1)); }
    function nearestLoaded(t) {
      if (ok[t]) return t;
      for (var d = 1; d < N; d++) {
        if (t - d >= 0 && ok[t - d]) return t - d;
        if (t + d < N && ok[t + d]) return t + d;
      }
      return -1;
    }
    function size() {
      var W = stage.clientWidth, H = stage.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, o.opt('dpr', phone ? 1.5 : 2));
      if (W === g.W && H === g.H && dpr === g.dpr) return false;
      g.W = W; g.H = H; g.dpr = dpr;
      surface.width = Math.max(1, Math.round(W * dpr));
      surface.height = Math.max(1, Math.round(H * dpr));
      return true;
    }
    function draw(force) {
      if (!ctx2) return;
      var i = nearestLoaded(target());
      if (i < 0 || (i === drawn && !force)) return;
      var im = imgs[i], cw = surface.width, ch = surface.height, iw = im.naturalWidth, ih = im.naturalHeight;
      if (!iw || !ih || !cw || !ch) return;
      var s = fit === 'contain' ? Math.min(cw / iw, ch / ih) : Math.max(cw / iw, ch / ih);
      var dw = iw * s, dh = ih * s;
      ctx2.clearRect(0, 0, cw, ch);
      ctx2.drawImage(im, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
      drawn = i;
      ready();
    }

    // ── video: fetched as a Blob (always seekable), one seek in flight at a time, primed for iOS
    var seeking = false, pending = null;
    function seek(t) {
      if (!video || !video.duration) return;
      if (seeking) { pending = t; return; }
      seeking = true;
      video.currentTime = t;
    }
    if (video) {
      o.on(video, 'seeked', function () {
        seeking = false;
        ready();
        if (pending !== null) { var t = pending; pending = null; seek(t); }
      });
      o.on(video, 'error', function () { seeking = false; pending = null; });
      o.on(video, 'loadedmetadata', function () { seek(state.p * video.duration); });
      var primed = false;
      o.on(document, 'touchstart', function () {
        if (primed) return;
        primed = true;
        var pr = video.play();
        if (pr && pr.then) pr.then(function () { video.pause(); seek(state.p * video.duration); }, function () {});
      }, { passive: true });
    }
    var blobUrl = null;
    function loadVideo() {
      if (started) return;
      started = true;
      fetch(vsrc).then(function (r) { return r.ok ? r.blob() : Promise.reject(new Error(r.status)); }).then(function (b) {
        if (!o.alive()) return;
        blobUrl = URL.createObjectURL(b);
        video.src = blobUrl;
      }, function () { started = false; });
    }
    o.cleanup(function () { if (blobUrl) URL.revokeObjectURL(blobUrl); });

    function render() {
      if (ctx2) draw(false);
      else if (video && video.duration) seek(Math.min(state.p, 0.999) * video.duration);
    }
    var load = ctx2 ? startLoading : loadVideo;
    if (o.opt('preload', 'near') === 'eager') load();
    else o.trigger({ trigger: el, start: function () { return 'top bottom+=' + window.innerHeight; }, onEnter: load, onEnterBack: load });
    var onInit = function () { if (ctx2 && size()) draw(true); };
    o.ST.addEventListener('refreshInit', onInit);
    o.cleanup(function () { o.ST.removeEventListener('refreshInit', onInit); });
    size();

    var tl = gs.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: el, start: 'top top', end: '+=' + o.opt('length', 300) + '%', pin: true, scrub: o.opt('scrub', 0.5), anticipatePin: 1, invalidateOnRefresh: true }
    });
    tl.to(state, { p: 1, duration: 1, onUpdate: render }, 0);
    // caption bands: a long readable plateau, short eased ramps; the first starts shown, the last stays
    var B = bands.length;
    bands.forEach(function (b, k) {
      var r = String(b.getAttribute('data-mk-band') || '').split(/[\s,]+/).map(parseFloat);
      var a = r[0], z = r[1];
      if (isNaN(a)) a = k / B;
      if (isNaN(z)) z = (k + 1) / B;
      var ramp = Math.min(0.05, (z - a) / 4);
      if (a > 0) tl.fromTo(b, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: ramp, ease: 'power2.out' }, a);
      if (z < 1) tl.to(b, { autoAlpha: 0, y: -16, duration: ramp, ease: 'power2.in' }, z - ramp);
      o.on(b, 'focusin', function () { var st = tl.scrollTrigger; MK.scrollTo(st.start + (st.end - st.start) * (a + ramp), { duration: 0.6 }); });
    });
    tl.set({}, {}, 1);
  });

  /* M10 · Loop video (idle motion: a character breathing, steam, mist, a swaying field) — a muted inline
     loop that loads lazily, plays only while it is on screen and the tab is visible, and recovers when the
     browser refuses autoplay (iOS Low Power Mode) on the visitor's first touch or click. Works inside a
     transformed parent (camera-path) because visibility is measured from the real on-screen box.
     Reduced motion: never plays, so only the poster shows. Put the sources in data-src for lazy loading. */
  function lazySources(v) {
    var changed = false;
    if (v.getAttribute('data-src')) { v.src = v.getAttribute('data-src'); v.removeAttribute('data-src'); changed = true; }
    MK.toArray(v.querySelectorAll('source[data-src]')).forEach(function (s) { s.src = s.getAttribute('data-src'); s.removeAttribute('data-src'); changed = true; });
    if (changed) v.load();
  }
  MK.effect('loop-video', function (el, o) {
    var v = el.tagName === 'VIDEO' ? el : el.querySelector('video');
    if (!v) return;
    v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true;
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('loop', '');
    v.removeAttribute('autoplay');
    var rate = o.opt('rate', 1);
    var applyRate = function () { if (rate !== 1) { v.defaultPlaybackRate = rate; v.playbackRate = rate; } };   // load() resets it
    applyRate();
    o.on(v, 'loadedmetadata', applyRate);
    var loaded = false, blocked = false, acc = 1, want = false;
    function play() {
      if (!v.paused) return;
      var pr = v.play();
      if (pr && pr.catch) pr.catch(function () { blocked = true; });
    }
    function check() {
      var r = el.getBoundingClientRect(), vh = window.innerHeight, vw = window.innerWidth;
      var visibleBox = r.width > 0 && r.height > 0;
      if (!loaded && visibleBox && r.bottom > -vh && r.top < vh * 2 && r.right > -vw * 0.5 && r.left < vw * 1.5) { loaded = true; lazySources(v); }
      want = loaded && visibleBox && !document.hidden && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
      if (want) play(); else if (!v.paused) v.pause();
    }
    o.loop(function (dt) { acc += dt; if (acc >= 0.2) { acc = 0; check(); } });   // 5 checks per second
    o.on(document, 'visibilitychange', check);
    var retry = function () { if (blocked && want) { blocked = false; play(); } };
    o.on(document, 'touchstart', retry, { passive: true });
    o.on(document, 'pointerdown', retry);
    o.on(v, 'playing', function () { el.classList.add('is-playing'); });
    o.cleanup(function () { v.pause(); el.classList.remove('is-playing'); });
    check();
  }, {
    reduced: function (el) {
      var v = el.tagName === 'VIDEO' ? el : el.querySelector('video');
      if (v) { v.removeAttribute('autoplay'); v.pause(); }
    }
  });
});
