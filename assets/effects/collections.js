/*!
 * motion-kit · effects/collections.js
 * stagger-up · card-rise · hover-preview · flex-accordion · orbit · drag-carousel · marquee · pendulum · rating
 * Load after motion-core.js. In a bundler: import registerCollections from './effects/collections'; registerCollections(MK).
 */
(function (root, register) {
  if (typeof module === 'object' && module.exports) module.exports = register;
  else if (root && root.MK) register(root.MK);
  else if (typeof console !== 'undefined') console.warn('[motion-kit] Load motion-core.js before effects/collections.js');
})(typeof window !== 'undefined' ? window : this, function (MK) {
  'use strict';

  function itemsOf(el, o) {
    var sel = o.opt('items', null);
    return sel ? o.qa(sel) : MK.toArray(el.children);
  }
  function flag(el, cls, o) { el.classList.add(cls); o.cleanup(function () { el.classList.remove(cls); }); }

  /* C1 · Stagger up (all six sites) — children rise and fade in; items that arrive together animate as a
     group (ScrollTrigger.batch), so grids never animate off-screen. Options: y, x, tilt, scale, stagger. */
  MK.effect('stagger-up', function (el, o) {
    var gs = o.gsap, t = o.t;
    var items = itemsOf(el, o);
    if (!items.length) return;
    var y = o.opt('y', t.rise), x = o.opt('x', 0), tilt = o.opt('tilt', 0), sc = o.opt('scale', 1);
    var from = { opacity: 0, y: y, x: x };
    if (sc !== 1) from.scale = sc;
    if (tilt) from.rotation = function () { return gs.utils.random(-tilt, tilt, 0.1); };
    var to = {
      opacity: 1, y: 0, x: 0, scale: 1, rotation: 0,
      duration: o.dur(o.opt('duration', 'm')), ease: o.ease(o.opt('ease', 'out')),
      stagger: o.opt('stagger', t.stagger.items), overwrite: true
    };
    if (o.opt('on', 'scroll') !== 'scroll') { o.reveal(items, from, to); return; }
    o.own(items);
    gs.set(items, from);
    var replay = o.opt('replay', t.replay);
    var at = (o.opt('start', null) || t.start).split(' ');
    var start = 'top-=' + Math.max(0, y) + ' ' + (at[1] || '85%');
    o.ST.batch(items, MK.withContainer(el, { start: start, once: !replay, onEnter: function (batch) { gs.to(batch, to); } }));
    if (replay) o.ST.batch(items, MK.withContainer(el, { start: 'top bottom', onLeaveBack: function (batch) { gs.set(batch, from); } }));
    o.on(el, 'focusin', function (e) {
      var it = items.filter(function (n) { return n.contains(e.target); })[0];
      if (it && +gs.getProperty(it, 'opacity') < 1) gs.set(it, { opacity: 1, y: 0, x: 0, scale: 1, rotation: 0 });
    });
  });

  /* C2 · Card rise (Oval range) — cards swing up from a slight tilt, their [data-mk-media] unmasks from the
     bottom and the photo inside settles from a zoom. */
  MK.effect('card-rise', function (el, o) {
    var gs = o.gsap, t = o.t;
    var items = itemsOf(el, o);
    if (!items.length) return;
    var tilt = o.opt('tilt', -3), dist = o.opt('y', 110), zoom = o.opt('zoom', 1.25);
    var medias = items.map(function (it) { return it.querySelector('[data-mk-media]'); });
    var imgs = medias.map(function (m) { return m ? m.querySelector('img, video') : null; });
    o.own(items.concat(medias.filter(Boolean), imgs.filter(Boolean)));
    gs.set(items, { opacity: 0, y: dist, rotation: tilt, transformOrigin: '0% 100%' });
    medias.forEach(function (m) { if (m) gs.set(m, { clipPath: 'inset(100% 0% 0% 0%)' }); });
    imgs.forEach(function (im) { if (im && zoom !== 1) gs.set(im, { scale: zoom }); });
    var at = (o.opt('start', null) || 'top 88%').split(' ');
    o.ST.batch(items, MK.withContainer(el, {
      start: 'top-=' + dist + ' ' + (at[1] || '88%'), once: true,
      onEnter: function (batch) {
        var tl = gs.timeline();
        tl.to(batch, { opacity: 1, y: 0, rotation: 0, duration: t.dur.l, ease: o.ease('out'), stagger: t.stagger.items }, 0);
        batch.forEach(function (it, k) {
          var i = items.indexOf(it), m = medias[i], im = imgs[i], when = 0.2 + k * t.stagger.items;
          if (m) tl.to(m, { clipPath: 'inset(0% 0% 0% 0%)', duration: t.dur.l * 1.1, ease: o.ease('inOut') }, when);
          if (im && zoom !== 1) tl.to(im, { scale: 1, duration: t.dur.xl, ease: o.ease('out') }, when);
        });
      }
    }));
    o.on(el, 'focusin', function (e) {
      var i = -1;
      items.forEach(function (n, k) { if (n.contains(e.target)) i = k; });
      if (i < 0) return;
      gs.set(items[i], { opacity: 1, y: 0, rotation: 0 });
      if (medias[i]) gs.set(medias[i], { clipPath: 'inset(0% 0% 0% 0%)' });
      if (imgs[i]) gs.set(imgs[i], { scale: 1 });
    });
  });

  /* C3 · Hover preview (Ember menu) — a floating plate with the row's image follows the cursor down a list,
     leans with speed and swaps in a new image per row. Rows: [data-mk-preview="img.jpg"], optionally with
     data-mk-preview-color (shown at once while the image loads) and data-mk-preview-lqip (tiny blurred thumbnail).
     The plate never opens empty: every row has its own layer, shown only once its image has decoded (or over its
     placeholder); a row whose image fails, or takes longer than `wait` seconds, is skipped. Images preload when
     the list comes within a screen of the viewport. Options: swap (pop|wipe|fade) · preload (near|eager|hover) ·
     wait (1). Mouse only. */
  MK.effect('hover-preview', function (el, o) {
    if (!o.is.hover) return;
    var gs = o.gsap;
    var rows = o.qa('[data-mk-preview]');
    if (!rows.length) return;
    var swap = o.opt('swap', 'pop'), wait = o.opt('wait', 1) * 1000, preload = o.opt('preload', 'near');
    var pv = document.createElement('div');
    pv.className = 'mk-preview';
    pv.setAttribute('aria-hidden', 'true');
    var disc = document.createElement('div');
    disc.className = 'mk-preview-disc';
    pv.appendChild(disc);
    var layers = rows.map(function (row) {
      var L = { src: row.getAttribute('data-mk-preview'), state: 'idle', shown: false, z: 0, promise: null,
        el: document.createElement('div'), img: document.createElement('img') };
      var color = row.getAttribute('data-mk-preview-color'), lqip = row.getAttribute('data-mk-preview-lqip');
      L.el.className = 'mk-preview-layer';
      L.ph = !!(color || lqip);
      if (color) L.el.style.backgroundColor = color;
      if (lqip) {
        var blur = document.createElement('i');
        blur.className = 'mk-preview-lqip';
        blur.style.backgroundImage = 'url("' + lqip.replace(/"/g, '%22') + '")';
        L.el.appendChild(blur);
      }
      L.img.alt = '';
      L.img.decoding = 'async';
      L.el.appendChild(L.img);
      L.zoom = MK.toArray(L.el.children);
      disc.appendChild(L.el);
      return L;
    });
    document.body.appendChild(pv);
    o.cleanup(function () { if (pv.parentNode) pv.parentNode.removeChild(pv); });
    gs.set(disc, { scale: 0.5, autoAlpha: 0 });
    layers.forEach(function (L) { gs.set(L.el, { autoAlpha: 0 }); gs.set(L.img, { opacity: 0 }); });

    var st = { x: 0, y: 0, tx: 0, ty: 0 }, rest = 0, open = false, inside = false;
    var cur = null, last = null, seq = 0, zTop = 0, timer = 0;
    function clearTimer() { if (timer) { clearTimeout(timer); timer = 0; } }
    o.cleanup(clearTimer);

    // a row is ready once its image has loaded and decoded, so it paints in the frame it is shown
    function load(L, low) {
      if (L.promise) return L.promise;
      L.state = 'loading';
      if (low) L.img.fetchPriority = 'low';
      L.img.src = L.src;
      L.promise = new Promise(function (res, rej) {
        if (L.img.complete && L.img.naturalWidth) return res();
        L.img.addEventListener('load', res, { once: true });
        L.img.addEventListener('error', rej, { once: true });
      }).then(function () {
        return L.img.decode ? L.img.decode().catch(function () {}) : null;   // decode() can reject for a valid image
      }).then(function () {
        L.state = 'ready';
        if (!o.alive()) return;
        if (L.shown) gs.to(L.img, { opacity: 1, duration: o.dur('s'), ease: o.ease('out') });   // lands on its placeholder
        else gs.set(L.img, { opacity: 1 });
      }, function () {
        L.state = 'failed';
        if (o.alive() && cur === L) close();
      });
      return L.promise;
    }
    function loadAll(low) { layers.forEach(function (L) { load(L, low); }); }
    if (preload === 'eager') loadAll(true);
    else if (preload !== 'hover') {                              // near: once the list is within a screen of the viewport
      o.trigger({
        trigger: el,
        start: function () { return 'top bottom+=' + window.innerHeight; },
        end: function () { return 'bottom top-=' + window.innerHeight; },
        onToggle: function (self) { if (self.isActive) { loadAll(true); self.kill(); } }
      });
    }

    function place(rot) {
      pv.style.transform = 'translate3d(' + st.x.toFixed(1) + 'px,' + st.y.toFixed(1) + 'px,0) rotate(' + rot.toFixed(2) + 'deg)';
    }
    var loop = o.loop(function (dt) {
      var px = st.x;
      st.x = MK.damp(st.x, st.tx, 10, dt);
      st.y = MK.damp(st.y, st.ty, 10, dt);
      place(MK.clamp(((st.x - px) / dt) * 0.01, -14, 14));
      if (!open && Math.abs(st.tx - st.x) < 0.5) { rest += dt; if (rest > 0.6) loop.sleep(); } else rest = 0;
    });
    loop.sleep();

    function openDisc() {
      open = true;
      if (+gs.getProperty(disc, 'opacity') < 0.01) {          // fully closed: start at the pointer, from half size
        st.x = st.tx;
        st.y = st.ty;
        place(0);
        gs.set(disc, { scale: 0.5 });
      }
      gs.to(disc, { scale: 1, autoAlpha: 1, duration: 0.6, ease: o.ease('pop'), overwrite: true });
      rest = 0;
      loop.wake();
    }
    function close() {
      if (!open) return;
      open = false;
      gs.to(disc, { scale: 0.6, autoAlpha: 0, duration: 0.35, ease: o.ease('out'), overwrite: true });
    }
    // the photo settles from a slight zoom, so it reads as coming into focus
    function focus(L) {
      gs.fromTo(L.zoom, { scale: 1.15 }, { scale: 1, duration: o.dur('l'), ease: o.ease('out'), overwrite: 'auto' });
    }
    function hideBelow(L) {
      layers.forEach(function (M) {
        if (M !== L && M.shown && M.z < L.z) { M.shown = false; gs.set(M.el, { autoAlpha: 0 }); }
      });
    }
    function show(L) {
      if (!inside) return;
      var reopen = !open, cut = reopen && +gs.getProperty(disc, 'opacity') < 0.3;   // closed or nearly: no swap
      if (L.shown && L.z === zTop) {                             // already the plate on top
        if (cut) focus(L);
        if (reopen) openDisc();
        return;
      }
      var from = last, done = function () { hideBelow(L); };
      last = L;
      L.shown = true;
      L.z = ++zTop;
      L.el.style.zIndex = zTop;
      gs.killTweensOf(L.el);
      if (cut) {
        gs.set(L.el, { autoAlpha: 1, scale: 1, rotation: 0, clipPath: 'none' });
        done();
      } else if (swap === 'wipe') {                              // opens from the side the cursor came from
        var edge = from && layers.indexOf(L) < layers.indexOf(from) ? '100%' : '0%';
        gs.fromTo(L.el, { autoAlpha: 1, scale: 1, rotation: 0, clipPath: 'circle(0% at 50% ' + edge + ')' },
          { clipPath: 'circle(115% at 50% ' + edge + ')', duration: o.dur('m'), ease: o.ease('out'), onComplete: done });
      } else if (swap === 'fade') {
        gs.fromTo(L.el, { autoAlpha: 0, scale: 1, rotation: 0, clipPath: 'none' },
          { autoAlpha: 1, duration: o.dur('s'), ease: o.ease('out'), onComplete: done });
      } else {                                                   // pop: the new plate spins in over the old one
        gs.set(L.el, { autoAlpha: 1, clipPath: 'none' });
        gs.fromTo(L.el, { scale: 0.7, rotation: -18 }, { scale: 1, rotation: 0, duration: 0.7, ease: o.ease('pop'), onComplete: done });
      }
      focus(L);
      if (reopen) openDisc();
    }
    function request(L) {
      var my = ++seq;
      clearTimer();
      cur = L;
      if (L.state === 'failed') { close(); return; }
      load(L);
      if (L.state === 'ready' || L.ph) { show(L); return; }
      // not decoded yet and nothing to stand in for it: keep the current plate, show this one once it is ready
      timer = setTimeout(function () { timer = 0; if (my === seq) { seq++; close(); } }, wait);   // too slow: skip it
      L.promise.then(function () { if (my === seq && L.state === 'ready' && o.alive()) { clearTimer(); show(L); } });
    }

    o.on(el, 'pointerenter', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      inside = true;
      loadAll(false);                                            // anything the preload has not started yet
    });
    rows.forEach(function (row, i) {
      o.on(row, 'pointerenter', function (e) {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        inside = true;
        st.tx = e.clientX;
        st.ty = e.clientY;
        request(layers[i]);
      });
    });
    o.on(el, 'pointerleave', function () {
      inside = false;
      cur = null;
      seq++;
      clearTimer();
      close();
    });
    o.on(window, 'pointermove', function (e) { st.tx = e.clientX; st.ty = e.clientY; }, { passive: true });
  });

  /* C4 · Flex accordion (Solenne residence types) — the hovered/focused column widens and its photo wipes
     up from the bottom; leaving wipes it out through the top. Touch: columns activate mid-screen. */
  MK.effect('flex-accordion', function (el, o) {
    var gs = o.gsap;
    var cols = o.qa('[data-mk-col]');
    if (!cols.length) cols = MK.toArray(el.children);
    var grow = o.opt('grow', 2.3), d = o.opt('duration', 0.7), ease = o.opt('ease', 'power3.out');
    var medias = cols.map(function (c) { return c.querySelector('[data-mk-media]'); });
    var state = cols.map(function () { return 'hidden'; });
    o.own(cols.concat(medias.filter(Boolean)));
    flag(el, 'mk-fa-on', o);
    medias.forEach(function (m) { if (m) gs.set(m, { clipPath: 'inset(100% 0% 0% 0%)' }); });
    var widen = o.is.hover && o.is.desktop;
    function enter(i) {
      var m = medias[i];
      if (m && state[i] !== 'shown') {
        if (state[i] === 'hidden') gs.fromTo(m, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: d, ease: ease, overwrite: true });
        else gs.to(m, { clipPath: 'inset(0% 0% 0% 0%)', duration: d, ease: ease, overwrite: true });
        state[i] = 'shown';
      }
      cols[i].classList.add('is-open');
      if (widen) cols.forEach(function (c, k) { gs.to(c, { flexGrow: k === i ? grow : 1, duration: d, ease: ease, overwrite: 'auto' }); });
    }
    function leave(i) {
      var m = medias[i];
      if (m && state[i] === 'shown') {
        state[i] = 'exiting';
        gs.to(m, { clipPath: 'inset(0% 0% 100% 0%)', duration: d, ease: ease, overwrite: true, onComplete: function () { if (state[i] === 'exiting') state[i] = 'hidden'; } });
      }
      cols[i].classList.remove('is-open');
      if (widen) gs.to(cols[i], { flexGrow: 1, duration: d, ease: ease, overwrite: 'auto' });
    }
    cols.forEach(function (c, i) {
      if (o.is.hover) {
        o.on(c, 'pointerenter', function () { enter(i); });
        o.on(c, 'pointerleave', function () { leave(i); });
      } else {
        o.trigger({ trigger: c, start: 'top 60%', end: 'bottom 40%', onToggle: function (s) { if (s.isActive) enter(i); else leave(i); } });
      }
      if (!c.hasAttribute('tabindex') && !c.querySelector('a[href], button')) {
        c.tabIndex = 0;
        o.cleanup(function () { c.removeAttribute('tabindex'); });
      }
      o.on(c, 'focusin', function () { enter(i); });
      o.on(c, 'focusout', function (e) { if (!c.contains(e.relatedTarget)) leave(i); });
    });
    o.cleanup(function () { cols.forEach(function (c) { c.classList.remove('is-open'); }); });
  });

  /* C5 · Depth orbit (Dewpoint range) — items sit on an ellipse: the front one sharp and large, the back
     ones small, blurred and darkened. Click an item, use ←/→ or [data-mk-prev]/[data-mk-next] to revolve. */
  MK.effect('orbit', function (el, o) {
    var gs = o.gsap;
    var stage = el.querySelector('[data-mk-stage]') || el;
    var items = MK.toArray(stage.querySelectorAll('[data-mk-item]'));
    var N = items.length;
    if (N < 3) return;
    flag(el, 'mk-orbit-on', o);
    o.own(items);
    var nameEl = el.querySelector('[data-mk-orbit-name]'), nameOrig = nameEl ? nameEl.textContent : '';
    var prev = el.querySelector('[data-mk-prev]'), next = el.querySelector('[data-mk-next]');
    var P = { p: 0 }, tw = null, spin = null, active = -1;
    var STEP = 2 * Math.PI / N;
    var radius = function () { return stage.clientWidth * o.opt('radius', o.is.mobile ? 0.36 : 0.32); };
    var blurMax = o.opt('blur', 17) * (o.is.mobile ? 0.5 : 1);
    function draw() {
      var r = radius(), p = P.p;
      for (var i = 0; i < N; i++) {
        var th = (i - p) * STEP, s = Math.sin(th), f = Math.pow((Math.cos(th) + 1) / 2, 1.3), sc = 0.2 + 0.8 * f, it = items[i];
        it.style.transform = 'translate(-50%,-50%) translate3d(' + (r * s).toFixed(2) + 'px,0,0) scale(' + sc.toFixed(4) + ')';
        it.style.filter = blurMax ? 'blur(' + (blurMax * (1 - f)).toFixed(2) + 'px) brightness(' + (0.3 + 0.7 * f).toFixed(3) + ')' : '';
        it.style.zIndex = String(Math.round(1000 * f) + 1);
      }
      var idx = ((Math.round(p) % N) + N) % N;
      if (idx !== active) {
        active = idx;
        items.forEach(function (it, k) { it.classList.toggle('is-active', k === idx); });
        if (nameEl) nameEl.textContent = items[idx].getAttribute('data-mk-name') || '';
        el.dispatchEvent(new CustomEvent('mk:orbit', { detail: { index: idx } }));
      }
    }
    function go(to) {
      if (tw) tw.kill();
      tw = gs.to(P, { p: to, duration: o.opt('duration', 2.2), ease: o.ease(o.opt('ease', 'inOut')), onUpdate: draw });
    }
    function stopSpin(settle) {
      if (!spin) return;
      spin.kill(); spin = null;
      if (settle) go(Math.round(P.p));
    }
    function goTo(i) {
      stopSpin(false);
      var cur = Math.round(P.p), curIdx = ((cur % N) + N) % N, diff = i - curIdx;
      if (diff > N / 2) diff -= N;
      if (diff < -N / 2) diff += N;
      if (diff) go(cur + diff);
      else go(cur);
    }
    items.forEach(function (it, i) { o.on(it, 'click', function () { goTo(i); }); });
    if (prev) o.on(prev, 'click', function () { goTo((active - 1 + N) % N); });
    if (next) o.on(next, 'click', function () { goTo((active + 1) % N); });
    if (!el.hasAttribute('tabindex')) { el.tabIndex = 0; o.cleanup(function () { el.removeAttribute('tabindex'); }); }
    o.on(el, 'keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo((active + 1) % N); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goTo((active - 1 + N) % N); }
    });
    if (o.opt('spin', false) && o.is.hover) {
      o.on(el, 'pointerenter', function () {
        if (spin) return;
        if (tw) tw.kill();
        spin = gs.to(P, { p: P.p + N * 1000, duration: o.opt('spinStep', 1.6) * N * 1000, ease: 'none', onUpdate: draw });
      });
      o.on(el, 'pointerleave', function () { stopSpin(true); });
    }
    o.on(window, 'resize', draw);
    o.onRefresh(draw);
    draw();
    o.cleanup(function () { if (spin) spin.kill(); if (tw) tw.kill(); if (nameEl) nameEl.textContent = nameOrig; items.forEach(function (it) { it.classList.remove('is-active'); }); });
  });

  /* C6 · Drag carousel (Fizzy Fjord treats) — throw it and it glides, then settles on a card edge;
     rubber-bands at the ends; buttons and keyboard focus move it too. Native scroll-snap when reduced. */
  MK.effect('drag-carousel', function (el, o) {
    var gs = o.gsap;
    var track = el.querySelector('[data-mk-track]');
    if (!track) return;
    var slides = MK.toArray(track.children);
    var prev = el.querySelector('[data-mk-prev]'), next = el.querySelector('[data-mk-next]');
    flag(el, 'mk-dc-on', o);
    o.own(track);
    var x = 0, min = 0, step = 1, down = false, dragging = false, moved = false, startX = 0, startY = 0, startPos = 0, samples = [], tw = null, pid = null;
    var setX = gs.quickSetter(track, 'x', 'px');
    function buttons() { if (prev) prev.disabled = x >= -2; if (next) next.disabled = x <= min + 2; }
    function measure() {
      min = Math.min(0, el.clientWidth - track.scrollWidth);
      step = slides.length > 1 ? slides[1].offsetLeft - slides[0].offsetLeft : (slides[0] ? slides[0].offsetWidth : 1);
      x = MK.clamp(x, min, 0);
      setX(x);
      buttons();
    }
    function goTo(tx, dur) {
      tx = MK.clamp(tx, min, 0);
      var p = { v: x };
      if (tw) tw.kill();
      tw = gs.to(p, { v: tx, duration: dur || 0.8, ease: 'power3.out', onUpdate: function () { x = p.v; setX(x); }, onComplete: buttons });
    }
    o.on(el, 'pointerdown', function (e) {
      if (e.button !== 0) return;
      down = true; dragging = false; moved = false;
      startX = e.clientX; startY = e.clientY; startPos = x; pid = e.pointerId;
      samples = [[performance.now(), e.clientX]];
      if (tw) tw.kill();
    });
    o.on(window, 'pointermove', function (e) {
      if (!down || e.pointerId !== pid) return;
      var dx = e.clientX - startX, dy = e.clientY - startY;
      if (!dragging) {
        if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { down = false; return; }   // vertical intent: let the page scroll
        if (Math.abs(dx) <= 6) return;
        dragging = true; moved = true;
        el.classList.add('is-drag');
      }
      var nx = startPos + dx;
      if (nx > 0) nx *= 0.35;
      if (nx < min) nx = min + (nx - min) * 0.35;
      x = nx; setX(x);
      samples.push([performance.now(), e.clientX]);
      if (samples.length > 6) samples.shift();
    }, { passive: true });
    var end = function (e) {
      if (!down || (e && e.pointerId !== pid)) return;
      down = false;
      el.classList.remove('is-drag');
      if (!dragging) return;
      dragging = false;
      var a = samples[0], b = samples[samples.length - 1];
      var v = b && a && b[0] > a[0] ? (b[1] - a[1]) / (b[0] - a[0]) * 1000 : 0;
      goTo(Math.round((x + v * 0.32) / step) * step, MK.clamp(Math.abs(v) / 2400, 0.55, 1.2));
    };
    o.on(window, 'pointerup', end);
    o.on(window, 'pointercancel', end);
    o.on(el, 'click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    o.on(el, 'dragstart', function (e) { e.preventDefault(); });
    if (prev) o.on(prev, 'click', function () { goTo((Math.round(x / step) + 1) * step); });
    if (next) o.on(next, 'click', function () { goTo((Math.round(x / step) - 1) * step); });
    o.on(track, 'focusin', function (e) {
      var s = slides.filter(function (n) { return n.contains(e.target); })[0];
      if (!s) return;
      var left = s.offsetLeft + x, right = left + s.offsetWidth;
      if (left < 0 || right > el.clientWidth) goTo(-Math.round(s.offsetLeft / step) * step);
    });
    o.on(el, 'scroll', function () { if (el.scrollLeft) el.scrollLeft = 0; });
    o.on(window, 'resize', measure);
    o.onRefresh(measure);
    measure();
  }, {
    reduced: function (el, o) {
      var track = el.querySelector('[data-mk-track]');
      if (!track) return;
      var stepOf = function () { var s = track.children; return s.length > 1 ? s[1].offsetLeft - s[0].offsetLeft : track.clientWidth; };
      var prev = el.querySelector('[data-mk-prev]'), next = el.querySelector('[data-mk-next]');
      if (prev) o.on(prev, 'click', function () { track.scrollBy({ left: -stepOf(), behavior: 'auto' }); });
      if (next) o.on(next, 'click', function () { track.scrollBy({ left: stepOf(), behavior: 'auto' }); });
    }
  });

  /* C7 · Marquee (Oval press, Ember band, Dewpoint reviews) — a seamless loop that pauses on hover/focus,
     off-screen and via a [data-mk-marquee-toggle] button. data-mk-velocity: speeds up and reverses with scroll. */
  MK.effect('marquee', function (el, o) {
    var gs = o.gsap;
    var track = el.querySelector('[data-mk-track]');
    if (!track) return;
    flag(el, 'mk-mq-on', o);
    var group = document.createElement('div');
    group.className = 'mk-mq-group';
    while (track.firstChild) group.appendChild(track.firstChild);
    track.appendChild(group);
    var clones = [], loop = null, gw = 0, cw = 0;
    var speed = o.opt('speed', 60), dir = o.opt('direction', -1) < 0 ? -1 : 1;
    var userPaused = false, hovered = false, visible = true, lastDir = 1;
    function fill() {
      clones.forEach(function (c) { if (c.parentNode) c.parentNode.removeChild(c); });
      clones = [];
      gw = group.offsetWidth || 1;
      cw = el.clientWidth;
      var copies = Math.max(1, Math.ceil(cw / gw));
      for (var i = 0; i < copies; i++) {
        var c = group.cloneNode(true);
        c.setAttribute('aria-hidden', 'true');
        c.setAttribute('inert', '');
        MK.toArray(c.querySelectorAll('a, button, input, select, textarea, [tabindex]')).forEach(function (n) { n.setAttribute('tabindex', '-1'); });
        track.appendChild(c);
        clones.push(c);
      }
    }
    function sync() {
      if (!loop) return;
      var stop = userPaused || hovered || !visible;
      if (stop && !loop.paused()) loop.pause();
      else if (!stop && loop.paused()) loop.resume();
    }
    function build() {
      var prog = loop ? loop.progress() : 0;
      if (loop) loop.kill();
      fill();
      loop = gs.fromTo(track, { x: dir < 0 ? 0 : -gw }, { x: dir < 0 ? -gw : 0, duration: gw / speed, ease: 'none', repeat: -1 });
      loop.totalTime(loop.duration() * 1000 + prog * loop.duration());   // headroom so a negative timeScale can run backwards
      sync();
    }
    build();
    o.onRefresh(function () { if (Math.abs(group.offsetWidth - gw) > 1 || Math.abs(el.clientWidth - cw) > 1) build(); });
    if (o.opt('hoverPause', true) !== false) {
      o.on(el, 'pointerenter', function () { hovered = true; sync(); });
      o.on(el, 'pointerleave', function () { hovered = false; sync(); });
    }
    o.on(el, 'focusin', function () { hovered = true; sync(); });
    o.on(el, 'focusout', function (e) { if (!el.contains(e.relatedTarget)) { hovered = false; sync(); } });
    o.trigger({ trigger: el, start: 'top bottom', end: 'bottom top', onToggle: function (s) { visible = s.isActive; sync(); } });
    var tsel = o.opt('toggle', null);
    var toggle = tsel ? document.querySelector(tsel) : el.querySelector('[data-mk-marquee-toggle]');
    if (toggle) {
      toggle.setAttribute('aria-pressed', 'false');
      o.on(toggle, 'click', function () { userPaused = !userPaused; toggle.setAttribute('aria-pressed', String(userPaused)); sync(); });
    }
    if (o.opt('velocity', false)) {
      var max = o.opt('maxBoost', 6), k = o.opt('factor', 260), ts = 1;
      o.loop(function (dt) {
        var v = MK.velocity();
        if (Math.abs(v) > 5) { lastDir = v < 0 ? -1 : 1; ts = lastDir * Math.min(1 + Math.abs(v) / k, max); }
        else ts = MK.damp(ts, lastDir, 2.5, dt);
        loop.timeScale(ts);
      }, { el: el });
    }
    o.cleanup(function () {
      if (loop) loop.kill();
      clones.forEach(function (c) { if (c.parentNode) c.parentNode.removeChild(c); });
      while (group.firstChild) track.insertBefore(group.firstChild, group);
      if (group.parentNode) group.parentNode.removeChild(group);
      track.style.transform = '';
      if (toggle) toggle.removeAttribute('aria-pressed');
    });
  });

  /* C8 · Pendulum line (Fizzy Fjord reviews) — cards hang from a line and swing as damped pendulums when
     you scroll; with data-mk-drag the line can be thrown sideways and the cards ring out. */
  MK.effect('pendulum', function (el, o) {
    var gs = o.gsap;
    var swings = o.qa('[data-mk-swing]');
    if (!swings.length) return;
    o.own(swings);
    var origin = o.opt('origin', '50% 0%');
    var P = swings.map(function (s, i) {
      gs.set(s, { transformOrigin: origin });
      return { th: 0, om: 0, w0: (Math.PI * 2) / (0.58 + ((i * 37) % 11) / 70), z: 0.15 + (i % 3) * 0.015, set: gs.quickSetter(s, 'rotation', 'deg') };
    });
    var maxA = o.opt('max', 35), kScroll = o.opt('factor', 0.006);
    var drag = !!o.opt('drag', false), track = drag ? (el.querySelector('[data-mk-track]') || el) : null;
    var x = 0, prevX = 0, min = 0, down = false, dragging = false, startX = 0, startPos = 0, samples = [], grab = 0, hingeV = 0, throwTw = null;
    var hist = [], HN = 24;
    for (var h = 0; h < HN; h++) hist.push(0);
    var setX = drag ? gs.quickSetter(track, 'x', 'px') : null;
    if (drag) {
      o.own(track);
      flag(el, 'mk-pend-drag', o);
      var measure = function () { min = Math.min(0, el.clientWidth - track.scrollWidth); x = MK.clamp(x, min, 0); prevX = x; setX(x); };
      measure();
      o.on(window, 'resize', measure);
      o.onRefresh(measure);
      o.on(el, 'pointerdown', function (e) {
        if (e.button !== 0) return;
        down = true; dragging = false; startX = e.clientX; startPos = x; samples = [[performance.now(), e.clientX]];
        var best = 1e9;
        swings.forEach(function (s, i) { var r = s.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - e.clientX); if (d < best) { best = d; grab = i; } });
        if (throwTw) throwTw.kill();
      });
      o.on(window, 'pointermove', function (e) {
        if (!down) return;
        if (!dragging && Math.abs(e.clientX - startX) > 4) { dragging = true; el.classList.add('is-drag'); }
        if (!dragging) return;
        var nx = startPos + (e.clientX - startX);
        if (nx > 0) nx *= 0.2;
        if (nx < min) nx = min + (nx - min) * 0.2;
        x = nx; setX(x);
        samples.push([performance.now(), e.clientX]);
        if (samples.length > 6) samples.shift();
      }, { passive: true });
      var end = function () {
        if (!down) return;
        down = false; el.classList.remove('is-drag');
        if (!dragging) return;
        dragging = false;
        var a = samples[0], b = samples[samples.length - 1];
        var v = b && a && b[0] > a[0] ? (b[1] - a[1]) / (b[0] - a[0]) * 1000 : 0;
        var target = MK.clamp(x + v * 0.3, min, 0), p = { v: x };
        throwTw = gs.to(p, { v: target, duration: MK.clamp(Math.abs(target - x) / 900, 0.35, 1.2), ease: 'power3.out', onUpdate: function () { x = p.v; setX(x); } });
      };
      o.on(window, 'pointerup', end);
      o.on(window, 'pointercancel', end);
    }
    o.loop(function (dt) {
      if (drag) {
        hingeV = MK.damp(hingeV, (x - prevX) / dt, 25, dt);
        prevX = x;
        hist.unshift(hingeV);
        hist.length = HN;
      }
      var scrollDrive = MK.clamp(MK.velocity() * kScroll, -14, 14);
      for (var i = 0; i < P.length; i++) {
        var p = P[i], d = Math.abs(i - grab);
        var hv = drag ? hist[Math.min(HN - 1, d * 3)] : 0;
        var target = MK.clamp(hv * 0.019 * Math.pow(0.72, d) + scrollDrive, -maxA, maxA);
        var acc = -p.w0 * p.w0 * (p.th - target) - 2 * p.z * p.w0 * p.om;
        p.om += acc * dt;
        p.th = MK.clamp(p.th + p.om * dt, -40, 40);
        if (Math.abs(p.th) > 0.01 || Math.abs(p.om) > 0.01) p.set(p.th);
        else if (p.th !== 0) { p.th = 0; p.om = 0; p.set(0); }
      }
    }, { el: el });
  });

  /* C9 · Rating (Oval reviews) — stars fill left→right while the score counts up.
     Children: [data-mk-stars-fill] (the filled-star layer), optional [data-mk-rating-number]. */
  MK.effect('rating', function (el, o) {
    var value = o.opt('value', 5), max = o.opt('max', 5), dec = o.opt('decimals', 1);
    var fill = el.querySelector('[data-mk-stars-fill]'), num = el.querySelector('[data-mk-rating-number]');
    var pct = MK.clamp(value / max, 0, 1);
    var orig = num ? num.textContent : '';
    if (fill) o.own(fill);
    if (num) { num.setAttribute('aria-hidden', 'true'); }
    if (!el.hasAttribute('aria-label')) { el.setAttribute('aria-label', value + ' out of ' + max); o.cleanup(function () { el.removeAttribute('aria-label'); }); }
    o.cleanup(function () { if (num) { num.textContent = orig; num.removeAttribute('aria-hidden'); } });
    var st = { p: 0 };
    var render = function () {
      if (fill) fill.style.clipPath = 'inset(0% ' + ((1 - st.p * pct) * 100).toFixed(2) + '% 0% 0%)';
      if (num) num.textContent = (st.p * value).toFixed(dec);
    };
    render();
    o.reveal(st, { p: 0 }, { p: 1, duration: o.dur(o.opt('duration', 'xl')), ease: o.ease('out'), onUpdate: render }, { trigger: el });
  });
});
