# Premium Design Layer — Tokens & Contracts

**Status:** Canonical · **Applies to:** all public surfaces (landing + `/docs`,
`/resources`, `/benchmark`, `/security`, `/waitlist`, `/signin`,
`/reset-password`) · **Source of truth:** `src/index.css` `@theme` block and the
"Premium design layer" section, plus the shared `LUXE` constant in components.

This doc captures the **premium layer** on top of the base Provance design —
the double-bezel architecture, luxe motion, film grain, and typography rhythm
that make public surfaces read as one designed system. **Build new public
surfaces against this doc, not by re-deriving classes from a screenshot.**
If a value here disagrees with `src/index.css`, the CSS wins — update this doc.

---

## 1. Typography

Loaded in `index.html` (Google Fonts, one request):

| Role | Face | CSS token | Fallbacks |
| --- | --- | --- | --- |
| **Display / headings** | Fraunces (variable, SOFT/WONK 0, opsz 9–144, wght 400–700) | `--font-serif` | Georgia, serif |
| **Body / UI (public)** | Plus Jakarta Sans | `--font-sans` | Manrope, Inter, system-ui, sans-serif |
| **Data / labels / code** | IBM Plex Mono | `--font-mono` | Fira Code, monospace |
| **App + admin shells** (Operate register) | Inter | `--font-app` | Manrope, system-ui, sans-serif |

Rules:
- **Headings** always `font-serif` (Fraunces) with `letter-spacing: -0.03em`
  (applied globally to `h1–h6`). Italic accent words use the same face:
  `<span className="italic text-trust">evidence</span>`.
- **Headline scale** — landing sections and every public page hero:
  `text-3xl sm:text-4xl lg:text-[3.4rem] lg:leading-[1.05]` (section h2) and
  `text-4xl sm:text-5xl lg:text-6xl xl:text-[4.4rem] xl:leading-[1.02]` (PageHero h1).
- **Body copy** on light: `text-charcoal-mid`; on dark sections: `text-stone`.
- Public surfaces use `--font-sans`; the app/admin shells deliberately stay on
  Inter (Operate register — scanability over expression). Do not add the
  premium faces to the shells without an explicit design decision.

## 2. Color

All in the `@theme` block — these are the **only** palette values for public
surfaces (the app shells have their own tokens):

| Token | Hex | Usage |
| --- | --- | --- |
| `--color-parchment` | `#f6f2ea` | Primary light background |
| `--color-parchment-light` | `#fbf8f2` | Alt light section background |
| `--color-parchment-dark` | `#e9e2d6` | Muted borders on light |
| `--color-white-warm` | `#fffdf9` | Bezel core surface / card fills |
| `--color-charcoal` | `#13161d` | Text + dark section background |
| `--color-charcoal-soft` | `#1c2230` | Dark bezel core gradient end |
| `--color-charcoal-mid` | `#546071` | Secondary body text |
| `--color-charcoal-light` | `#5f6b7c` | Tertiary labels / captions — darkened 2026-08-17 from `#7d8797` so text on parchment/white-warm meets WCAG AA (≥4.5:1); keep it lighter than `charcoal-mid` for the label hierarchy |
| `--color-stone` | `#bec5d0` | Muted text on dark |
| `--color-stone-light` | `#dde3ea` | Hairlines / track fills |
| `--color-trust` | `#2f5bea` | Primary brand accent |
| `--color-trust-strong` | `#1f43ba` | Hover / gradient end |
| `--color-trust-soft` | `#e7eeff` | Tint fills / eyebrow dot glow |
| `--color-trust-mist` | `#f3f6ff` | Softest tint |
| `--color-amber` | `#b7791f` | Secondary accent / verdict warnings |
| `--color-amber-light` | `#d69a42` | Amber gradient end |
| `--color-amber-glow` | `#f0bf6c` | Glow accents |
| `--color-amber-subtle` | `#f8ecd9` | Amber tint surfaces |

**Verdict palette** is separate and lives in
`src/components/app/scanPresentation.js` (`VERDICT_PALETTE`, applied to
`<html>` at boot) — do **not** redeclare verdict colors in CSS or this doc.

## 3. Motion — the luxe ease

Two tokens define ALL premium motion (never `linear` or `ease-in-out` on
public surfaces):

| Token | Value | Use |
| --- | --- | --- |
| `--ease-luxe` | `cubic-bezier(0.32, 0.72, 0, 1)` | Standard hover/lift/entrance |
| `--ease-luxe-soft` | `cubic-bezier(0.22, 1, 0.36, 1)` | Settle / softer reveals |

Two ways to apply:

1. **CSS transitions** — `transition: transform 0.6s var(--ease-luxe), …`
   (the `.btn-*` and `.ease-luxe` utility classes already do this). Card hover:
   `transition-transform duration-700 ease-luxe group-hover:-translate-y-1`.
2. **Framer Motion** — every motion component declares
   `const LUXE = [0.32, 0.72, 0, 1]` and uses `ease: LUXE`. The standard
   entrance variant (blur fade-up):
   ```js
   const fadeUp = {
     hidden: { opacity: 0, y: 24, filter: 'blur(6px)' },
     visible: (i = 0) => ({
       opacity: 1, y: 0, filter: 'blur(0px)',
       transition: { duration: 0.85, delay: 0.08 * i, ease: LUXE },
     }),
   }
   ```
   Card grids use `initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
   viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.7, delay: i * 0.08, ease: LUXE }}`.
   `PageHero`/`Hero` entrances run once on mount (`animate`, not `whileInView`).

