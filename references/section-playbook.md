# Section playbook — what to offer for each section

Use this to turn a section inventory into **2–3 concrete options per section** for the picker. Each option is a
*combo* (what happens to the heading, the media and the rest), named in plain words, with effect IDs in the
description. Pick the column that matches the chosen preset; fall back to the "any" column.

## 1 · Classify each section

| Type | Recognise it by |
|---|---|
| `nav` | `<header>`/`<nav>` fixed or sticky at the top |
| `intro` | none in markup — offered once per site, before the hero |
| `hero` | first section; big headline, hero image/video, primary CTA |
| `statement` | a single large paragraph or quote, few or no images |
| `heading` | a section title (+ eyebrow/lede) above other content |
| `features` | 3–6 items with icon/title/text, or alternating text–image rows |
| `stats` | numbers (%, ×, years, counts) |
| `gallery` | 3+ images, masonry/grid, portfolio |
| `products` | cards with image, name, price, button |
| `showcase` | one product range to browse (5–9 items), "choose your…" |
| `steps` | numbered process / how it works / timeline / ritual |
| `journey` | locations, chapters, case studies meant to be travelled through |
| `testimonials` | quotes, reviews, press logos, ratings |
| `media-moment` | one full-bleed image or video meant to make an impression |
| `pricing` / `faq` | plans, accordions — keep motion minimal |
| `cta` | closing call to action, newsletter, contact |
| `footer` | links, address, big wordmark |
| `global` | site-wide extras: smooth scroll, cursor, grain, progress, buttons |

## 2 · Options per section type

Effect IDs refer to `catalog.md`. **Bold** = recommended first option for that preset.

### nav
| any | Options |
|---|---|
| A | **U2 nav-state** (scrolled + dark/light theme swap over `data-mk-theme` sections) |
| B | U1 nav-hide + U2 nav-state (hides on scroll down — good for long pages, Dewpoint) |
| C | static (no motion) |

### intro (ask once, globally)
| calm | editorial | liquid | warm | playful |
|---|---|---|---|---|
| **I1 window** · I2 arch · none | **none** (hero text rise on load) · I1 window | **I3 drop** · none | **I4 curtain** · none | **none** · I4 curtain (recolour) |

Recommend **none** unless the brand is cinematic or the client asked for a loader: intros delay content.

### hero
| Preset | Option A (recommended) | Option B | Option C |
|---|---|---|---|
| calm | T1 line-rise (on intro) + S1 hero-exit with depth layers & push-in | T3 char-flip wordmark + M3 settle image + S1 | I1 window intro + T1 + U5 magnetic CTA |
| editorial | T1 line-rise (on load, staggered with delay) + C1 for side copy + M6 zoom-through below the fold | T1 + S1 hero-exit (copy lifts, image pushes in) | T2 word-rise + M1 clip-reveal image |
| liquid | T12 text-path ribbon + M3 settle product + S1 (media 0.75× parallax) | T5 focus-in + M1 `from=circle` | T1 (ease rise) + S1 |
| warm | T2 word-rise + T10 word-cycle ticker + U7 grain + U4 cursor | T1 + S1 hero-exit (sink + fade) | A1 fire type / A2 3D objects (advanced, custom build) |
| playful | T4 blur-rise + S2 drift floating objects + S14 cloud-curtain after the hero | T7 letter-drop + U9 confetti CTA | A2 3D objects (advanced) |

### statement
| any | Options |
|---|---|
| A | **T6 scroll-fill** (words light up while reading) |
| B | T1 line-rise |
| C | T5 focus-in (2–5 words only) / T8 write-on for an italic accent |

### heading (section titles)
calm → **T1** or T3 axis x · editorial → **T1** + T11 rule-draw · liquid → **T1** · warm → **T2** · playful → **T4** or T7.
Eyebrows/ledes: C1 stagger-up on the wrapper.

### features
| A | **C1 stagger-up** on the list (+ T11 rule-draw between rows) |
|---|---|
| B | S12 sticky-stats (when each feature has a number) |
| C | Alternating rows: M1 clip-reveal from the outer edge + M2 parallax inside, text via C1 |

### stats
**T9 count-up** on each number (+ C1 for labels) · or S12 sticky-stats · or C9 rating for a score.

### gallery
| A | **M1 clip-reveal** (vary `from` per column) + M2 parallax inside + M8 lightbox |
|---|---|
| B | C1 stagger-up (+ `tilt`) + M7 velocity-skew |
| C | S4 pin-crossfade (pinned "film" of 4–6 frames) |

