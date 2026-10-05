/*!
 * motion-kit · effects/text.js
 * line-rise · word-rise · char-flip · blur-rise · focus-in · scroll-fill · letter-drop
 * write-on · count-up · word-cycle · rule-draw · wordmark-rise · text-path
 * Load after motion-core.js. In a bundler: import registerText from './effects/text'; registerText(MK).
 */
(function (root, register) {
  if (typeof module === 'object' && module.exports) module.exports = register;
  else if (root && root.MK) register(root.MK);
  else if (typeof console !== 'undefined') console.warn('[motion-kit] Load motion-core.js before effects/text.js');
})(typeof window !== 'undefined' ? window : this, function (MK) {
  'use strict';
  var SVG = 'http://www.w3.org/2000/svg';

  function unsplitWhenDone(tw, sp, o) {
    if (!tw || o.opt('replay', o.t.replay) || o.opt('unsplit', true) === false) return;
    if (tw.progress() === 1) { sp.revert(); return; }     // a rebuild after the intro already played: done at once
    tw.eventCallback('onComplete', function () { sp.revert(); });
  }

  /* T1 · Masked line rise (Oval, Solenne, nova) — each visual line slides up out of its own mask */
  MK.effect('line-rise', function (el, o) {
    var sp = o.split(el, 'lines');
    var tw = o.reveal(sp.targets, { yPercent: o.opt('distance', 110) }, {
      yPercent: 0,
      duration: o.dur(o.opt('duration', 'l')),
      ease: o.ease(o.opt('ease', 'text')),
      stagger: sp.stagger(o.opt('stagger', o.t.stagger.lines))
    });
    unsplitWhenDone(tw, sp, o);
  });

  /* T2 · Masked word rise (Ember) — every word rises from its own mask */
  MK.effect('word-rise', function (el, o) {
    var sp = o.split(el, 'words');
    var tw = o.reveal(sp.words, { yPercent: o.opt('distance', 110) }, {
      yPercent: 0,
      duration: o.dur(o.opt('duration', 'l')),
      ease: o.ease(o.opt('ease', 'text')),
      stagger: o.opt('stagger', o.t.stagger.words)
    });
    unsplitWhenDone(tw, sp, o);
  });

  /* T3 · Character flip (Solenne) — axis y: letters turn in edge-on; axis x: letters hinge up from flat */
  MK.effect('char-flip', function (el, o) {
    var axis = o.opt('axis', 'y');
    var persp = o.opt('perspective', 600);
    var sp = o.split(el, 'chars', { mask: false });
    var from = axis === 'x'
      ? { opacity: 0, rotateX: 90, x: function () { return window.innerWidth * 0.1 * o.opt('slide', 0.6); }, transformOrigin: '50% 100%', transformPerspective: persp }
      : { opacity: 0, yPercent: 50, rotateY: 90, transformPerspective: persp };
    var tw = o.reveal(sp.chars, from, {
      opacity: 1, yPercent: 0, x: 0, rotateX: 0, rotateY: 0,
      duration: o.dur(o.opt('duration', 'l')),
      ease: o.ease(o.opt('ease', 'out')),
      stagger: o.opt('stagger', axis === 'x' ? o.t.stagger.chars * 2.5 : o.t.stagger.chars)
    });
    unsplitWhenDone(tw, sp, o);
  });

  /* T4 · Blur rise (Fizzy Fjord hero) — lines (or words) rise out of a blur, no mask */
  MK.effect('blur-rise', function (el, o) {
    var by = o.opt('by', 'lines') === 'words' ? 'words' : 'lines';
    var sp = o.split(el, by, { mask: false });
    var tw = o.reveal(sp.targets, { yPercent: o.opt('distance', 40), opacity: 0, filter: 'blur(' + o.opt('blur', 10) + 'px)' }, {
      yPercent: 0, opacity: 1, filter: 'blur(0px)',
      duration: o.dur(o.opt('duration', 'l')),
      ease: o.ease(o.opt('ease', 'out')),
      stagger: sp.stagger(o.opt('stagger', o.t.stagger[by])),
      clearProps: 'filter'
    });
    unsplitWhenDone(tw, sp, o);
  });

  /* T5 · Focus-in (Dewpoint) — words shrink from 2× while un-blurring. Short headings only (filter is costly). */
  MK.effect('focus-in', function (el, o) {
    var sp = o.split(el, 'words', { mask: false });
    var tw = o.reveal(sp.words, { scale: o.opt('scale', 2), opacity: 0, filter: 'blur(' + o.opt('blur', 8) + 'px)' }, {
      scale: 1, opacity: 1, filter: 'blur(0px)',
      duration: o.dur(o.opt('duration', 'l')),
      ease: o.ease(o.opt('ease', 'out')),
      stagger: o.opt('stagger', o.t.stagger.words),
      clearProps: 'filter'
    });
    unsplitWhenDone(tw, sp, o);
  });

  /* T6 · Scroll fill (nova, Ember manifesto) — dim words light up in reading order as you scroll */
  MK.effect('scroll-fill', function (el, o) {
    var sp = o.split(el, 'words', { mask: false });
    o.gsap.fromTo(sp.words, { opacity: o.opt('from', 0.15) }, {
      opacity: 1, ease: 'none', stagger: 1, duration: 1,
      scrollTrigger: MK.withContainer(el, {
        trigger: el,
        start: o.opt('start', 'top 85%'),
        end: o.opt('end', '+=90%'),
        scrub: o.opt('scrub', 0.5)
      })
    });
  });

  /* T7 · Letter drop (Fizzy Fjord kingdom) — letters fall into place in random order out of a blur */
  MK.effect('letter-drop', function (el, o) {
    var gs = o.gsap;
    var sp = o.split(el, 'chars', { mask: false });
    var fizz = !!o.opt('fizz', false);
    var each = function () {
      if (!fizz || !MK.confetti) return;
      var r = this.targets()[0].getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight) {
        MK.confetti(r.left + r.width / 2, r.bottom - r.height * 0.12, { count: 8, speed: 3.2, size: 2.8, spread: Math.PI * 1.3 });
      }
    };
    var from = { opacity: 0, yPercent: -o.opt('distance', 55), filter: 'blur(' + o.opt('blur', 10) + 'px)' };
    var to = { opacity: 1, yPercent: 0, filter: 'blur(0px)', ease: 'power1.out' };
    if (o.opt('scrub', true) !== false) {
      var pin = !!o.opt('pin', false);
      var host = pin ? (el.closest('section') || el.parentElement) : el;
      var st = pin
        ? { trigger: host, start: 'top top', end: '+=' + o.opt('length', 200) + '%', pin: true, scrub: true, anticipatePin: 1 }
        : { trigger: el, start: o.opt('start', 'top 85%'), end: o.opt('end', 'bottom 35%'), scrub: true };
      var tl = gs.timeline({ scrollTrigger: MK.withContainer(el, st) });
      tl.fromTo(sp.chars, from, Object.assign({}, to, { duration: 1, stagger: { each: 0.078, from: 'random', onComplete: each } }));
      if (pin) tl.to({}, { duration: 0.4 });
      return;
    }
    o.reveal(sp.chars, from, Object.assign({}, to, {
      duration: o.dur(o.opt('duration', 'm')),
      stagger: { each: o.opt('stagger', 0.035), from: 'random', onComplete: each }
    }));
  });

  /* T8 · Write-on (Solenne italic accents) — a clip wipe "writes" the line left to right */
  MK.effect('write-on', function (el, o) {
    o.own(el);
    if (getComputedStyle(el).display === 'inline') el.style.display = 'inline-block';
    var rtl = o.opt('direction', 'ltr') === 'rtl';
    var hidden = rtl ? 'inset(-20% 0% -20% 100%)' : 'inset(-20% 100% -20% 0%)';
    o.reveal(el, { clipPath: hidden, opacity: o.opt('fade', true) ? 0 : 1 }, {
      clipPath: 'inset(-20% 0% -20% 0%)', opacity: 1,
      duration: o.dur(o.opt('duration', 'xl')),
      ease: o.ease(o.opt('ease', 'out'))
    });
  });

  /* T9 · Count-up (Ember stats, Oval rating) — reads the final number from the text itself */
  MK.effect('count-up', function (el, o) {
    var raw = el.textContent.trim();
    var m = raw.match(/-?\d[\d,.]*/);
    if (!m) return;
    var numStr = m[0].replace(/[.,]$/, '');
    var prefix = raw.slice(0, m.index), suffix = raw.slice(m.index + numStr.length);
    var clean = numStr.replace(/,/g, '');
    var to = o.opt('to', parseFloat(clean));
    var dec = o.opt('decimals', (clean.split('.')[1] || '').length);
    var pad = o.opt('pad', 0), from = o.opt('from', 0);
    var group = o.opt('group', /,/.test(numStr));
    var fmt = function (v) {
      var s = group
        ? Number(v).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })
        : Number(v).toFixed(dec);
      if (pad) s = s.padStart(pad, '0');
      return prefix + s + suffix;
    };
    var original = el.innerHTML;
    o.own(el);
    var live = document.createElement('span');
    live.setAttribute('aria-hidden', 'true');
    var sr = document.createElement('span');
    sr.className = 'mk-sr';
    sr.textContent = raw;
    el.textContent = '';
    el.appendChild(live);
    el.appendChild(sr);
    el.style.fontVariantNumeric = 'tabular-nums';
    o.cleanup(function () { el.innerHTML = original; });
    var state = { v: from };
    live.textContent = fmt(from);
    o.reveal(state, { v: from }, {
      v: to,
      duration: o.dur(o.opt('duration', 'xl')),
      ease: o.ease(o.opt('ease', 'out')),
      onUpdate: function () { live.textContent = fmt(state.v); }
    }, { trigger: el });
  });

  /* T10 · Word cycle (Ember live ticker) — rotating words slide up through a mask that resizes to fit */
  MK.effect('word-cycle', function (el, o) {
    var gs = o.gsap, t = o.t;
    var words = String(o.opt('words', '')).split('|').map(function (s) { return s.trim(); }).filter(Boolean);
    var first = el.textContent.trim();
    if (first && words.indexOf(first) < 0) words.unshift(first);
    if (words.length < 2) return;
    var original = el.innerHTML;
    o.own(el);
    el.textContent = '';
    el.classList.add('mk-cycle');
    var item = document.createElement('span');
    item.className = 'mk-cycle-item';
    item.setAttribute('aria-hidden', 'true');
    item.textContent = first || words[0];
    var sr = document.createElement('span');
    sr.className = 'mk-sr';
    sr.textContent = words.join(', ');
    el.appendChild(item);
    el.appendChild(sr);
    o.cleanup(function () { el.innerHTML = original; el.classList.remove('mk-cycle'); });

    var i = Math.max(0, words.indexOf(item.textContent)), visible = true, timer = null, tl = null, stale = false;
    var interval = o.opt('interval', 3.2);
    // the slot is as wide as the current word: re-measured on every refresh (resize, layout change) and when
    // late fonts arrive; during a swap it waits until the new word has landed
    function fit() {
      if (tl && tl.isActive()) { stale = true; return; }
      stale = false;
      gs.set(el, { width: item.offsetWidth });
    }
    fit();
    o.ST.addEventListener('refreshInit', fit);
    o.cleanup(function () { o.ST.removeEventListener('refreshInit', fit); });
    if (document.fonts) o.on(document.fonts, 'loadingdone', fit);
    function next() {
      if (!o.alive()) return;
      if (!visible) { timer = gs.delayedCall(0.6, next); return; }
      i = (i + 1) % words.length;
      tl = gs.timeline({ onComplete: function () {
        if (!o.alive()) return;
        tl = null;
        if (stale) fit();
        timer = gs.delayedCall(interval, next);
      } });
      tl.to(item, { yPercent: -115, opacity: 0, duration: t.dur.s * 0.8, ease: o.ease('inOut') })
        .add(function () { item.textContent = words[i]; })
        .to(el, { width: function () { return item.offsetWidth; }, duration: t.dur.s, ease: o.ease('out') })
        .fromTo(item, { yPercent: 115, opacity: 0 }, { yPercent: 0, opacity: 1, duration: t.dur.s * 1.1, ease: o.ease('out') }, '<');
    }
    o.trigger({ trigger: el, start: 'top bottom', end: 'bottom top', onToggle: function (s) { visible = s.isActive; } });
    timer = gs.delayedCall(interval, next);
    o.cleanup(function () { if (timer) timer.kill(); if (tl) tl.kill(); });
  });

  /* T11 · Rule draw (Oval rows, nova steps) — a hairline draws itself in */
  MK.effect('rule-draw', function (el, o) {
    var axis = o.opt('axis', 'x') === 'y' ? 'scaleY' : 'scaleX';
    var from = { transformOrigin: o.opt('origin', axis === 'scaleX' ? '0% 50%' : '50% 0%') };
    var to = { duration: o.dur(o.opt('duration', 'l')), ease: o.ease(o.opt('ease', 'inOut')) };
    from[axis] = 0;
    to[axis] = 1;
    o.reveal(el, from, to);
  });

  /* T13 · Wordmark rise (Oval footer, Fizzy Fjord footer) — a giant wordmark climbs out of per-letter masks,
     scrubbed so the last letter lands exactly at the end of the page. data-mk-fit sizes it to the full width. */
  MK.effect('wordmark-rise', function (el, o) {
    var gs = o.gsap;
    o.own(el);
    if (o.opt('fit', false)) {
      // layout widths (offsetWidth) ignore transforms, so a scaled ancestor cannot skew the fit
      var fit = function () {
        var d = el.style.display, w0 = el.style.width, ws = el.style.whiteSpace;
        el.style.fontSize = '100px';
        el.style.display = 'inline-block';
        el.style.width = 'auto';
        el.style.whiteSpace = 'nowrap';
        var w = el.offsetWidth;
        el.style.display = d;
        el.style.width = w0;
        el.style.whiteSpace = ws || 'nowrap';
        var avail = el.clientWidth;
        if (w && avail) el.style.fontSize = (100 * avail / w * 0.985).toFixed(2) + 'px';
      };
      fit();
      o.ST.addEventListener('refreshInit', fit);
      o.cleanup(function () { o.ST.removeEventListener('refreshInit', fit); });
    }
    var sp = o.split(el, 'chars', { mask: true });
    var scrub = o.opt('scrub', 0.6);
    if (scrub === false) {
      o.reveal(sp.chars, { yPercent: 100 }, { yPercent: 0, duration: o.dur(o.opt('duration', 'l')), ease: o.ease('text'), stagger: o.opt('stagger', o.t.stagger.chars * 2) });
      return;
    }
    var trig = o.opt('trigger', null) ? document.querySelector(o.opt('trigger')) : (el.closest('footer') || el);
    gs.fromTo(sp.chars, { yPercent: 100 }, {
      yPercent: 0, ease: 'none', duration: 0.5, stagger: 0.15,
      scrollTrigger: MK.withContainer(trig, { trigger: trig, start: o.opt('start', 'top bottom'), end: o.opt('end', 'clamp(bottom bottom)'), scrub: scrub === true ? 0.6 : scrub })
    });
  });

  /* T12 · Text on a path (Dewpoint ribbon) — text crawls along an SVG path, faster with scroll speed */
  function buildTextPath(el, o) {
    var path = el.querySelector('path');
    if (!path) return null;
    if (!path.id) path.id = 'mk-path-' + Math.random().toString(36).slice(2, 8);
    var unit = String(o.opt('text', 'MOTION · KIT · ')).replace(/\s+$/, '') + '   ';
    var text = document.createElementNS(SVG, 'text');
    text.setAttribute('class', 'mk-tp-text');
    text.setAttribute('aria-hidden', 'true');
    if (o.opt('size', null)) text.style.fontSize = o.opt('size') + 'px';
    var tp = document.createElementNS(SVG, 'textPath');
    tp.setAttribute('href', '#' + path.id);
    tp.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#' + path.id);
    text.appendChild(tp);
    var meas = document.createElementNS(SVG, 'text');
    meas.setAttribute('class', 'mk-tp-text');
    meas.setAttribute('aria-hidden', 'true');
    meas.style.visibility = 'hidden';
    if (text.style.fontSize) meas.style.fontSize = text.style.fontSize;
    el.appendChild(text);
    el.appendChild(meas);
    var api = { path: path, tp: tp, unitLen: 100, pathLen: 1 };
    api.build = function () {
      meas.textContent = unit;
      api.unitLen = meas.getComputedTextLength() || 100;
      api.pathLen = path.getTotalLength();
      var reps = Math.ceil(api.pathLen / api.unitLen) + 2;
      tp.textContent = new Array(reps + 1).join(unit);
    };
    api.remove = function () { if (text.parentNode) text.parentNode.removeChild(text); if (meas.parentNode) meas.parentNode.removeChild(meas); };
    api.build();
    o.cleanup(api.remove);
    o.onRefresh(api.build);
    return api;
  }
  MK.effect('text-path', function (el, o) {
    var api = buildTextPath(el, o);
    if (!api) return;
    var speed = o.opt('speed', 60), k = o.opt('boost', 0.3), dir = o.opt('direction', -1) < 0 ? -1 : 1;
    var offset = 0, boost = 0;
    o.loop(function (dt) {
      boost = MK.damp(boost, MK.velocity() * k, 5, dt);
      offset += dir * (speed + boost) * dt;
      var u = api.unitLen;
      while (offset <= -u) offset += u;
      while (offset > 0) offset -= u;
      api.tp.setAttribute('startOffset', offset.toFixed(2));
    }, { el: el });
    if (o.opt('draw', false)) {
      var L = api.path.getTotalLength();
      o.reveal(api.path, { strokeDasharray: L + ' ' + L, strokeDashoffset: L }, {
        strokeDashoffset: 0, duration: o.dur('xl'), ease: o.ease('out'), clearProps: 'strokeDasharray,strokeDashoffset'
      }, { on: o.opt('on', 'load') });
    }
  }, { reduced: function (el, o) { buildTextPath(el, o); } });
});
