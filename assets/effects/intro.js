/*!
 * motion-kit · effects/intro.js
 * intro-window · intro-arch · intro-drop · intro-curtain
 * Each intro locks scrolling while it plays, then calls MK.introDone() so elements with
 * data-mk-on="intro" start. Intros run once per page load and never under reduced motion
 * (their overlays are hidden by CSS unless html.mk-motion is set).
 * Load after motion-core.js. In a bundler: import registerIntro from './effects/intro'; registerIntro(MK).
 */
(function (root, register) {
  if (typeof module === 'object' && module.exports) module.exports = register;
  else if (root && root.MK) register(root.MK);
  else if (typeof console !== 'undefined') console.warn('[motion-kit] Load motion-core.js before effects/intro.js');
})(typeof window !== 'undefined' ? window : this, function (MK) {
  'use strict';

  /* Lock helper: unlocks exactly once, also on cleanup. */
  function locker(o) {
    var locked = false;
    var api = {
      lock: function () { if (!locked) { locked = true; MK.lock(); } },
      unlock: function () { if (locked) { locked = false; MK.unlock(); } }
    };
    o.cleanup(api.unlock);
    return api;
  }
  function done(el) { el.classList.add('mk-done'); }
  var skip = function (el, o) { done(el); o.introDone(); };

  /* I1 · Window intro (nova) — the hero frame opens out of a rounded window, its image settles from a
     slow push-in, then [data-mk-intro-item] elements (nav, copy, buttons) fade up in order. */
  MK.effect('intro-window', function (el, o) {
    var gs = o.gsap;
    var items = MK.toArray(document.querySelectorAll(o.opt('items', '[data-mk-intro-item]')));
    if (MK.introFinished) { items.forEach(function (n) { n.classList.add('mk-ready'); }); return; }
    var radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
    var round = radius ? ' round ' + radius + 'px' : '';
    var media = el.querySelector('[data-mk-intro-media]') || el.querySelector('img, video');
    o.own([el].concat(media ? [media] : [], items));
    var lk = locker(o);
    if (o.opt('lock', true) !== false) lk.lock();
    var tl = gs.timeline({ delay: o.opt('delay', 0.15), onComplete: lk.unlock });
    tl.fromTo(el, { clipPath: 'inset(' + o.opt('inset', '16% 22% 38% 22%') + round + ')' },
      { clipPath: 'inset(0% 0% 0% 0%' + round + ')', duration: o.opt('duration', 1.7), ease: o.ease('inOut') }, 0);
    if (media) tl.fromTo(media, { scale: o.opt('zoom', 1.12) }, { scale: 1, duration: 2.8, ease: o.ease('out') }, 0);
    if (items.length) tl.fromTo(items, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: o.dur('m'), ease: o.ease('out'), stagger: o.opt('stagger', 0.15) }, 0.9);
    items.forEach(function (n) { n.classList.add('mk-ready'); });
    tl.call(function () { o.introDone(); lk.unlock(); }, null, 0.8);
    var safety = gs.delayedCall(8, function () { tl.progress(1); });
    o.cleanup(function () { safety.kill(); });
  }, {
    intro: true,
    reduced: function (el, o) {
      MK.toArray(document.querySelectorAll(o.opt('items', '[data-mk-intro-item]'))).forEach(function (n) { n.classList.add('mk-ready'); });
      o.introDone();
    }
  });

  /* I2 · Arch preloader (Solenne) — a dark field with an arched window: the brand lockup flips in, the arch
     rises from below and widens, then dives past the screen edges to reveal the page. */
  MK.effect('intro-arch', function (el, o) {
    var gs = o.gsap;
    if (MK.introFinished) { done(el); return; }
    var mob = o.is.mobile;
    var A0 = { '--mk-arch-w': mob ? '44vw' : '24vw', '--mk-arch-y': '104vh' };
    var A1 = { '--mk-arch-w': mob ? '72vw' : '36vw', '--mk-arch-y': mob ? '20vh' : '15vh' };
    var A2 = { '--mk-arch-w': mob ? '170vw' : '125vw', '--mk-arch-y': '-100vh' };
    var rings = [];
    if (!el.querySelector('.mk-arch-ring')) {
      ['1.75vw', '3vw'].forEach(function (off, i) {
        var r = document.createElement('span');
        r.className = 'mk-arch-ring mk-arch-ring--' + (i + 1);
        r.style.setProperty('--o', mob ? (i ? '6.5vw' : '3.5vw') : off);
        el.appendChild(r);
        rings.push(r);
      });
      o.cleanup(function () { rings.forEach(function (r) { if (r.parentNode) r.parentNode.removeChild(r); }); });
    }
    o.own(el);
    var lk = locker(o);
    lk.lock();
    var title = el.querySelector('[data-mk-arch-title]'), tag = el.querySelector('[data-mk-arch-tag]');
    var chars = title ? o.split(title, 'chars', { mask: false }).chars : [];
    var dive = MK.customEase('mk-dive', '0.6,0,0,1', 'power3.inOut');
    gs.set(el, A0);
    var tl = gs.timeline({ delay: 0.2 });
    if (chars.length) tl.fromTo(chars, { opacity: 0, yPercent: 50, rotateY: 90, transformPerspective: 600 }, { opacity: 1, yPercent: 0, rotateY: 0, duration: 1.2, stagger: 0.05, ease: o.ease('out') }, 0.1);
    if (tag) tl.fromTo(tag, { opacity: 0, clipPath: 'inset(-20% 100% -20% 0%)' }, { opacity: 1, clipPath: 'inset(-20% 0% -20% 0%)', duration: 2, ease: o.ease('out') }, 0.4);
    tl.to(el, assign({ duration: 1.5, ease: o.ease('inOut') }, A1), o.opt('hold', 1.0));
    tl.to(el, assign({
      duration: 2.4, ease: dive,
      onStart: function () { o.introDone(); lk.unlock(); },
      onComplete: function () { done(el); MK.refresh(); }
    }, A2), '<90%');
    var safety = gs.delayedCall(10, function () { tl.progress(1); });
    o.cleanup(function () { safety.kill(); });
  }, { intro: true, reduced: skip });
  function assign(a, b) { Object.keys(b).forEach(function (k) { a[k] = b[k]; }); return a; }

  /* I3 · Droplet intro (Dewpoint) — a drop falls, splats, sends out a ripple, and the hero opens as a
     growing circle from the splash point. data-mk-target: the element to reveal (default: next sibling). */
  MK.effect('intro-drop', function (el, o) {
    var gs = o.gsap;
    var sel = o.opt('target', null);
    var target = sel ? document.querySelector(sel) : el.nextElementSibling;
    if (MK.introFinished || !target) { skip(el, o); return; }
    var color = o.opt('color', '#6F7DFF'), hit = o.opt('hit', 0.58);
    var drop = document.createElement('div');
    drop.className = 'mk-drop-drop';
    drop.innerHTML = '<svg viewBox="0 0 40 52" aria-hidden="true"><path d="M20 0C20 0 0 24 0 34a20 20 0 0 0 40 0C40 24 20 0 20 0Z" fill="' + color + '"/></svg>';
    var ring = document.createElement('span');
    ring.className = 'mk-drop-ring';
    ring.style.borderColor = color;
    ring.style.top = (hit * 100) + 'vh';
    el.appendChild(drop);
    el.appendChild(ring);
    o.cleanup(function () { [drop, ring].forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); }); });
    o.own(target);
    if (getComputedStyle(target).position === 'static') target.style.position = 'relative';
    target.style.zIndex = '9998';
    var lk = locker(o);
    lk.lock();
    var at = '50% ' + (hit * 100) + '%';
    gs.set(drop, { transformOrigin: '50% 100%' });
    gs.set(target, { clipPath: 'circle(0% at ' + at + ')' });
    var tl = gs.timeline({
      delay: 0.2,
      onComplete: function () { done(el); target.style.clipPath = ''; target.style.zIndex = ''; MK.refresh(); }
    });
    tl.fromTo(drop, { y: -80, scaleX: 0.9, scaleY: 1.15 }, { y: function () { return window.innerHeight * hit - 52; }, duration: 0.78, ease: 'power2.in' })
      .to(drop, { scaleX: 1.9, scaleY: 0.4, duration: 0.12, ease: 'power1.out' })
      .to(drop, { opacity: 0, duration: 0.14 }, '>-0.02')
      .fromTo(ring, { scale: 1, opacity: 0.9 }, { scale: 11, opacity: 0, duration: 1.1, ease: o.ease('out') }, '<')
      .fromTo(target, { clipPath: 'circle(0% at ' + at + ')' }, { clipPath: 'circle(142% at ' + at + ')', duration: 1.25, ease: o.ease('out') }, '<+0.02')
      .call(function () { o.introDone(); lk.unlock(); }, null, '<+0.3');
    var safety = gs.delayedCall(8, function () { tl.progress(1); });
    o.cleanup(function () { safety.kill(); });
  }, { intro: true, reduced: skip });

  /* I4 · Curtain loader (Ember) — a counter runs while assets load (fake-progress to 86 %, then waits for
     window.load), step captions roll, then two sheets lift away with a bowed bottom edge. */
  MK.effect('intro-curtain', function (el, o) {
    var gs = o.gsap;
    if (MK.introFinished) { done(el); return; }
    var count = el.querySelector('[data-mk-loader-count]'), stepEl = el.querySelector('[data-mk-loader-step]'), mid = el.querySelector('[data-mk-loader-mid]');
    var steps = String(o.opt('steps', '')).split('|').map(function (s) { return s.trim(); }).filter(Boolean);
    var colors = String(o.opt('colors', '')).split(',').map(function (s) { return s.trim(); });
    if (colors[0]) el.style.background = colors[0];
    var sheet = document.createElement('div');
    sheet.className = 'mk-curtain-sheet';
    if (colors[1]) sheet.style.background = colors[1];
    el.parentNode.insertBefore(sheet, el.nextSibling);
    o.cleanup(function () { if (sheet.parentNode) sheet.parentNode.removeChild(sheet); });
    o.own([el].concat(mid ? [mid] : [], stepEl ? [stepEl] : []));
    if (count) count.setAttribute('aria-hidden', 'true');
    var lk = locker(o);
    lk.lock();
    var prog = { v: 0 }, shown = 0, finished = false;
    if (stepEl && steps[0]) stepEl.textContent = steps[0];
    function swap(txt) {
      if (!stepEl) return;
      gs.timeline()
        .to(stepEl, { yPercent: -110, duration: 0.22, ease: o.ease('inOut') })
        .add(function () { stepEl.textContent = txt; })
        .fromTo(stepEl, { yPercent: 110 }, { yPercent: 0, duration: 0.35, ease: o.ease('out') });
    }
    function setLoad(v) {
      if (count) count.textContent = Math.round(v * 100);
      if (steps.length > 1) {
        var s = Math.min(steps.length - 1, Math.floor(v * steps.length));
        if (s !== shown) { shown = s; swap(steps[s]); }
      }
    }
    function finish() {
      if (finished) return;
      finished = true;
      done(el);
      sheet.classList.add('mk-done');
      o.introDone();
      lk.unlock();
      MK.refresh();
    }
    function exit() {
      var bow = { borderBottomLeftRadius: '50% 18%', borderBottomRightRadius: '50% 18%' };
      var tl = gs.timeline({ onComplete: finish });
      if (mid) tl.to(mid, { scale: 0.92, opacity: 0, duration: 0.5, ease: o.ease('inOut') });
      tl.to(el, assign({ yPercent: -100, duration: 1.05, ease: o.ease('inOut') }, bow), '>')
        .to(sheet, assign({ yPercent: -100, duration: 1.05, ease: o.ease('inOut') }, bow), '<0.14')
        .call(function () { o.introDone(); lk.unlock(); }, null, '<0.36');
    }
    var loaded = document.readyState === 'complete' ? Promise.resolve() : new Promise(function (r) { window.addEventListener('load', r, { once: true }); });
    var maxWait = o.opt('maxWait', 6000);
    var cap = new Promise(function (r) { setTimeout(r, maxWait); });
    gs.to(prog, {
      v: 0.86, duration: o.opt('duration', 2.1), ease: 'power1.inOut',
      onUpdate: function () { setLoad(prog.v); },
      onComplete: function () {
        Promise.race([loaded, cap]).then(function () {
          if (!o.alive()) return;
          gs.to(prog, { v: 1, duration: 0.45, ease: o.ease('out'), onUpdate: function () { setLoad(prog.v); }, onComplete: function () { gs.delayedCall(0.18, exit); } });
        });
      }
    });
    var safety = gs.delayedCall(maxWait / 1000 + 5, finish);
    o.cleanup(function () { safety.kill(); });
  }, { intro: true, reduced: skip });
});
