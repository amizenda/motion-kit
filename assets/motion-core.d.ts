/* motion-kit · TypeScript declarations (v1.0.0)
 * Keep next to motion-core.js (same base name) so TypeScript picks it up automatically. If you
 * rename the JS file, rename this one too. */

export type MKPreset = 'calm' | 'editorial' | 'liquid' | 'warm' | 'playful';
export type MKEaseToken = 'out' | 'text' | 'inOut' | 'in' | 'soft' | 'pop' | 'elastic';
export type MKDurToken = 'xs' | 's' | 'm' | 'l' | 'xl';

export interface MKTokens {
  name: MKPreset;
  label: string;
  ease: Record<MKEaseToken, string>;
  css: { out: string; inOut: string; pop: string };
  dur: Record<MKDurToken, number>;
  stagger: { chars: number; words: number; lines: number; items: number };
  rise: number;
  start: string;
  replay: boolean;
  lenis: Record<string, unknown>;
}

export interface MKConditions { motion: boolean; reduce: boolean; desktop: boolean; mobile: boolean; hover: boolean; touch: boolean; }

export interface MKInitOptions {
  preset?: MKPreset;
  tokens?: Partial<MKTokens> | Record<string, unknown>;
  smooth?: boolean;
  lenis?: Record<string, unknown>;
  anchors?: boolean;
  anchorOffset?: number | string | (() => number);
  breakpoint?: number;
  reduced?: boolean;
  fontTimeout?: number;
  debug?: boolean;
  gsap?: unknown; ScrollTrigger?: unknown; Lenis?: unknown; SplitText?: unknown; CustomEase?: unknown;
}

export interface MKSplit {
  lines: Element[] | Element[][]; words: Element[]; chars: Element[]; targets: Element[];
  stagger(each: number): number | ((i: number) => number);
  revert(): void;
}

export interface MKHelpers {
  el: HTMLElement; name: string; t: MKTokens; is: MKConditions; gsap: any; ST: any; ctx: any; MK: MotionKit;
  opt<T = any>(key: string, def?: T): T;
  ease(token?: MKEaseToken | string): string;
  dur(token?: MKDurToken | number): number;
  q(sel: string): HTMLElement | null;
  qa(sel: string): HTMLElement[];
  alive(): boolean;
  on(target: EventTarget | string, type: string, fn: (e: any) => void, options?: AddEventListenerOptions | boolean): ((e: any) => void) | null;
  cleanup(fn: () => void): void;
  own(targets: Element | Element[] | NodeList): void;
  split(target: Element | null, type: 'lines' | 'words' | 'chars', opts?: { mask?: boolean; fallback?: boolean }): MKSplit;
  loop(fn: (dt: number, time: number) => void, opts?: { el?: Element; margin?: string; onToggle?: (v: boolean) => void }): { readonly active: boolean; sleep(): void; wake(): void };
  trigger(vars: Record<string, unknown>): any;
  onRefresh(fn: () => void): void;
  whenStart(on: 'scroll' | 'load' | 'intro'): Promise<void>;
  introDone(): void;
  reveal(targets: any, from: Record<string, unknown>, to: Record<string, unknown>, cfg?: { on?: 'scroll' | 'load' | 'intro'; delay?: number; trigger?: Element; start?: string; replay?: boolean; scrollTrigger?: Record<string, unknown> }): any;
}

export type MKSetup = (el: HTMLElement, o: MKHelpers) => void | (() => void);

export interface MotionKit {
  version: string; ready: boolean; started: boolean; reduced: boolean; introFinished: boolean;
  is: MKConditions | null; lenis: any; gsap: any; ScrollTrigger: any; SplitText: any; CustomEase: any;
  t: MKTokens; config: Record<string, unknown>; presets: Record<MKPreset, unknown>;
  init(opts?: MKInitOptions): MotionKit;
  /** Scan root for [data-mk]. Safe to call again: effects already running (any start/apply) are skipped. */
  start(root?: Element | Document, opts?: { waitFonts?: boolean }): Promise<MotionKit>;
  /** Revert what start() on this same root applied. */
  stop(root?: Element | Document): void;
  /** Apply to one element; an effect already running on it is not applied twice. Returns a revert function. */
  apply(el: Element, names?: string | string[] | null, opts?: Record<string, unknown>): () => void;
  effect(name: string, setup: MKSetup, meta?: { reduced?: MKSetup | 'same'; intro?: boolean }): MotionKit;
  effects(): string[];
  has(name: string): boolean;
  refresh(now?: boolean): void;
  scrollTo(target: Element | string | number, opts?: { offset?: number; duration?: number; easing?: (t: number) => number; immediate?: boolean; focus?: boolean; force?: boolean; onComplete?: () => void }): void;
  lock(): void; unlock(all?: boolean): void; isLocked(): boolean;
  velocity(): number;
  introDone(): void; whenIntro(): Promise<void>;
  split(el: Element, type: 'lines' | 'words' | 'chars', opts?: { mask?: boolean; fallback?: boolean }): MKSplit;
  withContainer<T extends Record<string, unknown>>(el: Element, vars: T): T;
  setPreset(name: MKPreset, overrides?: Record<string, unknown>): MKTokens;
  customEase(name: string, curve: string, fallback: string): string;
  confetti?(x: number, y: number, opts?: { count?: number; speed?: number; size?: number; spread?: number; dir?: number; colors?: string[] | null }): void;
  inspect(root?: Element | Document): { el: Element; effects: string[]; ready: boolean; unknown: string[] }[];
  destroy(): void;
  clamp(v: number, a: number, b: number): number; map(v: number, a: number, b: number): number;
  lerp(a: number, b: number, t: number): number; damp(a: number, b: number, rate: number, dt: number): number;
  toArray(x: any): any[];
}

declare const MK: MotionKit;
export default MK;

declare global { interface Window { MK: MotionKit; } }