Motion rules: animate only `transform` + `opacity` (plus `filter: blur()` for
the entrance) — never `top/left/width/height`. Respect `prefers-reduced-motion`
(the global `@media` block collapses all durations; `Hero` additionally gates
its infinite pulse blob).

## 4. The Double-Bezel (card architecture)

Every premium card is a **nested enclosure** — an outer hairline shell with
its own radius wrapping an inner core with a distinct surface + inset
highlight. Never place a card flat on the background.

| Class | Radius | Padding | Background | Shadow |
| --- | --- | --- | --- | --- |
| `.bezel-shell` | `2rem` | `1px` | gradient hairline `white-warm → stone-light` | `0 30px 70px -28px rgba(19,22,29,.18)` + inset top highlight |
| `.bezel-core` | `calc(2rem - 1px)` | — (content padding on the element) | `--color-white-warm` | `inset 0 1px 1px rgba(255,255,255,.55)` |
| `.bezel-shell-dark` | `2rem` | `1px` | gradient hairline `white/16 → white/4` | `0 34px 80px -30px rgba(8,10,16,.65)` |
| `.bezel-core-dark` | `calc(2rem - 1px)` | — | `charcoal-soft → charcoal` gradient | `inset 0 1px 0 rgba(255,255,255,.05)` |

Usage pattern (light card):
```jsx
<div className="bezel-shell h-full transition-transform duration-700 ease-luxe group-hover:-translate-y-1">
  <div className="bezel-core h-full p-6 md:p-8">
    {/* content */}
  </div>
</div>
```
- The **outer** element carries the hover lift (`group-hover:-translate-y-1`);
  the wrapper `motion.div` gets `className="group"`.
- **Equal-height grids**: put `h-full` on BOTH shell and core.
- Dark sections (charcoal background) use `bezel-shell-dark`/`bezel-core-dark`.
- Content padding lives on the core (`p-6 md:p-8` standard; `p-5` for dense
  data cards).

## 5. Film Grain

A fixed, decorative grain overlay covers the whole viewport — mounted once in
`App.jsx` (`<div aria-hidden="true" className="grain-overlay" />`):

- **Fixed** (`position: fixed; inset: 0; z-index: 40`), `pointer-events: none`.
- `opacity: 0.035`, inline SVG `feTurbulence fractalNoise`.
- Never attach grain to a scrolling container; it is a global fixed layer only.

## 6. Spacing Rhythm

| Token | Value |
| --- | --- |
| `.section-padding` | `6rem 1.5rem` (mobile) → `8rem 2rem` (≥768px) → `10rem 2rem` (≥1024px) |
| `.content-container` | `max-width: 1240px; margin: 0 auto` |
| Section header gap | `mb-14 … mb-20` between header block and grid |
| Card grid gap | `gap-4 md:gap-6` (dense) / `gap-5` (standard) / `gap-8 lg:gap-12` (editorial) |
| Card padding | `p-6 md:p-8` standard, `p-5` dense data cards |

Layout rule: **mobile-first with explicit base `grid-cols-1`** on every
responsive grid (enforced by `npm run guard:grid`). Asymmetric spans reset to
`col-span-1` below `lg`.

## 7. Supporting Primitives

| Class | Purpose |
| --- | --- |
| `.eyebrow` / `.eyebrow-dark` | Pill-shaped mono section label: `0.68rem`, `tracking 0.2em`, uppercase, gradient dot `::before`, `border-radius 999px`. Dark variant for charcoal sections. |
| `.btn-primary` / `.btn-secondary` / `.btn-accent` | Pill CTAs (`999px`, `1rem 1.75rem`, `font-weight 700`) with `ease-luxe` transitions. **Button-in-button icon**: trailing arrow sits in its own `h-8 w-8 rounded-full` circle (e.g. `bg-white/15` on primary), translating `group-hover:translate-x-0.5 -translate-y-0.5`. |
| `.stat-pill` | Floating stat chips (hero trust markers). |
| `.feature-list` | Dotted list with gradient bullet (`::before`). |
| `.hero-gradient` | Radial mesh for light sections (blue top + amber right). |
| `.page-hero-*` | PageHero orbs, crumb pills, meta items — the shared hero chrome. |
| `.forensic-grid` | The grid-line texture (subtle on light, `opacity-[0.04]` on dark). |

## 8. Checklist for a new public surface

- [ ] Uses the shared `PageHero` (do not hand-roll a hero).
- [ ] Every card is `bezel-shell` + `bezel-core` (dark variants on charcoal sections), `h-full` on both.
- [ ] Entrance + hover motion uses `LUXE = [0.32, 0.72, 0, 1]`, transform/opacity only.
- [ ] Section headers: eyebrow pill + `font-serif … lg:text-[3.4rem] lg:leading-[1.05]`.
- [ ] All responsive grids declare base `grid-cols-1` (passes `npm run guard:grid`).
- [ ] No new colors/fonts — extend `@theme` only if the brand needs it, then update this doc.
- [ ] Passes: vitest, lint, `npm run build`, `npm run audit:responsive`.

---

**Related docs:** `docs/design/DESIGN_SPEC.md` (older draft — its Instrument
Serif / IBM Plex Sans / `#FDFCFB` values are **superseded** by this layer's
Plus Jakarta Sans / Fraunces / `#f6f2ea`); `docs/brand/design-system-guide.md`
(brand foundation); `docs/engineering/PUBLIC_COPY_OVERCLAIM_AUDIT.md` (what
the public pages may claim — keep copy honest when designing against these
tokens).
