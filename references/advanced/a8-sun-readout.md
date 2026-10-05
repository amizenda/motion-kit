# A8 · Live sun readout — reference code

A tiny line in the nav or footer such as "Sun over Altea 23.4° · setting", with a dot that rises and sinks over a horizon line. It also writes tonight's sunset time into the copy. This is content, not motion, and it is only worth it when the brand is about place and light.
Origin: Solenne. Dependencies: none (a low-precision solar position, ±0.5°, plus `Intl.DateTimeFormat`).
Wrap it as `MK.effect('sun-readout', (el, o) => { … })` (section 3). A 30 s interval, cleared with `o.cleanup`, does the updating, so `o.loop` is not needed. It runs the same under reduced motion; only the dot's CSS transition goes. If JS is off, the static fallback is the markup's own text.

---

## 1 · Markup and CSS

```html
<p class="sunread" data-mk="sun-readout" data-mk-place="Altea" data-mk-lat="38.598" data-mk-lon="-0.051"
   data-mk-time-zone="Europe/Madrid" aria-live="off" title="Solar elevation computed from your clock">
  <svg class="sunread__glyph" viewBox="0 0 26 14" aria-hidden="true"><path d="M1 12.5h24"/><circle class="sunread__dot" cx="13" cy="8" r="3.2"/></svg>
  <span class="sunread__txt">Sun over Altea</span>
</p>
<!-- anywhere else on the page -->
<p>Tonight the sun sets at <span class="js-sunset">21:05</span></p>
```

```css
.sunread{display:flex;align-items:center;gap:.6vw;font-weight:500;font-size:max(.62vw,9px);letter-spacing:.16em;
  text-transform:uppercase;opacity:.9;font-variant-numeric:tabular-nums}
.sunread__glyph{width:26px;height:14px;overflow:visible}
.sunread__glyph path{stroke:currentColor;stroke-width:1}
.sunread__dot{fill:currentColor;transition:cy 1s}             /* cy as a CSS property: Chromium/Firefox; Safari jumps */
@media (prefers-reduced-motion:reduce){.sunread__dot{transition:none}}
```

## 2 · The calculation

```js
/* Solar elevation in degrees for a date at { lat, lon } (east positive).
   Low-precision almanac formulas: mean anomaly g, ecliptic longitude L, obliquity e,
   right ascension / declination, sidereal time → hour angle → altitude. Good to about ±0.5°. */
function sunElevation(date, lat, lon){
  const rad = Math.PI / 180, d = date.getTime() / 86400000 + 2440587.5 - 2451545.0   // days since J2000
  const g = (357.529 + 0.98560028 * d) * rad, q = 280.459 + 0.98564736 * d
  const L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * rad, e = (23.439 - 0.00000036 * d) * rad
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)), dec = Math.asin(Math.sin(e) * Math.sin(L))
  const gmst = (18.697374558 + 24.06570982441908 * d) % 24
  const ha = ((gmst * 15 + lon) * rad) - ra, la = lat * rad
  return Math.asin(Math.sin(la) * Math.sin(dec) + Math.cos(la) * Math.cos(dec) * Math.cos(ha)) / rad
}

/* Tonight's sunset: the first minute after local solar noon when the sun's centre drops below −0.83°
   (refraction + the disc's radius). Solar noon in UTC ≈ 12 h − lon/15. Returns null in polar day. */
function sunsetAfterNoon(day, lat, lon){
  const t = new Date(day); t.setUTCHours(0, 0, 0, 0)
  const noon = t.getTime() + (12 - lon / 15) * 3600000
  for (let i = 0; i < 12 * 60; i++){ const s = new Date(noon + i * 60000); if (sunElevation(s, lat, lon) < -0.83) return s }
  return null
}

function sunReadout(root, { lat, lon, place = 'here', timeZone, locale = 'en-GB', sunsetSel = '.js-sunset' }){
  const txt = root.querySelector('.sunread__txt'), dot = root.querySelector('.sunread__dot')
  const fmt = dt => {
    try { return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone }).format(dt) }
    catch (e) { return dt.toTimeString().slice(0, 5) }
  }
  const tick = () => {
    const now = new Date(), el = sunElevation(now, lat, lon)
    const rising = sunElevation(new Date(now.getTime() + 60000), lat, lon) > el
    if (txt) txt.textContent = el > -0.83
      ? `Sun over ${place} ${el.toFixed(1)}° · ${rising ? 'rising' : 'setting'}`
      : `Sun below the horizon · ${el.toFixed(1)}°`
    // dot: cy 11 at 0°, up to 3.5 at ~67°, down to 15 (under the 12.5 horizon line) at −36°
    if (dot) dot.setAttribute('cy', String(Math.max(3.5, Math.min(15, 11 - el / 9))))
  }
  tick()
  const id = setInterval(tick, 30000)
  const ss = sunsetAfterNoon(new Date(), lat, lon)
  if (ss) document.querySelectorAll(sunsetSel).forEach(n => { n.textContent = fmt(ss) })
  return () => clearInterval(id)
}
```

## 3 · motion-kit wrapper

```js
MK.effect('sun-readout', (el, o) => {
  const stop = sunReadout(el, {
    lat: o.opt('lat', 38.598), lon: o.opt('lon', -0.051),
    place: o.opt('place', 'Altea'), timeZone: o.opt('timeZone', undefined),
  })
  o.cleanup(stop)
}, { reduced: 'same' })                                         // content, not motion: identical under reduced motion
```

Stop the interval while the tab is hidden if you like; at 30 s it hardly matters. Copy such as "Sun below the Sierra" should name the brand's actual skyline.
