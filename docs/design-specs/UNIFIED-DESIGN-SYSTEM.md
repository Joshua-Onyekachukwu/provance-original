# Provance Unified Design System — Master Spec

**Version:** 1.0 | **Date:** 2026-07-24  
**Full report:** Delegation session `f06961ef-4100-4fcd-930c-26f84334d622`  
**Authority:** Single source of truth for ALL visual design across the entire Provance frontend (31 pages).

## Quick-Reference Token Cheat Sheet

### Eyebrow Labels (UNIFIED — admin + user)
```
font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light
```

### Page Titles
```
font-serif text-3xl text-charcoal sm:text-4xl
```

### Section Headings
```
font-serif text-2xl text-charcoal
```

### Body Text
```
text-sm leading-relaxed text-charcoal-mid
```

### Card Container
```
rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm
```

### Input Field
```
rounded-xl border border-stone-light bg-parchment px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-light focus:outline-none focus:ring-2 focus:ring-charcoal/20 focus:border-charcoal/35
```

### Primary Button (md)
```
inline-flex items-center justify-center gap-2 rounded-xl bg-charcoal px-4 py-2.5 text-sm font-medium text-parchment transition hover:bg-charcoal-soft
```

### Skeleton
```
animate-pulse rounded-2xl bg-stone-light/50
```

### Focus Ring (Universal)
```
focus:outline-none focus-visible:ring-2 focus-visible:ring-charcoal/20 focus-visible:ring-offset-2
```

## Color Palette

| Token | Hex | Tailwind |
|---|---|---|
| Charcoal | #13161d | text-charcoal / bg-charcoal |
| Charcoal-soft | #1c2230 | hover:bg-charcoal-soft |
| Charcoal-mid | #546071 | text-charcoal-mid |
| Charcoal-light | #7d8797 | text-charcoal-light |
| Parchment | #f6f2ea | bg-parchment |
| White-warm | #fffdf9 | bg-white-warm |
| Stone-light | #dde3ea | border-stone-light |

**Semantic:** emerald (success/complete), sky (info/processing), amber (warning/deferred), rose (danger/failed)

## Border Radius

| Class | px | Usage |
|---|---|---|
| rounded-xl | 12px | Buttons, inputs, selects |
| rounded-2xl | 16px | Nested blocks, attention cards |
| rounded-3xl | 24px | Section cards, StatCard |
| rounded-[2rem] | 32px | Premium hero panels |

## Spacing

| Token | Class | Usage |
|---|---|---|
| Section gap | space-y-8 / mt-8 | Between major sections |
| Card gap | gap-4 | Between cards in grid |
| Panel gap | gap-6 | Side-by-side panels |
| Card padding (std) | p-6 | SectionCard |
| Card padding (compact) | p-5 | StatCard |

## Typography

| Role | Class |
|---|---|
| Headings | font-serif |
| Body/UI | (default sans) |
| Labels/Code | font-mono |
| Stat values | font-serif text-4xl |
| Eyebrow labels | font-mono text-[11px] uppercase tracking-[0.22em] |

## Key Principles

1. One StatCard — unified across admin + user dashboard
2. One eyebrow label standard — `font-mono text-[11px] uppercase tracking-[0.22em]` everywhere
3. One input radius — `rounded-xl` for all form controls
4. One focus ring — applied to every interactive element
5. States before happy path — every component handles loading, empty, error, populated
6. Accessibility by default — WCAG 2.1 AA minimum

*Full 9-section design system with 30+ component specs available in delegation session f06961ef*
