# Motion Kit

A web-animation skill for AI coding agents, distilled from six award-style sites: **nova, Ember (Cloud Kitchen),
Solenne, Fizzy Fjord, Oval and Dewpoint Barrier**. Every animation from those sites was rebuilt as a reusable,
tested effect, with the bugs found in the audit fixed.

When you ask an agent to add motion to a page, the skill makes it **read the page first, then ask you which
animation each section should get**. Only then does it install the kit, apply the effects and check the result
in a browser.

- **60 effects:** text, images, pinned and horizontal scroll scenes, intros, collections and micro-interactions.
  Each one is applied with a single `data-mk="…"` attribute.
- **5 motion personalities (presets):** the same effect feels slow and weighty, or quick and bouncy, depending on
  the preset.
- **11 CSS-only snippets** and **8 advanced WebGL/canvas blueprints.**
- **A showroom page** that demonstrates every effect live.
- **Works with** plain HTML/CSS/JS and React/Next.js.
- **Accessible by default:** content is visible without JavaScript, reduced motion is honoured live, keyboard focus
  never lands on something hidden, and auto-moving content has a pause control.

---

## Contents

1. [What's inside](#whats-inside)
2. [Where the skill works](#where-the-skill-works)
3. [How it works](#how-it-works)
4. [How to prompt it](#how-to-prompt-it)
5. [Effect cheat sheet](#effect-cheat-sheet)
6. [Browse every effect live (the showroom)](#browse-every-effect-live-the-showroom)
7. [Using the kit by hand](#using-the-kit-by-hand)
8. [API at a glance](#api-at-a-glance)
9. [Troubleshooting](#troubleshooting)
10. [Folder structure](#folder-structure)
11. [License](#license)

---

## What's inside

| Part | What it is |
|---|---|
| `SKILL.md` | The instructions the agent follows: the workflow, the question format, the install steps and the rules. |
| `assets/motion-core.js` | The runtime (`window.MK`, or `import MK`). It wires up GSAP and ScrollTrigger, Lenis smooth scroll, live reduced-motion handling, accessible text splitting, the presets, the scroll lock, and cleanup when the breakpoint changes. |
| `assets/effects/*.js` | The 60 effects in six files: `text`, `media`, `scroll`, `collections`, `ui`, `intro`. Load only the files you use. |
| `assets/motion-kit.css` | Structural CSS for every effect: no-flash rules, masks, overlays and fallbacks. |
| `assets/*.d.ts` | TypeScript types. |
| `assets/showroom/index.html` | A live demo of every effect. It is also the reference markup. |
| `references/` | Detailed docs the agent loads only when it needs them: the effect catalogue, presets, the section playbook, pitfalls, React/Next, CSS snippets and advanced blueprints. |
| `evals/` | Test prompts (`evals.json`) and the three small sample projects they run on (`fixtures/`). |

### The five presets

| Preset | Feels like | Good for | Origin |
|---|---|---|---|
| `calm` | Slow, weighty, cinematic; nothing bounces | Architecture, hotels, luxury, galleries, portfolios | nova + Solenne |
| `editorial` (default) | Crisp magazine reveals; text rises from masks | Food and drink, D2C, studios, most landing pages | Oval |
| `liquid` | Slow start, soft landing, depth through blur | Beauty, skincare, wellness, fashion, premium tech | Dewpoint |
| `warm` | Physical and tactile; springs, followers, reveals that replay | Restaurants, food delivery, crafts, events, music | Ember |
| `playful` | Squash, overshoot, elastic, confetti; fast | Kids, candy, games, toys, youthful brands | Fizzy Fjord |

---

## Where the skill works

**Install with git:**
```bash
git clone https://github.com/amizenda/motion-kit.git ~/.claude/skills/motion-kit
```
On Windows (PowerShell):
```powershell
git clone https://github.com/amizenda/motion-kit.git "$HOME\.claude\skills\motion-kit"
```
To update later, run `git pull` inside that folder.

| Where | How |
|---|---|
| **Claude Code** (the CLI, the desktop app's Code tab, IDE extensions) | Put the folder at `~/.claude/skills/motion-kit/` (on Windows: `C:\Users\<you>\.claude\skills\motion-kit\`). It is then available in every project. Type `/motion-kit` followed by your request, or just describe an animation task: "add animations", "animate the hero" or "make it feel alive" also load it. |
| **One project only, or a team** | Put the folder at `<project>/.claude/skills/motion-kit/` and commit it. Everyone working on that repo gets it. |
| **Other coding agents** (Cursor, Codex, Windsurf…) | Start your prompt with: `Read <path>/motion-kit/SKILL.md and follow its workflow.` The agent needs read access to the folder. |
| **claude.ai** | Zip the `motion-kit` folder and upload it as a custom skill in your claude.ai settings. |

---

## How it works

When the skill is active, the agent follows seven steps:

1. **Reads the project. It asks no questions yet.**
   - Stack: plain HTML or React/Next.
   - Libraries already present.
   - Every section on the page, classified as hero, gallery, testimonials, stats and so on.
   - Brand signals from the fonts, colours and imagery.
2. **Asks the overall questions,** up to four at once:
   - motion personality (preset)
   - intro or none
   - motion density (Restrained, Rich or Maximal)
   - smooth scrolling on or off

   The recommended option always comes first.
3. **Asks one question per section,** in batches of up to four and at most about eight in total.
   - Each question offers 2–3 effect combinations that fit the chosen preset, plus **"Keep it still"**.
   - Each option shows what the visitor sees, the effect IDs and the performance cost.
   - Near-identical sections are grouped into one question.
4. **Shows a plan table**, then installs the kit: copies the files, adds the head snippet and loads the scripts.
5. **Applies the effects**, following each effect's markup contract exactly.
6. **Verifies in a browser:**
   - no console errors
   - a full scroll down and back up
   - reduced-motion mode
   - a 375 px phone width
   - keyboard use
7. **Reports** which section got which effect, how to tune it, and anything it couldn't verify.

**How to answer the questions:**
- Pick an option.
- Choose **"Other"** and type effect IDs (`T1 + M2`) or describe what you want in your own words.
- Choose **"Keep it still"** for no motion.

The skill won't ask about anything your prompt already settled. Saying **"you choose"** skips all the questions:
the agent uses the recommended options and lists what it picked.

**Built-in limits per page:** one intro, at most four pinned scenes, at most one showpiece (window-grow,
grow-inline, zoom-through or cloud-curtain), and at most one heavy blur or canvas effect in view at a time.

---

## How to prompt it

### A template for the best results

A good prompt says **which page, what feel, any limits, and how much you want to be asked**:

```text
/motion-kit Add animations to index.html.
Feel: calm, premium, editorial (like Oval).
Scope: all sections except the footer.
Limits: no intro loader, keep mobile light.
Ask me section by section and show me the plan before you install anything.
```

Every line is optional. Each line you include removes a question the agent would otherwise ask.

### Prompts for common situations

**Full guided pass** (asks the most questions, gives you the most control):
```text
/motion-kit Animate this landing page. Ask me what each section should do.
```

**Just one section:**
```text
/motion-kit Animate only the #gallery section. Leave the rest of the page alone.
```

**"Make it feel like one of my sites."** Each site maps to a preset: nova and Solenne → calm, Oval → editorial,
Dewpoint → liquid, Ember → warm, Fizzy Fjord → playful.
```text
/motion-kit Make this portfolio feel like nova. Only ask what you can't infer.
```

**Hands-off** (uses the recommended options and lists what it picked):
```text
/motion-kit Add tasteful motion to the whole site. You choose, then tell me what you picked.
```

**You already know the effects:**
```text
/motion-kit Hero: T1 + M1 with the arch intro (I2). Products: C2. Footer: T13. Editorial preset, no smooth scroll.
```

**Preview before deciding:**
```text
/motion-kit Open the showroom in the browser with the warm preset so I can pick effects.
```

**Change or tune afterwards:**
```text
/motion-kit The hero reveal is too fast and the marquee is distracting. Slow the hero and replace the marquee with something calmer.
```

**Check animations that are already there:**
```text
/motion-kit Audit the existing animations on this site against the pitfalls list and fix what's broken.
```

**React / Next.js:**
```text
/motion-kit Add motion to app/page.tsx in this Next.js app, playful style. Use MotionScope.
```

**A new site from scratch:**
```text
Build a landing page for a ceramics studio, then use /motion-kit to animate it. Ask me before you add motion.
```

### Tips

- **Describe the feel rather than the effects,** unless you know the IDs. "Slow, soft, luxurious" or a site name is
  enough for the agent to choose a fitting preset.
- **State your limits up front.** "No smooth scroll", "must work offline", "no pinned sections on mobile" or
  "keep it light" filters the options before you see them.
- **Say "show me the plan first"** if you want to approve it before any files change.
- **Want a lot of motion? Ask for "Maximal" density** rather than "animate everything". The agent still respects
  the per-page limits.
- **Work on one page per request.** On multi-page sites a single prompt tends to over-group sections.

---

## Effect cheat sheet

Use these IDs in "Other" answers or in direct requests. Each effect's markup contract, options and cost are in
[`references/catalog.md`](references/catalog.md).

| Group | IDs |
|---|---|
| **T · Text** | T1 line-rise · T2 word-rise · T3 char-flip · T4 blur-rise · T5 focus-in · T6 scroll-fill · T7 letter-drop · T8 write-on · T9 count-up · T10 word-cycle · T11 rule-draw · T12 text-path · T13 wordmark-rise |
| **M · Media** | M1 clip-reveal · M2 parallax · M3 settle · M4 window-grow · M5 grow-inline · M6 zoom-through · M7 velocity-skew · M8 lightbox |
| **S · Scroll scenes** | S1 hero-exit · S2 drift · S3 depth-layers · S4 pin-crossfade · S5 pin-steps · S6 sticky-steps · S7 horizontal · S8 stack-accordion · S9 scroll-accordion · S10 card-stack · S11 sequence-build · S12 sticky-stats · S13 handoff · S14 cloud-curtain |
| **C · Collections** | C1 stagger-up · C2 card-rise · C3 hover-preview · C4 flex-accordion · C5 orbit · C6 drag-carousel · C7 marquee · C8 pendulum · C9 rating |
| **U · UI** | U1 nav-hide · U2 nav-state · U3 scroll-progress · U4 cursor · U5 magnetic · U6 fill-bloom · U7 grain · U8 tilt · U9 confetti · U10 elastic-pop · U11 fly-to-cart · U12 follow-sticker |
| **I · Intros** | I1 intro-window · I2 intro-arch · I3 intro-drop · I4 intro-curtain |
| **K · CSS only** | K1 underline wipe · K2 press squash · K3 hover zoom · K4 hover image swap · K5 Ken Burns · K6 spinning badge · K7 cover curtain · K8 sibling spotlight · K9 row hover wipe · K10 burger → X · K11 neighbour nudge |
| **A · Advanced** | A1 WebGL fire type · A2 3D floating objects · A3 cloth paper · A4 wind-blown cards · A5 canvas smear · A6 window panes merge · A7 rim text on a sun · A8 live sun readout |

The K snippets are copy-paste CSS ([`references/css-snippets.md`](references/css-snippets.md)). The A entries are
art-directed showpieces rather than drop-in effects: each has a blueprint in
[`references/advanced.md`](references/advanced.md) and complete reference code (shaders, physics, markup) in
[`references/advanced/`](references/advanced/), which the agent adapts to your brand.

---

## Browse every effect live (the showroom)

The showroom is one long page that runs **all 60 effects** on placeholder content. Use it to choose effects before
you prompt, or to compare presets.

### Start a local server

Serve the skill folder over http, then open the showroom page. This is how the showroom was tested, and it matches
how a real site loads.

**Python** (PowerShell; the path is the global install):
```powershell
python -m http.server 5178 --directory "$HOME\.claude\skills\motion-kit"
```

**Python** (macOS / Linux / Git Bash):
```bash
python3 -m http.server 5178 --directory ~/.claude/skills/motion-kit
```

**Node** (from inside the `motion-kit` folder):
```bash
npx serve -l 5178 .
```

Then open **http://localhost:5178/assets/showroom/index.html**. Stop the server with `Ctrl+C`.

GSAP, ScrollTrigger, SplitText, CustomEase and Lenis load from a CDN, so the first visit needs an internet
connection.

### What's on the page (top to bottom)

| Section | Effects | What to do |
|---|---|---|
| Always on | U1 nav-hide (the header slides away as you scroll down and returns when you scroll up), U2 nav-state (the header switches theme over dark sections), U3 scroll-progress (top bar), U4 cursor (trailing dot) | Scroll down, then up a little; move the mouse |
| Intro + hero | I1 intro-window, S1 hero-exit, T1 line-rise (plays after the intro) | Reload to replay the intro; scroll to see the hero part |
| Text | T1–T12: line, word and character reveals, blur and focus, scroll-fill reading, scrubbed letter-drop, write-on, count-up stats, word-cycle ticker, rule-draw, a text ribbon on a path | Scroll slowly |
| Media | M1 clip-reveal (bottom, left, centre, circle, plus a scrubbed wide image), M2 parallax, M3 settle, M7 velocity-skew, M8 lightbox | Scroll fast to see the skew; **click a picture** to open the lightbox (Esc closes it) |
| Pinned media | M4 window-grow, M5 grow-inline, M6 zoom-through | Scroll through each pin |
| Scroll scenes | S2 drift, S3 depth-layers, S4 pin-crossfade, S5 pin-steps (snaps to steps; **click the dots**), S6 sticky-steps, S7 horizontal (with nested clip-reveals and parallax), S8 stack-accordion, S9 scroll-accordion, S10 card-stack, S11 sequence-build (a ticket prints and gets stamped), S12 sticky-stats | Scroll; on S5, click a dot to jump to that step |
| Collections | C1 stagger-up, C2 card-rise, C3 hover-preview, C4 flex-accordion, C5 orbit, C6 drag-carousel, C7 marquee, C8 pendulum, C9 rating | Hover the menu rows (C3) and the columns (C4); click or use ←/→ on the orbit (C5); drag the carousel (C6) and the pendulum line (C8); press **Pause** on the marquee, which also speeds up with your scrolling |
| Shop interactions | U11 fly-to-cart, U10 elastic-pop | Click **Into the bag**: the header slides back if it was hidden, the product flies into its bag and the count goes up. Click **+ 100 g** to see the amount pop |
| Micro-interactions | U5 magnetic, U6 fill-bloom, U9 confetti, U4 cursor label, U8 tilt with sheen | Hover each button; click **Fizz!**; tilt the card with the mouse |
| Endings | S14 cloud-curtain, S13 handoff, U12 follow-sticker, T13 wordmark-rise (`fit`) | Scroll into the footer; move the mouse over it |

Mouse-only effects (cursor, magnetic, tilt, hover-preview, follow-sticker) are switched off on touch screens, by
design.

### The options panel and URL flags

A small panel in the bottom-right corner switches the page's settings. Each link reloads the showroom with a URL
flag:

| Panel / flag | What it does |
|---|---|
| **preset:** `?preset=calm` · `editorial` · `liquid` · `warm` · `playful` | Changes the motion personality for every effect. The current preset is shown in bold. |
| **intro:** `?intro=window` · `arch` · `drop` · `curtain` | Swaps the intro: I1 window (default), I2 arch preloader, I3 droplet splash, I4 counter loader with lifting sheets. |
| **preview swap:** `?swap=pop` · `wipe` · `fade` | Changes how the C3 hover-preview swaps images: spin-in, circular wipe from the side you came from, or crossfade. |
| **reduced motion:** `?mk-reduce` | Shows the page as a visitor with "reduce motion" switched on sees it: all content visible, no pins, no smooth scroll, no intro. |
| **grain:** `?grain` | Adds U7 animated film grain over the page. |
| **markers:** `?mk-debug` | Shows ScrollTrigger start and end markers, useful for checking pins and triggers. |
| `?mk-motion` (no panel link) | Forces motion on, even if your OS is set to reduce motion. |

The panel links replace the whole URL. To combine flags, edit the address bar yourself:
`index.html?preset=warm&intro=curtain&swap=wipe&grain`.

### Tips for the showroom

- **Changes not showing?** Press **Ctrl+F5** (Cmd+Shift+R on a Mac). Browsers cache the kit's files.
- **Check the phone layout:** narrow the window, or use DevTools' device toolbar at 375 px. Some pins hand over
  to simpler layouts below 768 px.
- **See it in reduced motion:** turn on your OS's "reduce motion" setting while the page is open. The page rebuilds
  live, with no reload needed.
- **Reuse the markup:** every demo block is reference markup. View the page source and copy a block into your site.

---

## Using the kit by hand

You don't need an agent to use the kit. For a plain HTML site:

**1. Copy the files** (only the effect files you need):
```bash
mkdir -p js/motion-kit/effects
cp ~/.claude/skills/motion-kit/assets/motion-core.js ~/.claude/skills/motion-kit/assets/motion-kit.css js/motion-kit/
cp ~/.claude/skills/motion-kit/assets/effects/{text,media,scroll}.js js/motion-kit/effects/
```

**2. Paste the head snippet as the first thing in `<head>`,** before any CSS. It hides content that is about to
animate, so it doesn't flash, and shows everything after 4 s if the scripts fail to load.
```html
<script>
  (function (d, w) {
    var h = d.documentElement, q = w.location.search;
    h.classList.add('mk-js');
    var reduce = /[?&]mk-reduce\b/.test(q) || (!/[?&]mk-motion\b/.test(q) && w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (!reduce) {
      h.classList.add('mk-motion');
      w.__mkFailsafe = setTimeout(function () { if (!(w.MK && w.MK.started)) h.classList.add('mk-failsafe'); }, 4000);
    }
  })(document, window);
</script>
<link rel="stylesheet" href="js/motion-kit/motion-kit.css">
```

**3. Load the scripts at the end of `<body>`, in this order:**
```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/SplitText.min.js"></script>   <!-- line masks; optional -->
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/CustomEase.min.js"></script>  <!-- exact preset curves; optional -->
<script src="https://cdn.jsdelivr.net/npm/lenis@1.3.4/dist/lenis.min.js"></script>       <!-- smooth scroll; optional -->
<script src="js/motion-kit/motion-core.js"></script>
<script src="js/motion-kit/effects/text.js"></script>
<script src="js/motion-kit/effects/media.js"></script>
<script src="js/motion-kit/effects/scroll.js"></script>
<script>
  MK.init({ preset: 'editorial', anchorOffset: '.site-header' });
  MK.start();
</script>
```

**4. Add attributes to your markup:**
```html
<h1 data-mk="line-rise" data-mk-on="load">Everything the evening wants.</h1>
<div class="frame" data-mk="clip-reveal" data-mk-from="left"><img src="room.jpg" width="1200" height="900" alt=""></div>
<div class="grid" data-mk="stagger-up">…cards…</div>
```

Some effects need specific child elements, for example `data-mk-track`, `data-mk-step` or `data-mk-media`.
Check each effect's markup contract in [`references/catalog.md`](references/catalog.md), or copy the matching
block from the showroom.

**React / Next.js:**
- Install `gsap`, `@gsap/react` and `lenis`.
- Copy the assets into `lib/motion-kit/`.
- Initialise once in an `init.ts` module.
- Wrap each page in `<MotionScope>`, which uses the same `data-mk` attributes in JSX, or use the `useMotion()` hook
  for a single element.

The full setup is in [`references/react-next.md`](references/react-next.md).

All GSAP plugins used here, including SplitText and CustomEase, are free as of GSAP 3.13. Lenis is optional.

---

## API at a glance

```js
MK.init({ preset, tokens, smooth, lenis, anchors, anchorOffset, breakpoint, reduced, fontTimeout, debug })
MK.start(root?)              // scan [data-mk] and apply; safe to call again (only picks up new content)
MK.stop(root?)               // revert what start() on that same root applied
MK.apply(el, 'name' | ['a','b'], { option: value })   // one element; returns a revert function
MK.effect(name, setup, { reduced, intro })             // register your own effect
MK.setPreset(name)           // switch personality at runtime
MK.refresh()                 // re-measure after injecting content
MK.scrollTo(target, { offset, duration, focus })
MK.lock() / MK.unlock()      // stop page scrolling for menus and overlays (the page width never jumps)
MK.velocity()                // smoothed scroll speed in px/s
MK.inspect()                 // what was applied: [{ el, effects, ready, unknown }]
MK.destroy()                 // tear everything down
```

- **Common options on every entrance effect:** `data-mk-on` (scroll | load | intro), `data-mk-start`,
  `data-mk-delay`, `data-mk-replay`, `data-mk-duration`, `data-mk-ease`, `data-mk-stagger`.
- **Setting the preset:** call `MK.init({ preset })`, or put `<html data-mk-preset="warm">` on the page.
- **Fine-tuning:** adjust individual tokens with `MK.init({ tokens: { dur: { l: 1.3 } } })`.

---

## Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| Content stays invisible | The scripts didn't load (CDN blocked, wrong path or a JS error). Check the console. The failsafe shows everything after 4 s. Under a strict CSP or offline, vendor the libraries locally. |
| An effect does nothing | Its effects file isn't loaded, or the name is misspelled. `MK.inspect().filter(x => x.unknown.length \|\| !x.ready)` should return `[]`. |
| A pinned section jumps or overlaps | An ancestor has `transform` or `overflow: hidden`, or content was injected after start. Fix the CSS, or call `MK.refresh()` after injecting content. |
| Two effects fight over one element | Both move the same element (for example an entrance plus parallax). Put one of them on a wrapper. Never use a CSS `transition: transform` on an element an effect animates. |
| Changes don't appear | The browser cached the old files. Press Ctrl+F5. |
| An effect seems to run twice | It can't. The first `start()`/`apply()` owns each effect, and repeated calls skip it. To rebuild a section, call `MK.stop(root)` then `MK.start(root)` on the **same root** you started. |

The full checklist is in [`references/pitfalls.md`](references/pitfalls.md).

---

## Folder structure

```
motion-kit/
├── SKILL.md                  the agent's instructions
├── README.md                 this file
├── LICENSE                   MIT
├── assets/
│   ├── motion-core.js        runtime (window.MK / import MK)
│   ├── motion-core.d.ts      types
│   ├── motion-kit.css        structural CSS for all effects
│   ├── effects/
│   │   ├── text.js           T1–T13
│   │   ├── media.js          M1–M8
│   │   ├── scroll.js         S1–S14
│   │   ├── collections.js    C1–C9
│   │   ├── ui.js             U1–U12
│   │   ├── intro.js          I1–I4
│   │   └── *.d.ts            types
│   └── showroom/
│       └── index.html        live demo of every effect
├── references/
│   ├── catalog.md            markup contract, options and cost for every effect
│   ├── presets.md            the five personalities, their tokens and signature combinations
│   ├── section-playbook.md   which effects suit which section, question templates
│   ├── pitfalls.md           checklist and verification protocol
│   ├── react-next.md         React / Next.js setup
│   ├── css-snippets.md       K1–K11
│   ├── advanced.md           A1–A8 WebGL/canvas blueprints
│   └── advanced/             complete reference code for A1–A8 (+ a5-smear.js)
└── evals/
    ├── evals.json            test prompts for the skill
    └── fixtures/             sample projects the tests run on (roastery, portfolio, next-site)
```

## License

[MIT](LICENSE) © 2026 Amizenda. GSAP (including SplitText and CustomEase) and Lenis are loaded from their own
packages and keep their own licences.
