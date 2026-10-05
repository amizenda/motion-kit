/*!
 * motion-kit · effects/ui.js
 * nav-hide · nav-state · scroll-progress · cursor · magnetic · fill-bloom · grain · tilt
 * confetti (+ MK.confetti) · elastic-pop · fly-to-cart · follow-sticker
 * Load after motion-core.js. In a bundler: import registerUI from './effects/ui'; registerUI(MK).
 */
(function (root, register) {
  if (typeof module === 'object' && module.exports) module.exports = register;
  else if (root && root.MK) register(root.MK);
  else if (typeof console !== 'undefined') console.warn('[motion-kit] Load motion-core.js before effects/ui.js');
})(typeof window !== 'undefined' ? window : this, function (MK) {
  'use strict';

  /* U1 · Nav hide (Dewpoint) — the header slides away while scrolling down and returns on scroll up, near the
     top, on focus, or when anything inside it dispatches a bubbling `mk:reveal` (fly-to-cart does, for its cart) */
  MK.effect('nav-hide', function (el, o) {
    var gs = o.gsap, after = o.opt('after', 140), shown = true, lastY = window.pageYOffset;
    o.own(el);
    var dist = function () { return el.offsetHeight + (parseFloat(getComputedStyle(el).top) || 0) + 4; };
    var to = function (show) {
      shown = show;
      // 'auto' takes over only `y`: an intro still fading the header in keeps its opacity tween
      gs.to(el, { y: show ? 0 : -dist(), duration: o.dur('s'), ease: o.ease('out'), overwrite: 'auto' });
    };
    o.on(el, 'mk:reveal', function () { if (!shown) to(true); });
    o.trigger({
      start: 0, end: 'max',
      onUpdate: function (self) {
        var y = self.scroll();
        if (!MK.isLocked()) {
          if (y > after && y > lastY + 2 && shown) to(false);
          else if ((y < lastY - 2 || y <= after) && !shown) to(true);
        }
        lastY = y;
      }
    });
    o.on(el, 'focusin', function () { if (!shown) to(true); });
  });

  /* U2 · Nav state (nova, Solenne, Oval) — adds .is-scrolled after N px, and data-mk-on-theme="dark|light"
     while the nav overlaps a [data-mk-theme] section (pinned sections included). Style both in CSS. */
  MK.effect('nav-state', function (el, o) {
    var after = o.opt('after', 40);
    var themed = MK.toArray(document.querySelectorAll(o.opt('themes', '[data-mk-theme]')));
    var probe = 0;
    var measure = function () { probe = o.opt('probe', 0) || (el.offsetHeight / 2 + (parseFloat(getComputedStyle(el).top) || 0)); };
    function update() {
      el.classList.toggle('is-scrolled', window.pageYOffset > after);
      var theme = '';
      for (var i = 0; i < themed.length; i++) {
        var r = themed[i].getBoundingClientRect();
        if (r.top <= probe && r.bottom > probe) theme = themed[i].getAttribute('data-mk-theme') || 'dark';
      }
      if ((el.getAttribute('data-mk-on-theme') || '') !== theme) {
        if (theme) el.setAttribute('data-mk-on-theme', theme); else el.removeAttribute('data-mk-on-theme');
      }
    }
    measure();
    // ScrollTrigger already throttles onUpdate to one call per frame on the shared GSAP clock
    o.trigger({ start: 0, end: 'max', onUpdate: update, onRefresh: function () { measure(); update(); } });
    update();
    o.cleanup(function () { el.classList.remove('is-scrolled'); el.removeAttribute('data-mk-on-theme'); });
  }, { reduced: 'same' });

  /* U3 · Scroll progress (Solenne rail, nova film bar, Dewpoint ritual bar) — a bar scales with page or section progress */
  MK.effect('scroll-progress', function (el, o) {
    var axis = o.opt('axis', 'x') === 'y' ? 'scaleY' : 'scaleX';
    var target = o.opt('target', 'page');
    var from = { transformOrigin: axis === 'scaleX' ? '0% 50%' : '50% 0%' }, to = { ease: 'none' };
    from[axis] = 0;
    to[axis] = 1;
    o.own(el);
    var trig = target === 'page' ? null : (target === 'section' ? el.closest('section') : document.querySelector(target));
    to.scrollTrigger = trig
      ? { trigger: trig, start: o.opt('start', 'top top'), end: o.opt('end', 'bottom bottom'), scrub: o.opt('scrub', true) }
      : { start: 0, end: 'max', scrub: o.opt('scrub', true) };
    o.gsap.fromTo(el, from, to);
  }, { reduced: 'same' });

  /* U4 · Cursor follower (nova, Ember) — a trailing dot that grows over links and shows labels from
     [data-mk-cursor="View"]. Fine pointers only. Put data-mk="cursor" on an empty fixed element. */
  MK.effect('cursor', function (el, o) {
    if (!o.is.hover) return;
    var gs = o.gsap;
    var original = el.innerHTML;
    o.own(el);
    if (!el.querySelector('.mk-cursor-dot')) {
      el.innerHTML = '<span class="mk-cursor-dot"></span><span class="mk-cursor-ring"><span class="mk-cursor-label"></span></span>';
    }
    el.classList.add('mk-cursor');
    el.setAttribute('aria-hidden', 'true');
    o.cleanup(function () { el.innerHTML = original; el.classList.remove('mk-cursor', 'is-visible', 'is-grow', 'is-label'); });
    if (o.opt('hideNative', false)) {
      document.documentElement.classList.add('mk-cursor-none');
      o.cleanup(function () { document.documentElement.classList.remove('mk-cursor-none'); });
    }
    var label = el.querySelector('.mk-cursor-label');
    var pos = { x: -100, y: -100 }, aim = { x: -100, y: -100 }, shown = false, dirty = true, lastScroll = -1, current = '';
    var setX = gs.quickSetter(el, 'x', 'px'), setY = gs.quickSetter(el, 'y', 'px');
    var growSel = o.opt('grow', 'a[href], button, [role="button"], label, summary, [data-mk-cursor-grow]');
    var rate = o.opt('lag', 12);
    o.on(window, 'pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      aim.x = e.clientX; aim.y = e.clientY; dirty = true;
      if (!shown) { shown = true; pos.x = aim.x; pos.y = aim.y; setX(pos.x); setY(pos.y); el.classList.add('is-visible'); }
    }, { passive: true });
    o.on(document, 'mouseleave', function () { shown = false; el.classList.remove('is-visible'); });
    o.loop(function (dt) {
      if (!shown) return;
      if (Math.abs(aim.x - pos.x) > 0.05 || Math.abs(aim.y - pos.y) > 0.05) {
        pos.x = MK.damp(pos.x, aim.x, rate, dt);
        pos.y = MK.damp(pos.y, aim.y, rate, dt);
        setX(pos.x); setY(pos.y);
      }
      var sy = window.pageYOffset;
      if (!dirty && sy === lastScroll) return;
      dirty = false; lastScroll = sy;
      var hit = document.elementFromPoint(aim.x, aim.y);
      var lab = hit && hit.closest ? hit.closest('[data-mk-cursor]') : null;
      var text = lab ? lab.getAttribute('data-mk-cursor') : '';
      var grow = !text && hit && hit.closest ? !!hit.closest(growSel) : false;
      var state = text ? 'label:' + text : (grow ? 'grow' : '');
      if (state === current) return;
      current = state;
      el.classList.toggle('is-label', !!text);
      el.classList.toggle('is-grow', grow);
      if (text) label.textContent = text;
    });
  });

  /* U5 · Magnetic (nova CTA) — the element leans toward the pointer and springs back on leave.
     Put it on a wrapper if the element itself also has an entrance effect. */
  MK.effect('magnetic', function (el, o) {
    if (!o.is.hover) return;
    var gs = o.gsap;
    var sx = o.opt('strength', 0.32), sy = o.opt('strengthY', sx * 1.3), d = o.opt('duration', 0.7);
    var qx = gs.quickTo(el, 'x', { duration: d, ease: 'power3' }), qy = gs.quickTo(el, 'y', { duration: d, ease: 'power3' });
    o.own(el);
    o.on(el, 'pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      var r = el.getBoundingClientRect();
      var cx = r.left + r.width / 2 - gs.getProperty(el, 'x'), cy = r.top + r.height / 2 - gs.getProperty(el, 'y');
      qx((e.clientX - cx) * sx);
      qy((e.clientY - cy) * sy);
    });
    o.on(el, 'pointerleave', function () { qx(0); qy(0); });
  });

  /* U6 · Fill bloom (Ember buttons) — the hover fill blooms from the exact point the pointer enters.
     The visual is pure CSS (motion-kit.css); JS only records the entry/exit point. */
  MK.effect('fill-bloom', function (el, o) {
    var set = function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mk-mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--mk-my', (e.clientY - r.top) + 'px');
    };
    o.on(el, 'pointerenter', set);
    o.on(el, 'pointerleave', set);
    o.cleanup(function () { el.style.removeProperty('--mk-mx'); el.style.removeProperty('--mk-my'); });
  });

  /* U7 · Film grain (Ember) — a generated noise texture jitters over the page (static when reduced) */
  var grainURL = null;
  function grainTexture() {
    if (grainURL) return grainURL;
    var c = document.createElement('canvas');
    c.width = c.height = 180;
    var g = c.getContext('2d'), img = g.createImageData(180, 180), d = img.data;
    for (var i = 0; i < d.length; i += 4) {
      var v = Math.random() * 255 | 0;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    grainURL = c.toDataURL('image/png');
    return grainURL;
  }
  MK.effect('grain', function (el) {
    el.classList.add('mk-grain');
    el.setAttribute('aria-hidden', 'true');
    el.style.backgroundImage = 'url(' + grainTexture() + ')';
    return function () { el.classList.remove('mk-grain'); el.style.backgroundImage = ''; };
  }, { reduced: 'same' });

  /* U8 · Tilt (Fizzy Fjord realms) — a card tilts toward the pointer in 3D; [data-mk-tilt-depth="14"] children
     slide for parallax; an optional [data-mk-sheen] layer sweeps across and then tracks the pointer. */
  MK.effect('tilt', function (el, o) {
    if (!o.is.hover) return;
    var gs = o.gsap;
    var max = o.opt('max', 8);
    var depth = o.qa('[data-mk-tilt-depth]'), sheen = el.querySelector('[data-mk-sheen]');
    o.own([el].concat(depth, sheen ? [sheen] : []));
    gs.set(el, { transformPerspective: o.opt('perspective', 900) });
    var q = function (t, p, d) { return gs.quickTo(t, p, { duration: d || 0.6, ease: 'power3.out' }); };
    var rx = q(el, 'rotationX'), ry = q(el, 'rotationY');
    var dq = depth.map(function (n) { return { x: q(n, 'x'), y: q(n, 'y'), f: parseFloat(n.getAttribute('data-mk-tilt-depth')) || 12 }; });
    var tracking = false;
    if (sheen) gs.set(sheen, { xPercent: -48, opacity: 0 });
    o.on(el, 'pointerenter', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      if (!sheen) return;
      tracking = false;
      gs.fromTo(sheen, { xPercent: -48, opacity: 0.2 }, { xPercent: 10, opacity: 1, duration: 0.9, ease: 'power2.inOut', overwrite: true, onComplete: function () { tracking = true; } });
    });
    o.on(el, 'pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      var r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      ry(px * 2 * max);
      rx(-py * 2 * max);
      dq.forEach(function (d) { d.x(px * d.f); d.y(py * d.f * 0.7); });
      if (tracking && sheen) gs.to(sheen, { xPercent: px * 36, duration: 0.8, ease: 'power3.out', overwrite: 'auto' });
    });
    o.on(el, 'pointerleave', function () {
      rx(0); ry(0);
      dq.forEach(function (d) { d.x(0); d.y(0); });
      tracking = false;
      if (sheen) gs.to(sheen, { xPercent: 48, opacity: 0, duration: 0.8, ease: 'power2.in', overwrite: true });
    });
  });

  /* U9 · Confetti (Fizzy Fjord "sherbet fizz") — sugar crystals burst from the press point.
     MK.confetti(x, y, { count, speed, size, spread, dir, colors }) is also callable from your own code. */
  var FZ = null;
  var COLORS = ['#E23D55', '#9ED9C3', '#FFCBA8', '#D6F28A', '#FFF0E2', '#F59DB4', '#8B2FA0'];
  function fzTick(time, deltaTime) {
    var dt = Math.min(0.05, (deltaTime || 16) / 1000);
    var ctx = FZ.ctx, P = FZ.P;
    ctx.setTransform(FZ.dpr, 0, 0, FZ.dpr, 0, 0);
    ctx.clearRect(0, 0, FZ.w, FZ.h);
    var dragX = Math.pow(0.965, dt * 60), dragY = Math.pow(0.975, dt * 60);
    for (var i = P.length - 1; i >= 0; i--) {
      var p = P[i];
      p.life += dt;
      p.vy += 576 * dt;
      p.vx *= dragX; p.vy *= dragY;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      var t = p.life / p.max;
      if (t >= 1) { P.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = 1 - t * t;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      if (p.sh === 0) ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r);
      else { ctx.beginPath(); ctx.arc(0, 0, p.r * 0.55, 0, 6.2832); ctx.fill(); }
      if ((Math.floor(p.life * 60) + i) % 10 < 2) { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-p.r / 4, -p.r / 4, p.r / 2, p.r / 2); }
      ctx.restore();
    }
    if (!P.length) { FZ.running = false; MK.gsap.ticker.remove(fzTick); ctx.clearRect(0, 0, FZ.w, FZ.h); }
  }
  MK.confetti = function (x, y, opts) {
    if (MK.reduced || typeof document === 'undefined') return;
    opts = opts || {};
    if (!FZ) {
      var cv = document.createElement('canvas');
      cv.className = 'mk-confetti';
      cv.setAttribute('aria-hidden', 'true');
      document.body.appendChild(cv);
      FZ = { cv: cv, ctx: cv.getContext('2d'), P: [], running: false, dpr: Math.min(2, window.devicePixelRatio || 1) };
      var size = function () { FZ.w = window.innerWidth; FZ.h = window.innerHeight; cv.width = FZ.w * FZ.dpr; cv.height = FZ.h * FZ.dpr; };
      size();
      window.addEventListener('resize', size);
    }
    var colors = opts.colors || COLORS, n = opts.count || 20, speed = (opts.speed || 5) * 60, size2 = opts.size || 3.2;
    var dir = opts.dir != null ? opts.dir : -Math.PI / 2, spread = opts.spread || Math.PI * 1.7;
    for (var i = 0; i < n && FZ.P.length < 700; i++) {
      var a = dir + (Math.random() - 0.5) * spread, sp = speed * (0.35 + Math.random());
      FZ.P.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        r: size2 * (0.5 + Math.random()), rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 30,
        life: 0, max: 0.57 + Math.random() * 0.57,
        c: colors[(Math.random() * colors.length) | 0], sh: Math.random() < 0.62 ? 0 : 1
      });
    }
    if (!FZ.running && MK.gsap) { FZ.running = true; MK.gsap.ticker.add(fzTick); }
  };
  MK.effect('confetti', function (el, o) {
    var colors = o.opt('colors', null);
    o.on(el, 'click', function (e) {
      var x = e.clientX, y = e.clientY;
      if (!x && !y) { var r = el.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
      MK.confetti(x, y, { count: o.opt('count', 20), speed: o.opt('speed', 5), size: o.opt('size', 4.2), colors: colors ? String(colors).split(',') : null });
    });
  });

  /* U10 · Elastic pop (Fizzy Fjord stepper, cart badge, form) — a springy punch when an event fires.
     kind: punch (default) | tilt (badge) | squash (form). event: click | submit | change | any custom event. */
  MK.effect('elastic-pop', function (el, o) {
    var gs = o.gsap;
    var sel = o.opt('target', null);
    var target = sel ? document.querySelector(sel) || el : el;
    var kind = o.opt('kind', 'punch'), ev = o.opt('event', 'click');
    o.own(target);
    var pop = function () {
      if (kind === 'squash') gs.fromTo(target, { scaleX: 1.04, scaleY: 0.96 }, { scaleX: 1, scaleY: 1, duration: 0.6, ease: o.ease('elastic'), overwrite: 'auto' });
      else if (kind === 'tilt') gs.fromTo(target, { scale: o.opt('amount', 1.7), rotation: -12 }, { scale: 1, rotation: 0, duration: 0.9, ease: o.ease('elastic'), transformOrigin: '50% 60%', overwrite: 'auto' });
      else gs.fromTo(target, { scale: o.opt('amount', 1.25) }, { scale: 1, duration: 0.5, ease: o.ease('pop'), overwrite: 'auto' });
    };
    var src = ev === 'submit' ? (el.closest('form') || el) : el;
    o.on(src, ev, pop);
    el.mkPop = pop;
    o.cleanup(function () { delete el.mkPop; });
  });

  /* U11 · Fly to cart (Fizzy Fjord) — the product image arcs into the cart, which then pops.
     The cart element receives a bubbling 'mk:landed' event: update your count there. */
  function landOn(target, source, o, animate) {
    if (!target) return;
    target.dispatchEvent(new CustomEvent('mk:landed', { bubbles: true, detail: { source: source } }));
    if (animate) o.gsap.fromTo(target, { scale: 1.7, rotation: -12 }, { scale: 1, rotation: 0, duration: 0.9, ease: o.ease('elastic'), transformOrigin: '50% 60%', overwrite: 'auto' });
  }
  MK.effect('fly-to-cart', function (el, o) {
    var gs = o.gsap;
    var labelEl = el.querySelector('[data-mk-label]') || el;
    var label = labelEl.textContent, timer = null, doneLabel = o.opt('doneLabel', '');
    o.on(el, 'click', function () {
      var target = document.querySelector(o.opt('target', '[data-mk-cart]'));
      if (!target) return;
      if (doneLabel) {
        labelEl.textContent = doneLabel;
        clearTimeout(timer);
        timer = setTimeout(function () { labelEl.textContent = label; }, 1100);
      }
      // a cart inside a hidden header (nav-hide) is asked to come back before anything flies at it
      target.dispatchEvent(new CustomEvent('mk:reveal', { bubbles: true }));
      var scope = el.closest(o.opt('scope', 'article, li, figure, [data-mk-card]')) || document;
      var img = scope.querySelector(o.opt('source', 'img'));
      if (!img) { landOn(target, el, o, true); return; }
      var a = img.getBoundingClientRect();
      var ax = a.left + a.width / 2, ay = a.top + a.height / 2;
      var fly = img.cloneNode(false);
      ['id', 'data-mk', 'srcset', 'sizes', 'loading'].forEach(function (n) { fly.removeAttribute(n); });
      fly.alt = '';
      fly.setAttribute('aria-hidden', 'true');
      fly.className = 'mk-fly';
      var size = Math.min(a.width || 60, 90);
      fly.style.left = (a.left + a.width / 2 - size / 2) + 'px';
      fly.style.top = (a.top + a.height / 2 - size / 2) + 'px';
      fly.style.width = size + 'px';
      document.body.appendChild(fly);
      gs.set(fly, { scale: 1.6 });
      // the arc aims at the cart's live position each frame, so it lands even while the header slides back in
      var p = { t: 0 }, ex = gs.parseEase('power1.inOut'), ey = gs.parseEase('back.in(1.4)');
      gs.timeline({ onComplete: function () { if (fly.parentNode) fly.parentNode.removeChild(fly); landOn(target, el, o, true); } })
        .to(p, { t: 1, duration: 0.8, ease: 'none', onUpdate: function () {
          var b = target.getBoundingClientRect();
          gs.set(fly, { x: (b.left + b.width / 2 - ax) * ex(p.t), y: (b.top + b.height / 2 - ay) * ey(p.t) });
        } }, 0)
        .to(fly, { scale: 0.3, rotation: 200, duration: 0.8, ease: 'power2.in' }, 0);
    });
    o.cleanup(function () { clearTimeout(timer); labelEl.textContent = label; });
  }, {
    reduced: function (el, o) {
      o.on(el, 'click', function () { landOn(document.querySelector(o.opt('target', '[data-mk-cart]')), el, o, false); });
    }
  });

  /* U12 · Follow sticker (Fizzy Fjord footer candy) — inside a container, a sticker trails the pointer and
     tilts with its speed; on touch screens it bobs gently instead. Child: [data-mk-sticker]. */
  MK.effect('follow-sticker', function (el, o) {
    var gs = o.gsap;
    var st = el.querySelector('[data-mk-sticker]');
    if (!st) return;
    o.own([el, st]);
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    if (!o.is.hover) {
      var bob = gs.to(st, { y: '+=14', rotation: 10, duration: 2.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      o.trigger({ trigger: el, start: 'top bottom', end: 'bottom top', onToggle: function (s) { if (s.isActive) bob.play(); else bob.pause(); } });
      return;
    }
    var off = o.opt('offset', 26);
    gs.set(st, { position: 'absolute', left: 0, top: 0, xPercent: -50, yPercent: -50, opacity: 0, scale: 0.6, pointerEvents: 'none' });
    var qx = gs.quickTo(st, 'x', { duration: 0.7, ease: 'power3.out' }), qy = gs.quickTo(st, 'y', { duration: 0.7, ease: 'power3.out' });
    var qr = gs.quickTo(st, 'rotation', { duration: 0.9, ease: 'power3.out' });
    var lastX = null, moved = 0;
    var local = function (e) { var r = el.getBoundingClientRect(); return { x: e.clientX - r.left + off, y: e.clientY - r.top + off }; };
    o.on(el, 'pointerenter', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      var p = local(e);
      gs.set(st, { x: p.x, y: p.y });
      qx(p.x); qy(p.y);
      lastX = e.clientX;
      gs.to(st, { opacity: 1, scale: 1, duration: 0.4, ease: o.ease('pop'), overwrite: 'auto' });
    });
    o.on(el, 'pointermove', function (e) {
      var p = local(e);
      qx(p.x); qy(p.y);
      if (lastX !== null) moved += e.clientX - lastX;
      lastX = e.clientX;
    });
    o.on(el, 'pointerleave', function () { lastX = null; gs.to(st, { opacity: 0, scale: 0.6, duration: 0.3, overwrite: 'auto' }); });
    o.loop(function (dt) {
      qr(MK.clamp((moved / dt) * 0.02, -30, 30));       // tilt follows horizontal speed and relaxes at rest
      moved = 0;
    }, { el: el });
  });
});