### products
| calm/editorial/liquid | **C2 card-rise** · C1 stagger-up · C6 drag-carousel |
|---|---|
| warm | **C3 hover-preview list** · C2 · C6 |
| playful | **C6 drag-carousel + U8 tilt + U11 fly-to-cart + U10 elastic-pop** · C2 |

### showcase (browse one range)
liquid → **C5 orbit** · calm → C4 flex-accordion · editorial → C2 card-rise + M1 hover image swap (K4) ·
playful → S10 card-stack or S9 scroll-accordion · warm → C3 hover-preview.

### steps
| A | **S5 pin-steps** (pinned, snap, dots) — editorial/calm |
|---|---|
| B | S6 sticky-steps (sticky media, photos open from centre) — liquid |
| C | S11 sequence-build (sheet prints, stamp) — warm · S9 scroll-accordion — playful · C1 + T11 (unpinned, restrained) |

### journey
**S7 horizontal** (+ M1 inside panels, `data-mk-h-parallax` images) · S8 stack-accordion · S3 depth-layers (one scene).

### testimonials
| A | **C7 marquee** (velocity-reactive, with pause button) + C9 rating |
|---|---|
| B | C1 stagger-up with `tilt` (cards straighten as they rise) |
| C | C8 pendulum line (playful) |

### media-moment
**M4 window-grow** (closing photo) · **M6 zoom-through** (brand shape) · M5 grow-inline (word-image-word) ·
M1 `from=center` scrubbed (wide image opening) · S3 depth-layers. Max one per page of M4/M5/M6 each.

### pricing / faq
C1 stagger-up only (calm: none). Never pin or scrub content people compare or read carefully.

### cta
M4 window-grow · T2/T1 heading + U5 magnetic or U6 fill-bloom button · U9 confetti (playful).

### footer
**T13 wordmark-rise** (with `fit`) · S13 handoff from the previous section · U12 follow-sticker (playful).

### global (ask once)
Smooth scroll (Lenis) on/off · U4 cursor · U7 grain · U3 scroll-progress · U6 fill-bloom on all primary buttons ·
K1 underline wipe on links.

## 3 · Building the questions

- One question per section; **2–3 combos + "Keep it still"** as options (the tool adds "Other" automatically).
- Option `label`: ≤ 5 words, visitor-facing ("Lines rise, image wipes up"). `description`: one sentence of what the
  visitor sees + the IDs + cost/caveats ("T1 + M1 + M2 · low cost · pins nothing").
- Put the recommended option first and append " (Recommended)" to its label.
- Use the option `preview` field (when available) for a 3–5 line storyboard, e.g.
  ```
  0.0s  headline lines rise from masks (T1)
  0.3s  photo wipes up from bottom, settles from 1.15× (M1)
  scroll  photo drifts inside frame ±10% (M2)
  ```
- Batch up to 4 sections per question call. Group near-identical sections ("Sections 4–6: text + image rows").
- Mention the showroom so the user can preview every effect: `assets/showroom/index.html` (serve it over http;
  `?preset=calm|editorial|liquid|warm|playful`, `?intro=window|arch|drop|curtain`, `?swap=pop|wipe|fade` for the
  C3 hover preview, `?mk-reduce`, `?mk-debug`).

### Example (editorial preset, products section)
```json
{
  "question": "Products (#range — 3 bottle cards): how should they enter?",
  "header": "Products",
  "multiSelect": false,
  "options": [
    { "label": "Cards swing up (Recommended)", "description": "Cards rise from a −3° tilt, each photo unmasks from the bottom and settles — C2 card-rise · low cost" },
    { "label": "Simple staggered fade-up", "description": "Cards fade and rise in a quick stagger — C1 stagger-up · lowest cost" },
    { "label": "Draggable carousel", "description": "Throwable row that snaps to cards, with arrows — C6 drag-carousel (+ U8 tilt on hover)" },
    { "label": "Keep it still", "description": "No motion in this section" }
  ]
}
```

## 4 · Fallback without a question tool

Print one compact menu and stop:

```
Motion plan — reply with codes like "P2 1A 2B 3A" (or "go" for all recommended)
Preset:  P1 Editorial (recommended) · P2 Calm · P3 Liquid · P4 Warm · P5 Playful
1 Hero        A) lines rise + copy lifts away (T1+S1) ★  B) zoom through the logo (T1+M6)  C) still
2 Benefits    A) sticky odometer stats (S12) ★  B) staggered fade-up (C1)  C) still
…
```
