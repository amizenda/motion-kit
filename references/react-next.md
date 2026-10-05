# React & Next.js

The same core and effect files work in React. You author effects with the **same `data-mk` attributes** in JSX and
wrap each page (or section) in `<MotionScope>`, which starts the effects on mount and reverts them on unmount (route
changes, StrictMode double-mounts, HMR). For one-off elements there is a `useMotion()` hook.

## 1 · Install
```bash
npm i gsap @gsap/react lenis
```
Copy from the skill's `assets/` into the project (keep the names; the `.d.ts` files give you types):
```
lib/motion-kit/motion-core.js        lib/motion-kit/motion-core.d.ts
lib/motion-kit/effects/*.js          lib/motion-kit/effects/*.d.ts   (only the files you need)
lib/motion-kit/motion-kit.css
```
`allowJs` is on by default in Next's tsconfig; nothing else to configure.

## 2 · One client module that initialises everything
`lib/motion-kit/init.ts` — imported by every motion component, so `MK.init()` always runs before the first effect.
```ts
'use client';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { CustomEase } from 'gsap/CustomEase';
import Lenis from 'lenis';
import MK from './motion-core';
import registerText from './effects/text';
import registerMedia from './effects/media';
import registerScroll from './effects/scroll';
import registerUI from './effects/ui';
import registerCollections from './effects/collections';
// import registerIntro from './effects/intro';

export const MOTION_PRESET = 'editorial' as const;

if (typeof window !== 'undefined' && !MK.ready) {
  [registerText, registerMedia, registerScroll, registerUI, registerCollections].forEach((register) => register(MK));
  MK.init({
    preset: MOTION_PRESET,
    gsap, ScrollTrigger, SplitText, CustomEase, Lenis,
    anchorOffset: 'header',          // CSS selector of your fixed header, or a number
  });
}

export default MK;
```

## 3 · Head snippet + CSS (App Router `app/layout.tsx`)
The snippet must run before first paint. `suppressHydrationWarning` is needed because it adds classes to `<html>`.
```tsx
import './globals.css';
import '@/lib/motion-kit/motion-kit.css';
import MotionRoute from '@/components/motion/MotionRoute';

const MK_HEAD = `(function(d,w){var h=d.documentElement,q=w.location.search;h.classList.add('mk-js');var r=/[?&]mk-reduce\\b/.test(q)||(!/[?&]mk-motion\\b/.test(q)&&w.matchMedia&&w.matchMedia('(prefers-reduced-motion: reduce)').matches);if(!r){h.classList.add('mk-motion');w.__mkFailsafe=setTimeout(function(){if(!(w.MK&&w.MK.started))h.classList.add('mk-failsafe')},4000)}})(document,window);`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: MK_HEAD }} /></head>
      <body>
        <MotionRoute />
        {children}
      </body>
    </html>
  );
}
```
Pages Router: put the `<script>` in `pages/_document.tsx` `<Head>`, import the CSS in `_app.tsx`.
Vite/CRA: put the snippet in `index.html` `<head>`.

## 4 · Components
`components/motion/MotionScope.tsx` — scans its subtree for `data-mk` and reverts on unmount.
```tsx
'use client';
import { useLayoutEffect, useRef } from 'react';
import MK from '@/lib/motion-kit/init';

export default function MotionScope({ children, as: Tag = 'div', ...rest }: { children: React.ReactNode; as?: any; [k: string]: any }) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    MK.start(root);
    return () => MK.stop(root);
  }, []);
  return <Tag ref={ref} {...rest}>{children}</Tag>;
}
```
`components/motion/MotionRoute.tsx` — resets scroll and re-measures on navigation.
```tsx
'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import MK from '@/lib/motion-kit/init';

export default function MotionRoute() {
  const pathname = usePathname();
  useEffect(() => {
    if (MK.lenis) MK.lenis.scrollTo(0, { immediate: true, force: true });
    MK.refresh();
  }, [pathname]);
  return null;
}
```
`components/motion/useMotion.ts` — for a single element (no attributes needed).
```ts
'use client';
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import MK from '@/lib/motion-kit/init';

export function useMotion<T extends HTMLElement>(effects: string | string[], options?: Record<string, unknown>, deps: unknown[] = []) {
  const ref = useRef<T>(null);
  useGSAP(() => {
    if (!ref.current) return;
    return MK.apply(ref.current, effects, options);
  }, { dependencies: deps, scope: ref, revertOnUpdate: true });
  return ref;
}
```

## 5 · Using it
Server components can render the markup (attributes are plain HTML); only `MotionScope` is a client component.
```tsx
import MotionScope from '@/components/motion/MotionScope';

export default function Page() {
  return (
    <MotionScope as="main">
      <section className="hero" data-mk="hero-exit">
        <h1 data-mk="line-rise" data-mk-on="load">Everything the evening wants.</h1>
      </section>
      <div className="grid" data-mk="card-rise">{/* cards */}</div>
      <div data-mk="marquee" data-mk-velocity>
        <div data-mk-track>{/* items */}</div>
        <button data-mk-marquee-toggle>Pause</button>
      </div>
    </MotionScope>
  );
}
```
Hook form:
```tsx
'use client';
import { useMotion } from '@/components/motion/useMotion';
export function Title({ children }: { children: React.ReactNode }) {
  const ref = useMotion<HTMLHeadingElement>('line-rise', { start: 'top 80%' });
  return <h2 ref={ref}>{children}</h2>;
}
```
Option keys passed to `MK.apply` are the camelCase names (`{ from: 'left', zoom: 1 }`), equivalent to `data-mk-*`.

## 6 · Rules specific to React
- Don't let React re-render the children of a split text node while it is animating (static text only). If the text
  changes, change the element's `key` so it remounts and re-splits.
- Effects that move DOM nodes (marquee clones, lightbox root, preview disc, confetti canvas) restore or remove them on
  revert; keep `data-mk-track` children static (map once, no keyed reordering during the animation).
- Put `MotionScope` **inside** layouts that persist across routes only if their content persists too; otherwise wrap
  each page so navigation reverts the previous page's pins.
- Nested scopes never double an effect. Each element's effect is owned by whichever `start()`/`apply()` claimed
  it first; inner scopes mount first, so they own their content and their unmount reverts it. Don't also put
  `useMotion('x')` on an element that has `data-mk="x"` inside a scope: the second one is skipped, with a console
  warning.
- One intro per site: render the intro overlay markup (e.g. `<div data-mk="intro-curtain">`) first inside the scope of
  the home page and register `effects/intro` in `init.ts`.
- `MK.velocity()`, `MK.scrollTo()`, `MK.lock()` are safe to call from client components after `init.ts` is imported.
- Tests (Jest/Vitest with jsdom): GSAP runs, but layout is zero. Assert on markup/classes, not on positions.
