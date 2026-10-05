# Motion personalities (presets)

A preset is the measured motion vocabulary of one audited site: its eases, durations, staggers, reveal
trigger point, whether reveals replay, and its smooth-scroll feel. Pick **one per project**. Effects read
tokens from the preset, so the same `line-rise` feels heavy and slow under `calm` and snappy under `playful`.

```js
MK.init({ preset: 'liquid' });                                  // pick one
MK.init({ preset: 'editorial', tokens: { dur: { l: 1.3 } } });  // nudge a token
```
`MK.t` exposes the active tokens to your own code; CSS gets `--mk-ease-out`, `--mk-ease-inout`,
`--mk-ease-pop`, `--mk-dur-xs … --mk-dur-xl` (use them in your hover transitions so CSS matches JS).

## Quick chooser

| Preset | Feels like | Choose for | Origin |
|---|---|---|---|
| `calm` — Architectural Calm | Slow, weighty, cinematic; long expo-out settles; nothing bounces | Architecture, real estate, hotels, luxury, galleries, portfolios | nova + Solenne |
| `editorial` — Editorial Mask | Crisp magazine reveals; text rises from masks; small springy accents | Food & drink brands, D2C, studios, magazines, most landing pages (**default**) | Oval |
| `liquid` — Liquid Gloss | One long-tailed ease everywhere: slow start, committed middle, soft landing; depth via blur | Beauty, skincare, wellness, fashion, premium tech | Dewpoint |
| `warm` — Warm Physical | Physical and tactile; springs, lerped followers, ambient loops; reveals replay | Restaurants, food delivery, crafts, events, music | Ember |
| `playful` — Playful Candy | Squash, overshoot and elastic everywhere; confetti; fast | Kids, candy, games, toys, youthful consumer brands | Fizzy Fjord |

Signals in the project → recommended preset: serif display type + lots of white space → `calm`;
bold grotesk + flat colour blocks → `editorial`; pastel/glossy product shots → `liquid`; dark warm palette,
photography of food or people → `warm`; saturated colours, rounded shapes, emoji → `playful`.

## Token table

| Token | calm | editorial | liquid | warm | playful |
|---|---|---|---|---|---|
| `ease.out` | (.16,1,.3,1) expo-out | (.25,1,.5,1) quart-out | (.625,.05,0,1) | (.22,1,.36,1) quint-out | (.25,1,.5,1) |
| `ease.text` (line/word masks) | (.16,1,.3,1) | (.22,1,.36,1) power4-like | (.17,.17,0,1) "rise" | (.22,1,.36,1) | (.25,1,.5,1) |
| `ease.inOut` (wipes, pins) | (.75,0,.25,1) | (.76,0,.24,1) | (.625,.05,0,1) | (.76,0,.24,1) | (.625,.05,0,1) "toffee" |
| `ease.pop` | no overshoot | `back.out(2)` | (.6,0,0,1) | `back.out(1.6)` | `back.out(1.7)` |
| `ease.elastic` | power3.out | `back.out(2.4)` | (.625,.05,0,1) | `elastic.out(1,.55)` | `elastic.out(1,.4)` |
| `dur` xs / s / m / l / xl (s) | .3 / .6 / 1.15 / 1.5 / 2.4 | .25 / .5 / .9 / 1.1 / 1.6 | .3 / .5 / 1 / 1.3 / 1.6 | .2 / .45 / .9 / 1.2 / 1.9 | .12 / .35 / .8 / 1.1 / 1.5 |
| `stagger` chars / words / lines / items | .04 / .06 / .1 / .12 | .03 / .05 / .1 / .12 | .045 / .07 / .12 / .08 | .03 / .06 / .08 / .1 | .02 / .05 / .12 / .08 |
| `rise` (px for fade-ups) | 26 | 30 | 18 | 34 | 40 |
| `start` (reveal trigger) | `top 88%` | `top 85%` | `top 80%` | `top 85%` | `top 85%` |
| `replay` (reveals replay) | yes | no | no | yes | no |
| Lenis | duration 1.25, expo easing | duration 1.15 | lerp 0.1 | lerp 0.1 | lerp 0.1 |
| CSS `--mk-ease-pop` | (.16,1,.3,1) | (.2,1.3,.4,1) | (.6,0,0,1) | (.34,1.56,.64,1) | (.34,1.56,.64,1) |

