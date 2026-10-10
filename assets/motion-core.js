/*!
 * motion-kit · core v1.0.0
 * Distilled from six production sites (nova, Ember, Solenne, Fizzy Fjord, Oval, Dewpoint).
 *
 * Requires: GSAP 3.12+ with ScrollTrigger (3.13+ recommended: SplitText & CustomEase are free).
 * Optional: Lenis 1.1+ (smooth wheel), SplitText 3.13+ (accessible line splitting), CustomEase.
 *
 * Classic script  → exposes window.MK
 * CommonJS / ESM  → module.exports = MK   (import MK from './motion-core')
 *
 * Usage (vanilla):
 *   MK.init({ preset: 'editorial' });  // once
 *   MK.start();                        // scans [data-mk] and applies the registered effects
 */
(function (root, factory) {
  var MK = factory();
  if (typeof module === 'object' && module.exports) module.exports = MK;
  if (root && !root.MK) root.MK = MK;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
  'use strict';

  var MK = {
    version: '1.0.0',
    ready: false,      // init() finished
    started: false,    // start() applied effects
    reduced: false,    // current reduced-motion state (live)
    is: null,          // current conditions { motion, reduce, desktop, mobile, hover, touch }
    lenis: null,
    gsap: null,
    ScrollTrigger: null,
    SplitText: null,
    t: null,           // active tokens (see presets)
    config: {}
  };

  var registry = {};
  var gsap = null, ST = null, deps = {};
  var html = null;
  var lockCount = 0;
  var refreshTimer = 0;
  var globalMM = null;
  var starts = [];
  var introState = { done: false, claimed: false, resolve: null, promise: null };
  introState.promise = new Promise(function (r) { introState.resolve = r; });

  /* ------------------------------------------------------------------ utils */

  function warn() {
    if (typeof console === 'undefined') return;
    console.warn.apply(console, ['[motion-kit]'].concat(Array.prototype.slice.call(arguments)));
  }
  function toArray(x) {
    if (!x) return [];
    if (Array.isArray(x)) return x;
    if (typeof x === 'string') return toArray(document.querySelectorAll(x));
    if (x.nodeType || x === x.window || typeof x.length !== 'number') return [x];   // element, window, plain object
    return Array.prototype.slice.call(x);
  }
  function kebab(s) { return s.replace(/[A-Z]/g, function (m) { return '-' + m.toLowerCase(); }); }
  function parse(v) {
    if (v === null || v === undefined) return v;
    if (v === '' || v === 'true') return true;          // presence attribute → true
    if (v === 'false') return false;
    if (/^-?\d*\.?\d+$/.test(v)) return parseFloat(v);
    return v;
  }
  function assignDeep(target, src) {
    Object.keys(src || {}).forEach(function (k) {
      var v = src[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && typeof target[k] === 'object') assignDeep(target[k], v);
      else target[k] = v;
    });
    return target;
  }

  MK.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  MK.map = function (v, a, b) { return MK.clamp((v - a) / (b - a), 0, 1); };
  MK.lerp = function (a, b, t) { return a + (b - a) * t; };
  /** Frame-rate independent smoothing. rate ≈ 12 behaves like lerp(.18) at 60 fps, but identically at 120 fps. */
  MK.damp = function (a, b, rate, dt) { return a + (b - a) * (1 - Math.exp(-rate * dt)); };
  MK.toArray = toArray;

  /* ---------------------------------------------------------------- presets */
  // Each preset is the measured motion vocabulary of one of the audited sites.

  var expoOut = function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); };

  var PRESETS = {
    calm: {
      label: 'Architectural Calm', from: 'nova + Solenne',
      curves: { out: '0.16,1,0.3,1', text: '0.16,1,0.3,1', inOut: '0.75,0,0.25,1', in: '0.5,0,0.75,0', soft: '0.25,0.1,0.25,1', pop: '0.16,1,0.3,1', elastic: 'power3.out' },
      fallback: { out: 'expo.out', text: 'expo.out', inOut: 'power3.inOut', in: 'power2.in', soft: 'sine.inOut', pop: 'expo.out', elastic: 'power3.out' },
      css: { out: 'cubic-bezier(.16,1,.3,1)', inOut: 'cubic-bezier(.75,0,.25,1)', pop: 'cubic-bezier(.16,1,.3,1)' },
      dur: { xs: 0.3, s: 0.6, m: 1.15, l: 1.5, xl: 2.4 },
      stagger: { chars: 0.04, words: 0.06, lines: 0.1, items: 0.12 },
      rise: 26, start: 'top 88%', replay: true,
      lenis: { duration: 1.25, easing: expoOut, smoothWheel: true }
    },
    editorial: {
      label: 'Editorial Mask', from: 'Oval',
      curves: { out: '0.25,1,0.5,1', text: '0.22,1,0.36,1', inOut: '0.76,0,0.24,1', in: '0.5,0,0.75,0', soft: '0.45,0,0.55,1', pop: 'back.out(2)', elastic: 'back.out(2.4)' },
      fallback: { out: 'power3.out', text: 'power4.out', inOut: 'power3.inOut', in: 'power3.in', soft: 'sine.inOut', pop: 'back.out(2)', elastic: 'back.out(2.4)' },
      css: { out: 'cubic-bezier(.2,.8,.2,1)', inOut: 'cubic-bezier(.76,0,.24,1)', pop: 'cubic-bezier(.2,1.3,.4,1)' },
      dur: { xs: 0.25, s: 0.5, m: 0.9, l: 1.1, xl: 1.6 },
      stagger: { chars: 0.03, words: 0.05, lines: 0.1, items: 0.12 },
      rise: 30, start: 'top 85%', replay: false,
      lenis: { duration: 1.15, smoothWheel: true }
    },
    liquid: {
      label: 'Liquid Gloss', from: 'Dewpoint',
      curves: { out: '0.625,0.05,0,1', text: '0.17,0.17,0,1', inOut: '0.625,0.05,0,1', in: '0.55,0,1,0.45', soft: '0.45,0,0.55,1', pop: '0.6,0,0,1', elastic: '0.625,0.05,0,1' },
      fallback: { out: 'expo.out', text: 'expo.out', inOut: 'expo.inOut', in: 'power2.in', soft: 'sine.inOut', pop: 'expo.out', elastic: 'expo.out' },
      css: { out: 'cubic-bezier(.625,.05,0,1)', inOut: 'cubic-bezier(.625,.05,0,1)', pop: 'cubic-bezier(.6,0,0,1)' },
      dur: { xs: 0.3, s: 0.5, m: 1, l: 1.3, xl: 1.6 },
      stagger: { chars: 0.045, words: 0.07, lines: 0.12, items: 0.08 },
      rise: 18, start: 'top 80%', replay: false,
      lenis: { lerp: 0.1, smoothWheel: true }
    },
    warm: {
      label: 'Warm Physical', from: 'Ember (Cloud Kitchen)',
      curves: { out: '0.22,1,0.36,1', text: '0.22,1,0.36,1', inOut: '0.76,0,0.24,1', in: '0.5,0,0.75,0', soft: '0.45,0,0.55,1', pop: 'back.out(1.6)', elastic: 'elastic.out(1, 0.55)' },
      fallback: { out: 'power4.out', text: 'power4.out', inOut: 'power3.inOut', in: 'power3.in', soft: 'sine.inOut', pop: 'back.out(1.6)', elastic: 'elastic.out(1, 0.55)' },
      css: { out: 'cubic-bezier(.22,1,.36,1)', inOut: 'cubic-bezier(.76,0,.24,1)', pop: 'cubic-bezier(.34,1.56,.64,1)' },
      dur: { xs: 0.2, s: 0.45, m: 0.9, l: 1.2, xl: 1.9 },
      stagger: { chars: 0.03, words: 0.06, lines: 0.08, items: 0.1 },
      rise: 34, start: 'top 85%', replay: true,
      lenis: { lerp: 0.1, smoothWheel: true }
    },
    playful: {
      label: 'Playful Candy', from: 'Fizzy Fjord',
      curves: { out: '0.25,1,0.5,1', text: '0.25,1,0.5,1', inOut: '0.625,0.05,0,1', in: '0.5,0,0.75,0', soft: '0.37,0,0.63,1', pop: 'back.out(1.7)', elastic: 'elastic.out(1, 0.4)' },
      fallback: { out: 'power3.out', text: 'power3.out', inOut: 'expo.inOut', in: 'power3.in', soft: 'sine.inOut', pop: 'back.out(1.7)', elastic: 'elastic.out(1, 0.4)' },
      css: { out: 'cubic-bezier(.25,1,.5,1)', inOut: 'cubic-bezier(.625,.05,0,1)', pop: 'cubic-bezier(.34,1.56,.64,1)' },
      dur: { xs: 0.12, s: 0.35, m: 0.8, l: 1.1, xl: 1.5 },
      stagger: { chars: 0.02, words: 0.05, lines: 0.12, items: 0.08 },
      rise: 40, start: 'top 85%', replay: false,
      lenis: { lerp: 0.1, smoothWheel: true }
    }
  };
  MK.presets = PRESETS;

  function easeFrom(key, curve, fallback) {
    if (/[a-z]/i.test(curve)) return curve;                       // already a GSAP ease name
    if (deps.CustomEase) {
      try { deps.CustomEase.create('mk-' + key, curve); return 'mk-' + key; } catch (e) { /* fall through */ }
    }
    return fallback;
  }

  function setPreset(name, overrides) {
    var key = PRESETS[name] ? name : 'editorial';
    if (!PRESETS[name]) warn('Unknown preset "' + name + '" — using "editorial".');
    var p = PRESETS[key];
    var t = {
      name: key, label: p.label, ease: {},
      css: assignDeep({}, p.css), dur: assignDeep({}, p.dur), stagger: assignDeep({}, p.stagger),
      rise: p.rise, start: p.start, replay: p.replay, lenis: assignDeep({}, p.lenis)
    };
    Object.keys(p.curves).forEach(function (k) { t.ease[k] = easeFrom(k, p.curves[k], p.fallback[k]); });
    if (overrides) assignDeep(t, overrides);
    MK.t = t;
    var s = html.style;
    s.setProperty('--mk-ease-out', t.css.out);
    s.setProperty('--mk-ease-inout', t.css.inOut);
    s.setProperty('--mk-ease-pop', t.css.pop);
    ['xs', 's', 'm', 'l', 'xl'].forEach(function (k) { s.setProperty('--mk-dur-' + k, t.dur[k] + 's'); });
    html.setAttribute('data-mk-preset', key);
  }

  /* -------------------------------------------------------------- conditions */

  function query() { return (typeof location !== 'undefined' && location.search) || ''; }
  function forced() {
    if (MK.config.reduced === true || /[?&]mk-reduce\b/.test(query())) return 'reduce';
    if (MK.config.reduced === false || /[?&]mk-motion\b/.test(query())) return 'motion';
    return '';
  }
  function conditions() {
    var f = forced();
    return {
      motion: f === 'reduce' ? 'not all' : f === 'motion' ? 'all' : '(prefers-reduced-motion: no-preference)',
      desktop: '(min-width: ' + MK.config.breakpoint + 'px)',
      hover: '(hover: hover) and (pointer: fine)'
    };
  }
  function normalize(c) {
    return { motion: !!c.motion, reduce: !c.motion, desktop: !!c.desktop, mobile: !c.desktop, hover: !!c.hover, touch: !c.hover };
  }

  /* ------------------------------------------------------------------- Lenis */

  var lenisTick = null;
  function lenisResize() { if (MK.lenis && MK.lenis.resize) MK.lenis.resize(); }
  function startLenis() {
    if (MK.lenis || !deps.Lenis) return;
    var o = assignDeep(assignDeep({}, MK.t.lenis), MK.config.lenis || {});
    try { MK.lenis = new deps.Lenis(o); } catch (e) { warn('Lenis failed to start:', e); return; }
    MK.lenis.on('scroll', ST.update);
    lenisTick = function (time) { if (MK.lenis) MK.lenis.raf(time * 1000); };
    gsap.ticker.add(lenisTick);
    gsap.ticker.lagSmoothing(0);
    ST.addEventListener('refresh', lenisResize);
    if (lockCount) MK.lenis.stop();
  }
  function stopLenis() {
    if (!MK.lenis) return;
    gsap.ticker.remove(lenisTick);
    ST.removeEventListener('refresh', lenisResize);
    try { MK.lenis.destroy(); } catch (e) { /* noop */ }
    MK.lenis = null;
    gsap.ticker.lagSmoothing(500, 33);
  }

  /**
   * Stop page scrolling (modals, menus, preloaders). Calls are counted; pair every lock() with unlock().
   * The page keeps its width: CSS reserves the scrollbar gutter, and where a browser doesn't honour that on the
   * root, the width the scrollbar left behind is padded back, so nothing reflows under the overlay.
   */
  var lockPad = null;
  function layoutWidth() { return document.body ? document.body.getBoundingClientRect().width : 0; }
  MK.lock = function () {
    lockCount++;
    var before = html && lockCount === 1 ? layoutWidth() : 0;
    if (MK.lenis) MK.lenis.stop();
    if (!html || lockCount > 1) return;
    html.classList.add('mk-locked');
    var grew = layoutWidth() - before;                       // > 0 only where the gutter wasn't kept
    if (grew > 0.5 && grew < 40) { lockPad = html.style.paddingRight; html.style.paddingRight = grew + 'px'; }
  };
  MK.unlock = function (all) {
    lockCount = all ? 0 : Math.max(0, lockCount - 1);
    if (lockCount) return;
    if (MK.lenis) MK.lenis.start();
    if (!html) return;
    html.classList.remove('mk-locked');
    if (lockPad !== null) { html.style.paddingRight = lockPad; lockPad = null; }
  };
  MK.isLocked = function () { return lockCount > 0; };

  /* ------------------------------------------------------------- scrolling */

  function resolveOffset() {
    var o = MK.config.anchorOffset;
    if (typeof o === 'function') return +o() || 0;
    if (typeof o === 'string') { var n = document.querySelector(o); return n ? n.offsetHeight : 0; }
    return +o || 0;
  }
  function focusEl(el) {
    if (!el || el.nodeType !== 1) return;
    if (!el.matches('a[href], button, input, select, textarea, [tabindex]')) el.setAttribute('tabindex', '-1');
    try { el.focus({ preventScroll: true }); } catch (e) { /* noop */ }
  }

  /**
   * Scroll to an element, selector or y position. Uses Lenis when available,
   * an instant jump when the visitor prefers reduced motion.
   * opts: { offset, duration, easing, immediate, focus, onComplete, force }
   */
  MK.scrollTo = function (target, opts) {
    opts = opts || {};
    var el = typeof target === 'string' ? document.querySelector(target) : target;
    if (el === null || el === undefined) return;
    var isNum = typeof el === 'number';
    var offset = opts.offset != null ? opts.offset : (isNum ? 0 : resolveOffset());
    var done = function () {
      if (opts.focus && !isNum) focusEl(el);
      if (opts.onComplete) opts.onComplete();
    };
    if (MK.lenis && !MK.reduced) {
      // instant jumps go through Lenis too: a bare window.scrollTo leaves Lenis on its old position,
      // and its next frame drags the page back there
      if (opts.immediate) MK.lenis.scrollTo(el, { offset: -offset, immediate: true, force: true, onComplete: done });
      else MK.lenis.scrollTo(el, { offset: -offset, duration: opts.duration || 1.4, easing: opts.easing, onComplete: done, force: !!opts.force });
      return;
    }
    var y = isNum ? el : el.getBoundingClientRect().top + window.pageYOffset - offset;
    var smooth = !MK.reduced && !opts.immediate;
    window.scrollTo({ top: y, behavior: smooth ? 'smooth' : 'auto' });
    setTimeout(done, smooth ? 700 : 0);
  };

  function onAnchor(e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a || a.hasAttribute('data-mk-no-glide')) return;
    var href = a.getAttribute('href');
    if (!href || href.length < 2) return;
    var id = decodeURIComponent(href.slice(1));
    var target = document.getElementById(id);
    if (!target && id === 'top') target = 0;
    if (target === null) return;
    e.preventDefault();
    if (MK.isLocked()) MK.unlock(true);              // e.g. a link inside an open menu
    MK.scrollTo(target, { focus: target !== 0 });
    if (history.pushState) history.pushState(null, '', href);
  }

  /* -------------------------------------------------------------- velocity */

  var vel = { on: false, v: 0, lastY: 0 };
  function velTick(time, deltaTime) {
    var dt = Math.min((deltaTime || 16) / 1000, 0.1);
    var y = window.pageYOffset;
    var raw = (y - vel.lastY) / dt;
    vel.lastY = y;
    vel.v = MK.damp(vel.v, raw, 10, dt);
    if (Math.abs(vel.v) < 0.5) vel.v = 0;              // decays to exactly 0 when the page rests
  }
  /** Smoothed scroll velocity in px/s (positive = scrolling down). Frame-rate independent. */
  MK.velocity = function () {
    if (!vel.on && gsap) { vel.on = true; vel.lastY = window.pageYOffset; gsap.ticker.add(velTick); }
    return vel.v;
  };

  /* ----------------------------------------------------------------- intro */

  function resolveIntro() {
    if (introState.done) return;
    introState.done = true;
    MK.introFinished = true;
    introState.resolve();
    if (html) html.classList.add('mk-intro-done');
    if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent('mk:intro-done'));
  }
  MK.introFinished = false;
  /** Called by intro effects when the page content should start animating. */
  MK.introDone = resolveIntro;
  MK.whenIntro = function () { return introState.promise; };

  /* ----------------------------------------------------------------- split */

  var INTERACTIVE = 'a[href], button, input, select, textarea, [tabindex], [contenteditable]';

  /** Text as a screen reader should hear it: <br> becomes a space, whitespace collapsed. */
  function readable(el) {
    var c = el.cloneNode(true);
    toArray(c.querySelectorAll('br')).forEach(function (b) { b.parentNode.replaceChild(document.createTextNode(' '), b); });
    return c.textContent.replace(/\s+/g, ' ').trim();
  }

  function splitLib(el, type, mask) {
    var interactive = !!el.querySelector(INTERACTIVE);
    var label0 = el.getAttribute('aria-label'), label = readable(el);
    var cfg = { aria: interactive ? 'none' : 'auto' };
    if (type === 'lines') { cfg.type = 'lines'; cfg.linesClass = 'mk-line'; if (mask) cfg.mask = 'lines'; }
    else if (type === 'words') { cfg.type = 'words'; cfg.wordsClass = 'mk-word'; if (mask) cfg.mask = 'words'; }
    else { cfg.type = 'words,chars'; cfg.wordsClass = 'mk-word'; cfg.charsClass = 'mk-char'; if (mask) cfg.mask = 'chars'; }
    var s = deps.SplitText.create(el, cfg);
    if (!interactive && label0 === null && label) el.setAttribute('aria-label', label);   // SplitText drops <br> spacing
    var reverted = false;
    var lines = s.lines || [], words = s.words || [], chars = s.chars || [];
    return {
      lib: true, lines: lines, words: words, chars: chars,
      targets: type === 'lines' ? lines : type === 'words' ? words : chars,
      stagger: function (each) { return each; },
      revert: function () {
        if (reverted) return;
        reverted = true;
        try { s.revert(); } catch (e) { /* noop */ }
        if (label0 === null) el.removeAttribute('aria-label'); else el.setAttribute('aria-label', label0);
      }
    };
  }

  function splitFallback(el, type, mask) {
    var records = [], words = [], chars = [], hosts = [];
    var original = readable(el);
    var interactive = !!el.querySelector(INTERACTIVE);

    function wordNode(text) {
      var w = document.createElement('span');
      w.className = 'mk-word';
      if (type === 'chars') {
        Array.from(text).forEach(function (ch) {
          var c = document.createElement('span');
          c.className = 'mk-char';
          c.textContent = ch;
          if (mask) { var cm = document.createElement('span'); cm.className = 'mk-mask'; cm.appendChild(c); w.appendChild(cm); }
          else w.appendChild(c);
          chars.push(c);
        });
      } else w.textContent = text;
      words.push(w);
      var host = w;
      if (mask && type !== 'chars') { host = document.createElement('span'); host.className = 'mk-mask'; host.appendChild(w); }
      if (!interactive) host.setAttribute('aria-hidden', 'true');
      hosts.push(host);
      return host;
    }
    function walk(node) {
      toArray(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var txt = n.nodeValue;
          if (!txt || !txt.trim()) return;
          var frag = document.createDocumentFragment(), made = [];
          txt.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            var piece = /^\s+$/.test(part) ? document.createTextNode(part) : wordNode(part);
            made.push(piece);
            frag.appendChild(piece);
          });
          records.push({ text: txt, nodes: made });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && !/^(SCRIPT|STYLE|BR|IMG|SVG|svg|VIDEO|CANVAS)$/.test(n.nodeName) && !n.classList.contains('mk-sr')) {
          walk(n);
        }
      });
    }
    walk(el);

    var sr = null;
    if (!interactive && original.trim()) {
      sr = document.createElement('span');
      sr.className = 'mk-sr';
      sr.textContent = original;
      el.insertBefore(sr, el.firstChild);
    }

    // group words into visual lines (used for line-staggered reveals)
    var lineIdx = [], lines = [], prevTop = null, prevH = 0, li = -1;
    hosts.forEach(function (h, k) {
      var r = h.getBoundingClientRect();
      if (prevTop === null || r.top > prevTop + Math.max(4, prevH * 0.5)) { li++; prevTop = r.top; prevH = r.height; }
      lineIdx[k] = li;
      (lines[li] = lines[li] || []).push(words[k]);
    });

    var reverted = false;
    return {
      lib: false, lines: lines, words: words, chars: chars,
      targets: type === 'chars' ? chars : words,
      stagger: function (each) {
        if (type !== 'lines') return each;
        return function (i) { return (lineIdx[i] || 0) * each; };
      },
      revert: function () {
        if (reverted) return;
        reverted = true;
        records.forEach(function (rec) {
          var first = rec.nodes[0];
          if (!first || !first.parentNode) return;
          first.parentNode.insertBefore(document.createTextNode(rec.text), first);
          rec.nodes.forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
        });
        if (sr && sr.parentNode) sr.parentNode.removeChild(sr);
      }
    };
  }

  /**
   * Split text into lines / words / chars, accessibly.
   * Uses GSAP SplitText 3.13+ when loaded (true line masks); otherwise a built-in
   * splitter that keeps inline elements (em, a, strong) and their listeners intact.
   * Returns { lines, words, chars, targets, stagger(each), revert() }.
   */
  MK.split = function (el, type, opts) {
    opts = opts || {};
    type = type === 'lines' || type === 'words' ? type : 'chars';
    var mask = opts.mask !== false;
    var lib = deps.SplitText && typeof deps.SplitText.create === 'function' && !opts.fallback;
    return lib ? splitLib(el, type, mask) : splitFallback(el, type, mask);
  };

  /* ---------------------------------------------------------------- effects */

  function containerFor(el) {
    var h = el && el.closest ? el.closest('[data-mk~="horizontal"]') : null;
    return h && h !== el && h.__mkTrack ? h.__mkTrack : null;
  }
  function toHorizontal(pos) {
    if (typeof pos !== 'string') return pos;
    return pos.replace(/^top\b/, 'left').replace(/^bottom\b/, 'right')
      .replace(/(\s)top\b/, '$1left').replace(/(\s)bottom\b/, '$1right');
  }
  /** Adds containerAnimation when `el` sits inside a pinned horizontal track. */
  function withContainer(el, vars) {
    var ca = !vars.containerAnimation && !vars.pin ? containerFor(el) : null;
    if (ca) {
      vars.containerAnimation = ca;
      vars.start = toHorizontal(vars.start || 'left 85%');
      if (vars.end) vars.end = toHorizontal(vars.end);
    }
    return vars;
  }
  MK.withContainer = withContainer;

  function makeHelpers(el, name, c, bag, ctx, opts) {
    var t = MK.t, dead = false;
    bag.push(function () { dead = true; });

    var o = {
      el: el, name: name, t: t, is: c, gsap: gsap, ST: ST, ctx: ctx, MK: MK,

      /** Option from opts object, then data-mk-<kebab-key>, else default. */
      opt: function (key, def) {
        if (opts && opts[key] !== undefined) return opts[key];
        var v = el.getAttribute('data-mk-' + kebab(key));
        return v === null ? def : parse(v);
      },
      ease: function (k) { k = k || 'out'; return t.ease[k] || k; },
      dur: function (k) { return typeof k === 'number' ? k : (t.dur[k] != null ? t.dur[k] : t.dur.m); },
      q: function (sel) { return el.querySelector(sel); },
      qa: function (sel) { return toArray(el.querySelectorAll(sel)); },
      alive: function () { return !dead; },

      /** addEventListener that is removed automatically on cleanup. */
      on: function (target, type, fn, options) {
        var tgt = typeof target === 'string' ? el.querySelector(target) : target;
        if (!tgt) return null;
        tgt.addEventListener(type, fn, options);
        bag.push(function () { tgt.removeEventListener(type, fn, options); });
        return fn;
      },
      cleanup: function (fn) { bag.push(fn); },

      /** Snapshot inline styles; on cleanup kill their tweens and restore the snapshot. */
      own: function (targets) {
        toArray(targets).forEach(function (n) {
          if (!n || !n.style) return;
          var css = n.style.cssText;
          bag.push(function () { gsap.killTweensOf(n); n.style.cssText = css; });
        });
      },

      split: function (target, type, sopts) {
        var s = MK.split(target || el, type, sopts);
        bag.push(s.revert);
        return s;
      },

      /**
       * Frame loop on the GSAP ticker. fn(dt seconds, time).
       * lopts.el → only runs while that element is near the viewport.
       * Returns a handle: { active, sleep(), wake() }.
       */
      loop: function (fn, lopts) {
        lopts = lopts || {};
        var state = { visible: !lopts.el, awake: true };
        var tick = function (time, deltaTime) {
          if (!state.visible || !state.awake) return;
          fn(Math.min((deltaTime || 16) / 1000, 0.05), time);
        };
        gsap.ticker.add(tick);
        var io = null;
        if (lopts.el && typeof IntersectionObserver !== 'undefined') {
          io = new IntersectionObserver(function (en) {
            state.visible = en[en.length - 1].isIntersecting;
            if (lopts.onToggle) lopts.onToggle(state.visible);
          }, { rootMargin: lopts.margin || '15% 0px' });
          io.observe(lopts.el);
        } else state.visible = true;
        bag.push(function () { gsap.ticker.remove(tick); if (io) io.disconnect(); });
        return {
          get active() { return state.visible && state.awake; },
          sleep: function () { state.awake = false; },
          wake: function () { state.awake = true; }
        };
      },

      /** ScrollTrigger.create with horizontal-container awareness. */
      trigger: function (vars) { return ST.create(withContainer(el, vars)); },

      /** Run fn after every ScrollTrigger refresh (layout re-measure). */
      onRefresh: function (fn) {
        ST.addEventListener('refresh', fn);
        bag.push(function () { ST.removeEventListener('refresh', fn); });
      },

      whenStart: function (on) {
        if (on === 'intro') return introState.promise;
        return Promise.resolve();
      },
      introDone: resolveIntro,

      /**
       * The shared entrance pattern: fromTo that plays on scroll (default), on load, or after the intro.
       * cfg: { on, delay, trigger, start, replay, scrollTrigger }
       * Options read from attributes: data-mk-on, data-mk-delay, data-mk-start, data-mk-replay.
       */
      reveal: function (targets, from, to, cfg) {
        cfg = cfg || {};
        targets = toArray(targets).filter(Boolean);
        if (!targets.length) return null;
        var on = cfg.on || o.opt('on', 'scroll');
        var delay = (to.delay || 0) + (cfg.delay != null ? cfg.delay : (o.opt('delay', 0) || 0));
        var vars = assignDeep({}, to);
        vars.delay = delay;
        var root = cfg.trigger || el;
        var tw;
        if (on === 'scroll') {
          var replay = cfg.replay != null ? cfg.replay : o.opt('replay', t.replay);
          vars.scrollTrigger = withContainer(root, assignDeep({
            trigger: root,
            start: cfg.start || o.opt('start', t.start),
            toggleActions: 'play none none none',
            once: !replay
          }, cfg.scrollTrigger || {}));
          tw = gsap.fromTo(targets, from, vars);
          if (replay) {
            // reset only once the element is fully below the viewport again, so it never vanishes in view
            ST.create(withContainer(root, { trigger: root, start: 'top bottom', onLeaveBack: function () { tw.pause(0); } }));
          }
        } else {
          vars.paused = true;
          tw = gsap.fromTo(targets, from, vars);
          if (el.__mkPlayed) tw.progress(1);          // a breakpoint rebuild must not replay the intro
          else o.whenStart(on).then(function () { if (!dead) { el.__mkPlayed = true; tw.play(); } });
        }
        // keyboard and screen-reader safety: anything that receives focus is shown immediately
        o.on(root, 'focusin', function () { if (tw.progress() < 1) tw.progress(1); });
        return tw;
      }
    };
    return o;
  }

  /**
   * Register an effect.
   *   MK.effect('line-rise', function (el, o) { ... return cleanup? }, { reduced: fn | 'same', intro: bool })
   * The setup runs inside gsap.matchMedia: everything it creates is reverted when the
   * reduced-motion preference or the breakpoint changes, then it runs again.
   */
  MK.effect = function (name, setup, meta) {
    meta = meta || {};
    registry[name] = {
      setup: setup,
      reduced: meta.reduced === 'same' ? setup : (meta.reduced || null),
      intro: !!meta.intro
    };
    return MK;
  };
  MK.effects = function () { return Object.keys(registry).sort(); };
  MK.has = function (name) { return !!registry[name]; };

  function namesOf(el, names) {
    if (Array.isArray(names)) return names;
    return String(names || el.getAttribute('data-mk') || '').split(/[\s,]+/).filter(Boolean);
  }

  function runOn(el, names, c, bag, ctx, opts) {
    names.forEach(function (name) {
      var def = registry[name];
      if (!def) { warn('Unknown effect "' + name + '" — is its effects file loaded?', el); return; }
      if (def.intro) introState.claimed = true;
      var fn = c.motion ? def.setup : def.reduced;
      if (!fn) return;
      var local = [];
      var o = makeHelpers(el, name, c, local, ctx, opts);
      try {
        var r = fn(el, o);
        if (typeof r === 'function') local.push(r);
      } catch (err) {
        if (typeof console !== 'undefined') console.error('[motion-kit] "' + name + '" failed on', el, err);
      }
      bag.push(function () { for (var i = local.length - 1; i >= 0; i--) { try { local[i](); } catch (e) { /* noop */ } } });
    });
    el.classList.add('mk-ready');
  }

  function cleanupAll(bag) { for (var i = bag.length - 1; i >= 0; i--) { try { bag[i](); } catch (e) { /* noop */ } } }

  /* Duplicate guard: each effect on an element belongs to the start()/apply() that claimed it first, until that
     one is stopped or reverted. A second start() over the same elements only applies what is not running yet. */
  function claim(el, names, owner) {
    var map = el.__mkClaims || (el.__mkClaims = {});
    return names.filter(function (n) {
      var c = map[n];
      if (c && c !== owner && c.live) return false;
      map[n] = owner;
      return true;
    });
  }

  /**
   * Apply effects to one element (used by React/Vue adapters and dynamic content).
   * names: 'line-rise' | ['line-rise','magnetic'] | null (read data-mk). Returns a revert function.
   * An effect already running on the element (from start() or another apply()) is not applied twice.
   */
  MK.apply = function (el, names, opts) {
    if (!MK.ready) MK.init();
    if (!gsap || !el) return function () {};
    var owner = { live: true };
    var all = namesOf(el, names), list = claim(el, all, owner);
    if (list.length < all.length) {
      warn('apply(): "' + all.filter(function (n) { return list.indexOf(n) < 0; }).join('", "') +
        '" already running on this element, not applied twice', el);
    }
    if (!list.length) return function () {};
    var mm = gsap.matchMedia();
    mm.add(conditions(), function (ctx) {
      var bag = [];
      runOn(el, list, normalize(ctx.conditions), bag, ctx, opts);
      MK.refresh();
      return function () { cleanupAll(bag); };
    });
    // no intro claimed by anything mounted in this tick → 'intro' reveals behave like 'load'
    setTimeout(function () { if (!introState.claimed) resolveIntro(); }, 0);
    markStarted();
    return function () { owner.live = false; mm.revert(); };
  };

  function markStarted() {
    MK.started = true;
    if (typeof window !== 'undefined' && window.__mkFailsafe) clearTimeout(window.__mkFailsafe);
    if (html) html.classList.remove('mk-failsafe');
    watchHeight();
  }

  var heightRO = null, lastH = 0;
  function watchHeight() {
    if (heightRO || typeof ResizeObserver === 'undefined' || !document.body) return;
    lastH = document.documentElement.scrollHeight;
    heightRO = new ResizeObserver(function () {
      var h = document.documentElement.scrollHeight;
      if (Math.abs(h - lastH) > 4) { lastH = h; MK.refresh(); }
    });
    heightRO.observe(document.body);
  }

  /**
   * Scan root (default: document) for [data-mk] and apply effects in DOM order.
   * Waits for web fonts (max config.fontTimeout ms) so text splits use final metrics.
   * Safe to call again, on the same or an overlapping root: effects that are already running are skipped, so
   * a second call only picks up new content. Returns a Promise that resolves with MK.
   */
  MK.start = function (rootEl, sopts) {
    if (!MK.ready) MK.init();
    sopts = sopts || {};
    var scope = rootEl || document;
    var job = { cancelled: false, live: true, mm: null };
    (scope.__mkJobs = scope.__mkJobs || []).push(job);
    return new Promise(function (resolve) {
      var fired = false;
      var go = function () {
        if (fired) return;
        fired = true;
        if (job.cancelled) { resolve(MK); return; }
        if (!gsap) { MK.started = true; resolve(MK); return; }
        var els = toArray(scope.querySelectorAll('[data-mk]'));
        if (scope.nodeType === 1 && scope.hasAttribute('data-mk')) els.unshift(scope);
        var plan = [], skipped = 0;
        els.forEach(function (el) {
          var all = namesOf(el), mine = claim(el, all, job);
          if (mine.length < all.length) skipped++;
          if (mine.length) plan.push({ el: el, names: mine });
        });
        if (skipped && MK.config.debug) {
          warn('start(): ' + skipped + ' element(s) already running under another start()/apply() were left as they are', scope);
        }
        var hasIntro = plan.some(function (p) {
          return p.names.some(function (n) { return registry[n] && registry[n].intro; });
        });
        var mm = gsap.matchMedia();
        mm.add(conditions(), function (ctx) {
          var c = normalize(ctx.conditions), bag = [];
          plan.forEach(function (p) { runOn(p.el, p.names, c, bag, ctx); });
          MK.refresh();
          return function () { cleanupAll(bag); };
        });
        job.mm = mm;
        starts.push(job);
        if ((!hasIntro && !introState.claimed) || MK.reduced) setTimeout(resolveIntro, 0);
        markStarted();
        resolve(MK);
      };
      var begin = function () {
        var fonts = sopts.waitFonts !== false && document.fonts && document.fonts.ready;
        if (fonts) {
          document.fonts.ready.then(go, go);
          setTimeout(go, MK.config.fontTimeout);
        } else go();
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', begin, { once: true });
      else begin();
    });
  };

  /**
   * Revert what start(root) applied (component unmount, SPA route change). Safe before start() has fired.
   * Only the start() calls made on this same root are reverted; elements inside it that a start() on an
   * outer root (or an apply()) is running are left to that call.
   */
  MK.stop = function (rootEl) {
    var scope = rootEl || document;
    (scope.__mkJobs || []).forEach(function (job) {
      job.cancelled = true;
      job.live = false;
      if (job.mm) {
        job.mm.revert();
        var i = starts.indexOf(job);
        if (i > -1) starts.splice(i, 1);
      }
    });
    scope.__mkJobs = [];
    MK.refresh();
  };

  /** Debounced ScrollTrigger refresh (sorted, so pins created out of order still measure correctly). */
  MK.refresh = function (now) {
    if (!ST) return;
    clearTimeout(refreshTimer);
    var run = function () { if (ST.sort) ST.sort(); ST.refresh(); };
    if (now === true) run();
    else refreshTimer = setTimeout(run, 120);
  };

  /** List what was applied (debugging / verification). */
  MK.inspect = function (rootEl) {
    return toArray((rootEl || document).querySelectorAll('[data-mk]')).map(function (el) {
      return { el: el, effects: namesOf(el), ready: el.classList.contains('mk-ready'), unknown: namesOf(el).filter(function (n) { return !registry[n]; }) };
    });
  };

  /** Revert everything start() applied and stop Lenis (SPA route teardown, tests). */
  MK.destroy = function () {
    starts.forEach(function (job) { job.cancelled = true; job.live = false; job.mm.revert(); });
    starts = [];
    if (typeof document !== 'undefined') {
      (document.__mkJobs || []).forEach(function (job) { job.cancelled = true; job.live = false; });   // not fired yet
      document.__mkJobs = [];
    }
    if (globalMM) globalMM.revert();
    globalMM = null;
    document.removeEventListener('click', onAnchor);
    if (heightRO) { heightRO.disconnect(); heightRO = null; }
    if (vel.on && gsap) { gsap.ticker.remove(velTick); vel.on = false; vel.v = 0; }
    MK.ready = false;
    MK.started = false;
  };

  /* ------------------------------------------------------------------ init */

  /**
   * MK.init(options)
   *   preset       'calm' | 'editorial' | 'liquid' | 'warm' | 'playful'  (default 'editorial')
   *   tokens       partial token overrides, e.g. { dur: { l: 1.3 } }
   *   smooth       true   — Lenis smooth wheel scrolling when Lenis is loaded
   *   lenis        Lenis options merged over the preset's
   *   anchors      true   — smooth in-page #anchor links
   *   anchorOffset 0      — number | CSS selector of a fixed header | function
   *   breakpoint   768    — desktop/mobile split for effects (o.is.desktop)
   *   reduced      undefined = follow the OS; true/false forces (also ?mk-reduce / ?mk-motion)
   *   fontTimeout  2500   — max ms start() waits for web fonts
   *   debug        false  — ScrollTrigger markers (also ?mk-debug)
   *   gsap, ScrollTrigger, Lenis, SplitText, CustomEase — pass modules when bundling
   */
  MK.init = function (opts) {
    if (MK.ready) return MK;
    opts = opts || {};
    if (typeof window === 'undefined' || typeof document === 'undefined') { warn('MK.init() must run in the browser.'); return MK; }
    html = document.documentElement;
    gsap = opts.gsap || window.gsap;
    ST = opts.ScrollTrigger || window.ScrollTrigger;
    if (!gsap || !ST) {
      warn('GSAP and ScrollTrigger are required — showing content without motion.');
      html.classList.remove('mk-motion');
      html.classList.add('mk-failsafe');
      return MK;
    }
    deps.Lenis = opts.Lenis !== undefined ? opts.Lenis : window.Lenis;
    deps.SplitText = opts.SplitText !== undefined ? opts.SplitText : window.SplitText;
    deps.CustomEase = opts.CustomEase !== undefined ? opts.CustomEase : window.CustomEase;
    var plugins = [ST];
    if (deps.SplitText) plugins.push(deps.SplitText);
    if (deps.CustomEase) plugins.push(deps.CustomEase);
    gsap.registerPlugin.apply(gsap, plugins);
    MK.gsap = gsap;
    MK.ScrollTrigger = ST;
    MK.SplitText = deps.SplitText || null;
    MK.CustomEase = deps.CustomEase || null;

    MK.config = {
      breakpoint: opts.breakpoint || 768,
      smooth: opts.smooth !== false,
      lenis: opts.lenis || null,
      anchors: opts.anchors !== false,
      anchorOffset: opts.anchorOffset || 0,
      reduced: opts.reduced,
      fontTimeout: opts.fontTimeout != null ? opts.fontTimeout : 2500,
      debug: !!opts.debug || /[?&]mk-debug\b/.test(query())
    };
    ST.config({ ignoreMobileResize: true });
    if (MK.config.debug) ST.defaults({ markers: true });
    setPreset(opts.preset || html.getAttribute('data-mk-preset') || 'editorial', opts.tokens);

    globalMM = gsap.matchMedia();
    globalMM.add(conditions(), function (ctx) {
      var c = normalize(ctx.conditions);
      MK.reduced = c.reduce;
      MK.is = c;
      html.classList.toggle('mk-motion', c.motion);
      html.classList.toggle('mk-reduce', c.reduce);
      if (c.motion && MK.config.smooth) startLenis();
      if (c.reduce) resolveIntro();
      return function () { stopLenis(); };
    });

    if (MK.config.anchors) document.addEventListener('click', onAnchor);
    window.addEventListener('load', function () { MK.refresh(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { MK.refresh(); });

    MK.ready = true;
    return MK;
  };

  /** Switch preset at runtime (re-run start() afterwards to rebuild effects with the new tokens). */
  MK.setPreset = function (name, overrides) { if (html) setPreset(name, overrides); return MK.t; };

  /** Register a cubic-bezier ease ('x1,y1,x2,y2') when CustomEase is loaded; otherwise return the fallback name. */
  MK.customEase = function (name, curve, fallback) {
    if (deps.CustomEase) { try { deps.CustomEase.create(name, curve); return name; } catch (e) { /* noop */ } }
    return fallback;
  };

  return MK;
});
