/*!
 * motion-kit · effects/scroll.js
 * hero-exit · drift · depth-layers · pin-crossfade · pin-steps · sticky-steps · horizontal
 * stack-accordion · scroll-accordion · card-stack · sequence-build · sticky-stats · handoff · cloud-curtain
 * Load after motion-core.js. In a bundler: import registerScroll from './effects/scroll'; registerScroll(MK).
 */
(function (root, register) {
  if (typeof module === 'object' && module.exports) module.exports = register;
  else if (root && root.MK) register(root.MK);
  else if (typeof console !== 'undefined') console.warn('[motion-kit] Load motion-core.js before effects/scroll.js');
})(typeof window !== 'undefined' ? window : this, function (MK) {
  'use strict';

  function flag(el, cls, o) { el.classList.add(cls); o.cleanup(function () { el.classList.remove(cls); }); }

  /* S1 · Hero exit (nova, Solenne, Ember, Fizzy Fjord) — layers part at different speeds as the hero
     scrolls away, the copy lifts and fades, the background pushes in. Hero must start at the page top. */
  MK.effect('hero-exit', function (el, o) {
    var gs = o.gsap;
    var layers = o.qa('[data-mk-depth]'), exits = o.qa('[data-mk-exit]'), pushes = o.qa('[data-mk-push]');
    o.own(layers.concat(exits, pushes));
    var tl = gs.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: o.opt('scrub', true), invalidateOnRefresh: true }
    });
    layers.forEach(function (l) {
      var d = parseFloat(l.getAttribute('data-mk-depth')) || 0;
      tl.fromTo(l, { y: 0 }, { y: function () { return -d * window.innerHeight; }, duration: 1, immediateRender: false }, 0);
    });
    if (exits.length) {
      tl.fromTo(exits, { y: 0, opacity: 1 }, { y: function () { return -window.innerHeight * o.opt('lift', 0.12); }, opacity: 0, duration: o.opt('exitAt', 0.6), immediateRender: false }, 0);
    }
    if (pushes.length) {
      tl.fromTo(pushes, { scale: 1 }, { scale: o.opt('push', 1.25), ease: o.ease('in'), duration: 0.6, immediateRender: false }, 0.4);
    }
    tl.set({}, {}, 1);
  });

  /* S2 · Drift (Solenne flowers, nova section heads) — a decorative element slides against the scroll */
  MK.effect('drift', function (el, o) {
    var axis = o.opt('axis', 'y'), unit = o.opt('unit', '%');
    var prop = unit === '%' ? (axis === 'x' ? 'xPercent' : 'yPercent') : axis;
    var a = {}, b = { ease: 'none' };
    a[prop] = o.opt('from', -10);
    b[prop] = o.opt('to', 10);
    var sel = o.opt('trigger', null);
    var trig = sel ? document.querySelector(sel) : (el.closest('section') || el.parentElement);
    o.own(el);
    b.scrollTrigger = MK.withContainer(trig, { trigger: trig, start: o.opt('start', 'top bottom'), end: o.opt('end', 'bottom top'), scrub: o.opt('scrub', 0.5) });
    o.gsap.fromTo(el, a, b);
  });

  /* S3 · Depth layers (nova depth scene) — children move at speeds set by data-mk-depth and sway with the pointer */
  MK.effect('depth-layers', function (el, o) {
    var gs = o.gsap;
    var layers = o.qa('[data-mk-depth]');
    if (!layers.length) return;
    o.own(layers);
    var travel = o.opt('travel', 20);
    var pinLen = o.opt('pin', 0);
    var st = pinLen
      ? { trigger: el, start: 'top top', end: '+=' + pinLen + '%', pin: true, scrub: o.opt('scrub', 0.6), anticipatePin: 1 }
      : { trigger: el, start: 'top bottom', end: 'bottom top', scrub: o.opt('scrub', 0.6) };
    var tl = gs.timeline({ defaults: { ease: 'none' }, scrollTrigger: st });
    layers.forEach(function (l) {
      var d = parseFloat(l.getAttribute('data-mk-depth')) || 0;
      tl.fromTo(l, { yPercent: travel * d }, { yPercent: -travel * d }, 0);
    });
    if (o.is.hover && o.opt('pointer', true) !== false) {
      var sway = o.opt('sway', 18);
      var qs = layers.map(function (l) {
        return { q: gs.quickTo(l, 'x', { duration: 1.2, ease: 'power3' }), d: parseFloat(l.getAttribute('data-mk-depth')) || 0 };
      });
      o.on(el, 'pointermove', function (e) {
        var r = el.getBoundingClientRect(), n = ((e.clientX - r.left) / r.width - 0.5) * 2;
        qs.forEach(function (q) { q.q(-n * q.d * sway); });
      }, { passive: true });
      o.on(el, 'pointerleave', function () { qs.forEach(function (q) { q.q(0); }); });
    }
  });

  /* S4 · Pinned crossfade (nova film) — the section pins; frames and captions crossfade with progress */
  MK.effect('pin-crossfade', function (el, o) {
    var gs = o.gsap;
    var frames = o.qa('[data-mk-frame]'), caps = o.qa('[data-mk-caption]'), bar = el.querySelector('[data-mk-bar]');
    var N = frames.length;
    if (N < 2) return;
    flag(el, 'mk-pcf-on', o);
    if (bar) { o.own(bar); gs.set(bar, { transformOrigin: '0% 50%', scaleX: 0 }); }
    var setBar = bar ? gs.quickSetter(bar, 'scaleX') : null;
    o.trigger({
      trigger: el, start: 'top bottom+=100%', once: true,
      onEnter: function () {
        frames.forEach(function (f) {
          var im = f.matches('img') ? f : f.querySelector('img');
          if (im && im.dataset.src) { im.src = im.dataset.src; im.removeAttribute('data-src'); }
        });
      }
    });
    var k = -1;
    function set(i) {
      if (i === k) return;
      k = i;
      frames.forEach(function (f, j) { f.classList.toggle('is-active', j === i); });
      caps.forEach(function (c, j) { c.classList.toggle('is-active', j === i); });
    }
    set(0);
    o.trigger({
      trigger: el, start: 'top top', end: '+=' + (N - 1) * o.opt('per', 90) + '%', pin: true, anticipatePin: 1,
      onUpdate: function (s) {
        set(MK.clamp(Math.round(s.progress * (N - 1)), 0, N - 1));
        if (setBar) setBar(s.progress);
      }
    });
    o.cleanup(function () { frames.concat(caps).forEach(function (f) { f.classList.remove('is-active'); }); });
  });

  /* S5 · Pinned steps (Oval ritual) — desktop: steps stack in one place; each new photo wipes up over the
     last, text swaps, a rail fills, dots jump to a step, scroll snaps to steps. Mobile: plain reveals. */
  MK.effect('pin-steps', function (el, o) {
    var gs = o.gsap;
    var steps = o.qa('[data-mk-step]');
    var N = steps.length;
    if (N < 2) return;
    if (o.is.mobile && !o.opt('mobile', false)) {
      steps.forEach(function (s) {
        o.reveal(s, { opacity: 0, y: 48 }, { opacity: 1, y: 0, duration: o.dur('m'), ease: o.ease('out') }, { trigger: s, start: 'top-=48 88%' });
      });
      return;
    }
    flag(el, 'mk-ps-on', o);
    var medias = steps.map(function (s) { return s.querySelector('[data-mk-step-media]'); });
    var imgs = medias.map(function (m) { return m ? m.querySelector('img, video') : null; });
    var texts = steps.map(function (s) { var tx = s.querySelector('[data-mk-step-text]') || s; return MK.toArray(tx.children); });
    var dots = MK.toArray(el.querySelectorAll('[data-mk-dot]'));
    var fill = el.querySelector('[data-mk-rail-fill]');
    o.own(steps.concat(medias.filter(Boolean), imgs.filter(Boolean), [].concat.apply([], texts), fill ? [fill] : []));
    steps.forEach(function (s, i) {
      s.style.zIndex = i + 1;
      if (!i) return;
      gs.set(texts[i], { opacity: 0, y: 40 });
      if (medias[i]) gs.set(medias[i], { clipPath: 'inset(100% 0% 0% 0%)' });
      if (imgs[i]) gs.set(imgs[i], { scale: 1.15 });
    });
    if (fill) gs.set(fill, { scaleY: 0, transformOrigin: '50% 0%' });
    var labelP = [];
    var tl = gs.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: el, start: 'top top', end: '+=' + (N - 1) * o.opt('per', 125) + '%',
        pin: true, scrub: o.opt('scrub', 0.8), anticipatePin: 1, invalidateOnRefresh: true,
        snap: o.opt('snap', true) ? { snapTo: 'labels', duration: { min: 0.3, max: 0.8 }, delay: 0.05, ease: 'power2.inOut' } : false,
        onUpdate: function (s) { mark(nearest(s.progress)); }
      }
    });
    tl.addLabel('s0', 0);
    for (var i = 1; i < N; i++) {
      var at = i - 1 + 0.15;
      tl.to(texts[i - 1], { opacity: 0, y: -40, duration: 0.35, stagger: 0.03, ease: 'power2.in' }, at);
      if (medias[i]) tl.fromTo(medias[i], { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.7, ease: 'power2.inOut', immediateRender: false }, at);
      if (imgs[i]) tl.fromTo(imgs[i], { scale: 1.15 }, { scale: 1, duration: 0.7, ease: 'power2.inOut', immediateRender: false }, at);
      if (imgs[i - 1]) tl.to(imgs[i - 1], { scale: 1.06, duration: 0.7 }, at);
      tl.fromTo(texts[i], { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.03, ease: 'power3.out', immediateRender: false }, at + 0.3);
      tl.addLabel('s' + i, i);
    }
    tl.set({}, {}, N - 1);
    if (fill) tl.fromTo(fill, { scaleY: 0 }, { scaleY: 1, duration: tl.duration(), immediateRender: false }, 0);
    for (var j = 0; j < N; j++) labelP[j] = tl.labels['s' + j] / tl.duration();
    function nearest(p) {
      var best = 0, bd = 2;
      labelP.forEach(function (lp, k) { var d = Math.abs(lp - p); if (d < bd) { bd = d; best = k; } });
      return best;
    }
    var cur = -1;
    function mark(i) {
      if (i === cur) return;
      cur = i;
      steps.forEach(function (s, k) { s.classList.toggle('is-current', k === i); });
      dots.forEach(function (d, k) {
        d.classList.toggle('is-on', k <= i);
        d.classList.toggle('is-now', k === i);
        if (k === i) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current');
      });
    }
    mark(0);
    dots.forEach(function (d, i) {
      o.on(d, 'click', function (e) {
        e.preventDefault();
        var st = tl.scrollTrigger;
        var y = st.labelToScroll ? st.labelToScroll('s' + i) : st.start + (st.end - st.start) * labelP[i];
        MK.scrollTo(y, { duration: 1.1 });
      });
    });
    o.cleanup(function () { steps.forEach(function (s) { s.classList.remove('is-current'); }); dots.forEach(function (d) { d.classList.remove('is-on', 'is-now'); d.removeAttribute('aria-current'); }); });
  });

  /* S6 · Sticky steps (Dewpoint ritual) — a sticky media column; each step's photo opens from the centre
     as its text block arrives, and an optional blurred backdrop crossfades behind. */
  MK.effect('sticky-steps', function (el, o) {
    var gs = o.gsap;
    var steps = o.qa('[data-mk-step]'), medias = o.qa('[data-mk-step-media]'), bgs = o.qa('[data-mk-step-bg]'), bar = el.querySelector('[data-mk-bar]');
    var N = Math.min(steps.length, medias.length);
    if (N < 2) return;
    flag(el, 'mk-ss-on', o);
    o.own(medias.concat(bgs, bar ? [bar] : []));
    medias.forEach(function (m, i) { m.style.zIndex = i + 1; });
    bgs.forEach(function (b, i) { b.style.zIndex = bgs.length - i; gs.set(b, { opacity: o.opt('bgOpacity', 0.7) }); });
    for (var i = 1; i < N; i++) {
      (function (i) {
        var st = { trigger: steps[i], start: o.opt('start', 'top 70%'), end: o.opt('end', 'top top'), scrub: true };
        gs.fromTo(medias[i], { clipPath: 'inset(50% 50% 50% 50%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: o.opt('ease', 'power1.out'), scrollTrigger: st });
        if (bgs[i - 1]) gs.fromTo(bgs[i - 1], { opacity: o.opt('bgOpacity', 0.7) }, { opacity: 0, ease: 'none', scrollTrigger: assign({}, st) });
      })(i);
    }
    if (bar) gs.fromTo(bar, { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top top', end: 'bottom bottom', scrub: true } });
  });
  function assign(a, b) { Object.keys(b).forEach(function (k) { a[k] = b[k]; }); return a; }

  /* S7 · Horizontal track (nova journey, Solenne location) — vertical scroll drives a pinned track sideways.
     Effects inside the track (clip-reveal, parallax, line-rise…) automatically follow the horizontal motion. */
  MK.effect('horizontal', function (el, o) {
    var gs = o.gsap;
    var track = el.querySelector('[data-mk-track]');
    if (!track) return;
    if (o.is.mobile && o.opt('mobile', 'pin') === 'native') { flag(el, 'mk-h-native', o); return; }
    flag(el, 'mk-h-on', o);
    o.own(track);
    var dist = function () { return Math.max(0, track.scrollWidth - el.clientWidth); };
    var nested = !!track.querySelector('[data-mk], [data-mk-h-parallax]');
    var ease = nested ? 'none' : o.ease(o.opt('ease', 'none'));
    var tween = gs.to(track, {
      x: function () { return -dist(); }, ease: ease,
      scrollTrigger: {
        trigger: el, start: 'top top', end: function () { return '+=' + dist() * o.opt('ratio', 1); },
        pin: true, scrub: o.opt('scrub', 0.7), anticipatePin: 1, invalidateOnRefresh: true
      }
    });
    el.__mkTrack = tween;
    o.cleanup(function () { delete el.__mkTrack; });
    o.qa('[data-mk-h-parallax]').forEach(function (img) {
      var a = parseFloat(img.getAttribute('data-mk-h-parallax')) || 6;
      o.own([img]);
      gs.fromTo(img, { xPercent: -a }, {
        xPercent: a, ease: 'none',
        scrollTrigger: { trigger: img.parentElement, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true }
      });
    });
  });

  /* S8 · Stack accordion (Dewpoint ingredients) — desktop: pinned row; cards slide left and stack into
     slim spines one after another until the last card sits open. Mobile: native swipe (CSS). */
  MK.effect('stack-accordion', function (el, o) {
    if (o.is.mobile) return;
    var gs = o.gsap;
    var row = el.querySelector('[data-mk-row]') || el;
    var cards = MK.toArray(row.querySelectorAll('[data-mk-card]'));
    var N = cards.length;
    if (N < 2) return;
    o.own(cards.concat([row]));
    var tallest = 0;
    cards.forEach(function (c) { tallest = Math.max(tallest, c.offsetHeight); });
    if (!row.style.height) row.style.height = tallest + 'px';
    flag(el, 'mk-sa-on', o);
    var S = function () { return window.innerWidth * o.opt('spine', 0.0882); };
    var Wc = function () { return cards[0].offsetWidth; };
    var C = function () { return row.clientWidth; };
    var xAt = function (i, k) {
      var s = S(), w = Wc();
      if (k === N - 1 && i === N - 1) return Math.max((N - 1) * s, C() - w);
      return i <= k ? i * s : k * s + (i - k) * w;
    };
    cards.forEach(function (c, i) { c.style.zIndex = i + 1; });
    var tl = gs.timeline({
      defaults: { ease: o.opt('ease', 'power1.out') },
      scrollTrigger: { trigger: row, start: o.opt('start', 'center center'), end: '+=' + o.opt('length', 400) + '%', pin: el, scrub: true, anticipatePin: 1, invalidateOnRefresh: true }
    });
    for (var k = 1; k < N; k++) {
      (function (k) {
        cards.slice(k).forEach(function (c, j) {
          tl.fromTo(c, { x: function () { return xAt(k + j, k - 1); } }, { x: function () { return xAt(k + j, k); }, duration: 1, immediateRender: k === 1 }, k - 1);
        });
      })(k);
    }
  });

  /* S9 · Scroll accordion (Fizzy Fjord flavours) — the section pins; one item at a time expands while the
     others collapse to their title row, linked directly to scroll. */
  MK.effect('scroll-accordion', function (el, o) {
    var items = o.qa('[data-mk-item]');
    var N = items.length;
    if (N < 2) return;
    flag(el, 'mk-sac-on', o);
    o.own(items);
    var full = [], col = [], lastP = 0, dim = o.opt('dim', 0.35);
    function apply(p) {
      lastP = p;
      var f = Math.min(p * N, N - 1);
      items.forEach(function (it, i) {
        var w = Math.max(0, 1 - Math.abs(f - i));
        it.style.height = (col[i] + w * (full[i] - col[i])).toFixed(2) + 'px';
        it.style.opacity = (dim + (1 - dim) * w).toFixed(3);
        it.classList.toggle('is-open', w > 0.5);
      });
    }
    function measure() {
      items.forEach(function (it, i) {
        it.style.height = 'auto';
        full[i] = it.scrollHeight;
        var ti = it.querySelector('[data-mk-item-title]');
        col[i] = ti ? Math.min(full[i], ti.offsetTop + ti.offsetHeight) : Math.min(full[i], 56);
      });
      apply(lastP);
    }
    measure();
    o.trigger({
      trigger: el, start: 'top top', end: function () { return '+=' + window.innerHeight * o.opt('per', 1.15) * N; },
      pin: true, scrub: true, anticipatePin: 1,
      onUpdate: function (s) { apply(s.progress); }
    });
    o.onRefresh(measure);
    o.cleanup(function () { items.forEach(function (it) { it.classList.remove('is-open'); }); });
  });

  /* S10 · Card stack (Fizzy Fjord promise) — a 3D deck; the front card flicks up and away on each step and
     the rest of the deck springs forward. The last child is the front card. */
  MK.effect('card-stack', function (el, o) {
    var gs = o.gsap;
    var deck = el.querySelector('[data-mk-deck]') || el;
    var cards = MK.toArray(deck.querySelectorAll('[data-mk-card]'));
    var N = cards.length;
    if (N < 2) return;
    flag(el, 'mk-cs-on', o);
    o.own(cards);
    var k = o.is.mobile ? 0.55 : 1, gap = o.opt('gap', 30) * k;
    var front = cards.slice().reverse();
    front.forEach(function (c, d) { gs.set(c, { y: d * gap, z: -d * gap, zIndex: N - d }); });
    var rots = [-12.74, -15.9, 6.29, -23.29, 24.85, -9.4, 17.2, -20.1];
    var tl = gs.timeline({
      scrollTrigger: { trigger: el, start: 'top top', end: '+=' + (N - 1) * o.opt('per', 80) + '%', pin: true, scrub: o.opt('scrub', 0.5), anticipatePin: 1, invalidateOnRefresh: true }
    });
    for (var s = 0; s < N - 1; s++) {
      (function (s) {
        tl.to(front[s], {
          yPercent: -80, y: function () { return -0.5 * window.innerHeight; }, scale: 1.2, rotation: rots[s % rots.length],
          ease: 'power4.in', duration: 0.6
        }, s);
        front.slice(s + 1).forEach(function (c, j) {
          var depth = j;                                   // depth after this step
          tl.to(c, { y: depth * gap, z: -depth * gap, ease: 'back.inOut(3)', duration: 0.6 }, s + 0.3);
        });
      })(s);
    }
    tl.to({}, { duration: 0.3 });
  });

  /* S11 · Sequence build (Ember "how it works" ticket) — while pinned, a sheet prints top-down, its lines
     appear one by one, a stamp slams on past a threshold, and step markers follow the progress. */
  MK.effect('sequence-build', function (el, o) {
    var gs = o.gsap;
    var print = el.querySelector('[data-mk-print]'), seq = o.qa('[data-mk-seq]'), stamp = el.querySelector('[data-mk-stamp]'), steps = o.qa('[data-mk-seq-step]');
    o.own([print, stamp].filter(Boolean).concat(seq));
    var stampAt = o.opt('stampAt', 0.58), stamped = false, cur = -1;
    if (stamp) gs.set(stamp, { opacity: 0 });
    function update(s) {
      var p = s.progress;
      if (stamp) {
        var on = p > stampAt;
        if (on !== stamped) {
          stamped = on;
          if (on) {
            gs.fromTo(stamp, { opacity: 0, scale: 2.8, rotation: -32 }, { opacity: 1, scale: 1, rotation: o.opt('stampRotation', -12), duration: 0.6, ease: o.ease('pop'), overwrite: true });
            el.dispatchEvent(new CustomEvent('mk:stamp', { bubbles: true }));
          } else gs.to(stamp, { opacity: 0, scale: 1.5, duration: 0.2, overwrite: true });
        }
      }
      if (steps.length) {
        var idx = Math.min(steps.length - 1, Math.floor(p * steps.length));
        if (idx !== cur) { cur = idx; steps.forEach(function (st, k) { st.classList.toggle('is-active', k === idx); }); }
      }
    }
    var tl = gs.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: el, start: 'top top', end: '+=' + o.opt('length', 200) + '%', pin: o.opt('pin', true) !== false, scrub: true, anticipatePin: 1, onUpdate: update }
    });
    if (print) tl.fromTo(print, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.48 }, 0.02);
    seq.forEach(function (s, i) { tl.fromTo(s, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.04 }, 0.05 + i * (0.44 / seq.length)); });
    tl.set({}, {}, 1);
    o.cleanup(function () { steps.forEach(function (st) { st.classList.remove('is-active'); }); });
  });

  /* S12 · Sticky stats (Oval benefits) — a sticky big number rolls like an odometer to each row's stat as
     the row passes the middle of the screen; the active row is highlighted. */
  MK.effect('sticky-stats', function (el, o) {
    var gs = o.gsap, instant = !o.is.motion;
    var rows = o.qa('[data-mk-stat-row]'), win = el.querySelector('[data-mk-stat-window]'), label = el.querySelector('[data-mk-stat-label]'), dotsBox = el.querySelector('[data-mk-stat-dots]');
    if (!rows.length || !win) return;
    var origWin = win.innerHTML, origLabel = label ? label.textContent : '';
    var dots = [];
    if (dotsBox) {
      if (!dotsBox.children.length) {
        rows.forEach(function () { dotsBox.appendChild(document.createElement('i')); });
        o.cleanup(function () { dotsBox.innerHTML = ''; });
      }
      dots = MK.toArray(dotsBox.children);
    }
    win.innerHTML = '';
    win.classList.add('mk-odo');
    o.cleanup(function () {
      win.innerHTML = origWin; win.classList.remove('mk-odo');
      if (label) { label.textContent = origLabel; label.style.cssText = ''; }
      rows.forEach(function (r) { r.classList.remove('is-active'); });
      dots.forEach(function (d) { d.classList.remove('is-on'); });
    });
    var current = -1, counter = null;
    function fmt(r, v) {
      var dec = +(r.getAttribute('data-mk-decimals') || 0), unit = r.getAttribute('data-mk-unit') || '';
      return v.toFixed(dec) + (unit ? '<small>' + unit + '</small>' : '');
    }
    function show(i) {
      if (i === current) return;
      var dir = i > current ? 1 : -1, first = current < 0;
      current = i;
      rows.forEach(function (r, k) { r.classList.toggle('is-active', k === i); });
      dots.forEach(function (d, k) { d.classList.toggle('is-on', k === i); });
      var r = rows[i], target = parseFloat(r.getAttribute('data-mk-value')) || 0;
      MK.toArray(win.children).forEach(function (old) {
        gs.killTweensOf(old);
        if (instant || first) old.parentNode.removeChild(old);
        else gs.to(old, { yPercent: -110 * dir, duration: 0.55, ease: 'power3.in', onComplete: function () { if (old.parentNode) old.parentNode.removeChild(old); } });
      });
      var v = document.createElement('span');
      v.className = 'mk-odo-val';
      win.appendChild(v);
      if (counter) counter.kill();
      if (instant || first) v.innerHTML = fmt(r, target);
      else {
        var c = { v: 0 };
        v.innerHTML = fmt(r, 0);
        gs.fromTo(v, { yPercent: 110 * dir }, { yPercent: 0, duration: 0.75, ease: 'power3.out', delay: 0.12 });
        counter = gs.to(c, { v: target, duration: 0.9, ease: 'power2.out', delay: 0.12, onUpdate: function () { v.innerHTML = fmt(r, c.v); } });
      }
      if (label) {
        var txt = r.getAttribute('data-mk-label') || '';
        if (instant || first) label.textContent = txt;
        else gs.fromTo(label, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, delay: 0.3, overwrite: true, onStart: function () { label.textContent = txt; } });
      }
    }
    show(0);
    rows.forEach(function (r, i) {
      o.trigger({ trigger: r, start: 'top 55%', end: 'bottom 55%', onToggle: function (s) { if (s.isActive) show(i); } });
    });
  }, { reduced: 'same' });

  /* S13 · Hand-off (Solenne footer) — the section shrinks into a framed card as the next section rises
     behind it; the next section's content scales in and its pattern blooms from the centre. */
  MK.effect('handoff', function (el, o) {
    var gs = o.gsap;
    var sel = o.opt('next', null);
    var next = sel ? document.querySelector(sel) : el.nextElementSibling;
    if (!next) return;
    var content = next.querySelector('[data-mk-handoff-content]'), bloom = next.querySelector('[data-mk-bloom]');
    o.own([el, next].concat(content ? [content] : []));
    var radius = o.opt('radius', 24);
    var tl = gs.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: next, start: o.opt('start', 'top 30%'), end: o.opt('end', 'clamp(bottom bottom)'), scrub: o.opt('scrub', 0.5), invalidateOnRefresh: true }
    });
    tl.fromTo(el, { clipPath: 'inset(0% 0% 0% 0% round 0px)' }, { clipPath: 'inset(' + o.opt('inset', '8% 22% 8% 22%') + ' round ' + radius + 'px)' }, 0);
    if (content) tl.fromTo(content, { opacity: 0, scale: 0.75, transformOrigin: '50% 40%' }, { opacity: 1, scale: 1 }, 0);
    if (bloom) tl.fromTo(next, { '--mk-bloom': '0%' }, { '--mk-bloom': '120%' }, 0);
    if (content) o.on(content, 'focusin', function () { tl.scrollTrigger && tl.progress() < 1 && gs.set(content, { opacity: 1, scale: 1 }); });
  });

  /* S14 · Cloud curtain (Fizzy Fjord hero → kingdom) — painted clouds rise to cover the screen, a fog
     swells, then the clouds part sideways. Place an empty marker where the cover should peak. */
  function seeded(s) {
    return function () {
      s |= 0; s = (s + 0x6d2b79f5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function paintCloud(w, h, seed, density, tint) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var g = c.getContext('2d'), rnd = seeded(seed);
    for (var i = 0; i < density; i++) {
      var u = rnd(), v = rnd(), bump = Math.sin(u * Math.PI);
      var x = w * (0.1 + 0.8 * u), y = h * (0.82 - 0.55 * bump * v);
      var r = (0.05 + 0.12 * rnd()) * w * (0.55 + 0.6 * bump);
      var gr = g.createRadialGradient(x, y - r * 0.25, r * 0.05, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,0.92)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    g.globalCompositeOperation = 'source-atop';
    var sh = g.createLinearGradient(0, h * 0.3, 0, h);
    sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(1, tint);
    g.fillStyle = sh; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'destination-in';
    g.save(); g.translate(w / 2, h / 2); g.scale(1, h / w);
    var m = g.createRadialGradient(0, 0, 0, 0, 0, w / 2);
    m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(0.55, 'rgba(0,0,0,1)'); m.addColorStop(0.94, 'rgba(0,0,0,0)');
    g.fillStyle = m; g.fillRect(-w, -w, w * 2, w * 2); g.restore();
    g.globalCompositeOperation = 'source-over';
    return c;
  }
  MK.effect('cloud-curtain', function (el, o) {
    var gs = o.gsap;
    var L = o.opt('length', 250) / 100;
    var tint = o.opt('tint', 'rgba(240,168,190,0.5)');
    var layer = document.createElement('div');
    layer.className = 'mk-curtain';
    layer.setAttribute('aria-hidden', 'true');
    var fog = document.createElement('div');
    fog.className = 'mk-curtain-fog';
    if (o.opt('fog', null)) fog.style.background = o.opt('fog');
    layer.appendChild(fog);
    document.body.appendChild(layer);
    o.cleanup(function () { if (layer.parentNode) layer.parentNode.removeChild(layer); });
    var tpl = [paintCloud(900, 440, 3, 110, tint), paintCloud(900, 440, 11, 110, tint), paintCloud(900, 440, 27, 130, tint)];
    var CC = [
      { k: 0, x: -38, y: 38, w: 78, side: -1 }, { k: 1, x: 38, y: 40, w: 80, side: 1 }, { k: 2, x: 0, y: 55, w: 90, side: 0 },
      { k: 1, x: -44, y: 4, w: 70, side: -1 }, { k: 0, x: 42, y: 2, w: 72, side: 1 }, { k: 2, x: -8, y: 16, w: 84, side: -1 },
      { k: 0, x: 18, y: -18, w: 74, side: 1 }, { k: 1, x: -30, y: -24, w: 70, side: -1 }, { k: 2, x: 34, y: 70, w: 70, side: 1 }
    ];
    var clouds = CC.map(function (d) {
      var c = document.createElement('canvas');
      c.width = 900; c.height = 440;
      c.getContext('2d').drawImage(tpl[d.k], 0, 0);
      c.className = 'mk-cloud';
      c.style.left = (50 + d.x - d.w / 2) + 'vw';
      c.style.top = 'calc(' + d.y + 'vh - 8vw)';
      c.style.width = d.w + 'vw';
      c.dataset.side = d.side;
      layer.appendChild(c);
      return c;
    });
    layer.style.visibility = 'hidden';
    var tl = gs.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: el,
        start: function () { return 'top-=' + Math.round(window.innerHeight * L / 2) + ' center'; },
        end: function () { return '+=' + Math.round(window.innerHeight * L); },
        scrub: true, invalidateOnRefresh: true,
        onToggle: function (s) { layer.style.visibility = s.isActive ? 'visible' : 'hidden'; }
      }
    });
    tl.fromTo(clouds, { y: function () { return window.innerHeight * 1.15; } }, { y: 0, duration: 105, stagger: { each: 1.2, from: 'center' } }, 25);
    tl.fromTo(fog, { opacity: 0 }, { opacity: 1, duration: 40 }, 92).to(fog, { opacity: 0, duration: 55 }, 158);
    clouds.forEach(function (c, i) {
      var side = +c.dataset.side || (i % 2 ? 1 : -1);
      tl.to(c, { x: function () { return side * window.innerWidth * 0.78; }, scale: 1.25, duration: 125 }, 160 + (i % 3) * 4);
      tl.to(c, { opacity: 0, duration: 40 }, 255);
    });
    tl.set({}, {}, 310);
  });
});