Without CustomEase loaded, curves fall back to the nearest built-in GSAP ease (expo.out, power3.out…).

## Signature combinations per preset

Use these as starting points when proposing options (IDs from `catalog.md`).

**calm (nova + Solenne)**
- Intro: I1 intro-window or I2 intro-arch. Hero: S1 hero-exit (layered depth + push-in) + T1 line-rise on intro (or T3 char-flip for a wordmark).
- Statement: T6 scroll-fill. Images: M1 clip-reveal from the bleed edge + M2 parallax. Story: S4 pin-crossfade, S7 horizontal, S3 depth-layers, M5 grow-inline.
- Details: U4 cursor with labels, U5 magnetic CTA, M8 lightbox, M7 velocity-skew, T8 write-on accents, S13 handoff into the footer.
- Avoid: confetti, elastic pops, letter-drop.

**editorial (Oval)**
- Hero: T1 line-rise on load + M6 zoom-through (dive through a brand shape) or M4 window-grow at the CTA.
- Sections: T1 headings, C1 stagger-up fades, T11 rule-draw dividers, S12 sticky-stats, C2 card-rise for products.
- Story: S5 pin-steps with snap. Social proof: C7 marquee with velocity, C9 rating, C1 with `tilt`.
- Footer: T13 wordmark-rise. Details: U2 nav-state, small `pop` badges.
- Avoid: heavy blur effects, grain.

**liquid (Dewpoint)**
- Intro: I3 intro-drop. Hero: T12 text-path ribbon + M3 settle on the product + S1 hero-exit (0.75× parallax).
- Text: T5 focus-in for one statement, T1 line-rise (ease `rise`), letter-level C-style name rolls.
- Products: C5 orbit (depth of field). Story: S6 sticky-steps (photos open from centre), M1 clip-reveal `from=center` scrubbed for a wide image.
- Lists: S8 stack-accordion; U4 cursor "Open" over cards; C7 two marquees in opposite directions.
- Avoid: bouncy pops, confetti.

**warm (Ember)**
- Intro: I4 intro-curtain. Hero: T2 word-rise + T10 word-cycle ticker + U7 grain + U4 cursor.
- Menu/lists: C3 hover-preview, K9 row hover wipe. Text: T6 scroll-fill manifesto, T9 count-up stats.
- Story: S11 sequence-build (ticket + stamp). Band: C7 marquee with velocity. Buttons: U6 fill-bloom.
- Advanced (optional): A1 fire type, A2 floating 3D ingredients, A3 cloth, A4 wind cards.
- Avoid: long pinned horizontal tracks (too cool for this tone).

**playful (Fizzy Fjord)**
- Hero: T4 blur-rise + floating objects (A2 or images with S2 drift) + S14 cloud-curtain into the next section.
- Text: T7 letter-drop with fizz. Cards: U8 tilt + sheen, C6 drag-carousel, S10 card-stack, S9 scroll-accordion.
- Commerce: U11 fly-to-cart, U10 elastic-pop, U9 confetti on buttons, K2 press squash.
- Social: C8 pendulum line. Footer: U12 follow-sticker + T13 wordmark-rise with `fit`.
- Avoid: long slow 2 s+ reveals.

## Motion density

| Density | Pinned set pieces | Reveals | Ambient loops |
|---|---|---|---|
| Restrained | 0–1 | headings + key images | none |
| Rich (default) | 2–3 | most sections | 1 (marquee/ticker) |
| Maximal | 4+ (keep ≤ 5) | everything | several + cursor/grain |

Even at Maximal: one intro, one heavy shader/canvas effect, one zoom-through or cloud-curtain per page.
