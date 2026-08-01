# Design — ScienceTrend Hub

Locked v2 design system for ScienceTrend Hub. Every page must read this file before emitting UI code. Extend this system; do not regenerate a separate visual language per route.

## Genre

Modern-minimal research software with an analytical, technical voice. The interface should feel like a reliable instrument: quiet surfaces, compact controls, crisp typography, and one cobalt signal color.

## Macrostructure Family

- Marketing pages: Ecosystem Index + Split Diptych. The home page introduces the search → save → track → report loop before feature detail.
- App pages: Bento Grid + search-first workbar. Irregular spans establish hierarchy while hairline rules keep dense data calm.
- Content pages: Long Document with a narrow utility rail or reference pane when the content needs persistent actions.
- Auth pages: Split Diptych on wide screens; a focused single-panel form on small screens.

## Theme — Cobalt

- Paper: `oklch(0.982 0.006 252)`; surface: `oklch(0.995 0.003 252)`.
- Graphite shell: `oklch(0.205 0.025 258)`.
- Ink: `oklch(0.225 0.032 258)`; neutral copy: `oklch(0.455 0.022 258)`.
- Rules: `oklch(0.875 0.016 252)` and `oklch(0.765 0.022 252)`.
- Cobalt signal: `oklch(0.555 0.205 258)`; use for action, focus, selection, and a small number of data marks.
- Status colors are semantic only. Data series use tonal cobalt, not a rainbow palette.
- Gradients, glass effects, glow, and decorative art are banned in app pages.

## Typography

- Display: `Space Grotesk`, weight 600/700, tracking `-0.038em`.
- Body: `IBM Plex Sans`, weight 400/500/600.
- Outlier/data: `JetBrains Mono` for IDs, shortcuts, and dense numerical annotations only.
- Page headings use sentence case. Uppercase is reserved for compact navigation and form labels.
- Display size: `clamp(3rem, 6.5vw, 5rem)`; app titles remain compact.

## Spacing & Geometry

- Compact 4-point rhythm, with a 2px micro-step only for optical alignment.
- Card radius: `12px`; input radius: `8px`; small radius: `6px`.
- Pills are reserved for status, compact filters, and counts.
- Hairline rules carry structure; shadows are quiet and never the primary separator.
- Desktop app shell: compact graphite sidebar + one-row workbar. Mobile app shell: menu/title row + full-width search row.

### Soft Marketing & Auth Variant

- Home and authentication routes may use a softer shell without changing the compact application geometry.
- Marketing/auth outer surfaces use `--radius-marketing: 28px`; feature panels use `--radius-feature: 20px`; controls use `--radius-control: 14px`.
- Marketing display type uses `--text-marketing-display: clamp(2.75rem, 4.5vw, 4.25rem)` at weight 600. Auth display type uses `--text-auth-display: clamp(2.65rem, 4.6vw, 4.15rem)`.
- Separation comes from hairline rules plus `--shadow-soft`; controls may use `--shadow-control`. No glow, glass, gradient, or decorative blur is introduced.
- Light marketing/auth surfaces use `--color-focus-surface: oklch(0.260 0.100 245)` so keyboard focus clears 3:1 against both paper and cobalt controls; dark panels use a paper-coloured focus outline.
- Home navigation may use a detached N5-like rounded surface. App navigation remains the compact graphite shell described above.

## Motion & States

- Named easing only: `--ease-out`, `--ease-in`, `--ease-in-out`.
- Micro/short/long durations: `120ms / 220ms / 420ms`.
- The motion vocabulary is capped at three primitives per page: `page-enter` for one-shot route/hero arrival, `data-reveal` for bars and progress values, and `surface-enter` for menus, drawers, toasts, and modals.
- `page-enter` moves a single page root by 8px; Home and Login may split the same entrance across their two primary columns with a 60ms offset. No section-by-section scroll reveal is allowed.
- `data-reveal` scales only the visual fill from its baseline and never animates layout dimensions. `surface-enter` changes direction through scoped variables while retaining one shared keyframe.
- Hover uses one signal: either a surface shift or a 1px lift.
- Every control supports default, hover, focus-visible, active, disabled, loading, error, and success.
- Reduced-motion renders every decorative entrance in its final static state; functional loading indicators remain visible at a slower rate.

## Navigation & Components

- App navigation: graphite sidebar, icon + plain-language label, cobalt active rail.
- Workbar: route title, persistent catalog search, then account/system actions.
- Home navigation: three-section header with product links kept subordinate to the research CTA.
- Cards: one primary dark metric may anchor a bento cluster; adjacent cards stay light.
- Chips: outlined or tonal only. No oversized rounded containers around ordinary text.
- Footer: inline ruled single-line footer on marketing/content pages.

## Content Voice

- Audience: students, lecturers, researchers, and research operations staff.
- Product loop: search publications → save evidence → track journals/topics → prepare reports.
- Copy is direct and task-based. Avoid vague transformation language and redundant eyebrow/headline pairs.

## What Every Page Must Share

- ScienceTrend logotype and cobalt focus treatment.
- Space Grotesk + IBM Plex Sans + JetBrains Mono roles.
- Paper/graphite/cobalt palette and 4-point spacing rhythm.
- Visible keyboard focus, 44px minimum touch targets, responsive overflow protection.
- No changes to route, API, hook, context, service, or authorization behavior for visual-only work.

## Exports

`tokens.css` at the project root is the runtime source of truth. These portable mappings mirror it for other toolchains.

### tokens.css

```css
:root {
  --color-paper: oklch(0.982 0.006 252);
  --color-paper-2: oklch(0.958 0.010 252);
  --color-paper-3: oklch(0.928 0.014 252);
  --color-surface: oklch(0.995 0.003 252);
  --color-graphite: oklch(0.205 0.025 258);
  --color-ink: oklch(0.225 0.032 258);
  --color-ink-2: oklch(0.335 0.026 258);
  --color-neutral: oklch(0.455 0.022 258);
  --color-muted: oklch(0.545 0.020 258);
  --color-rule: oklch(0.875 0.016 252);
  --color-rule-2: oklch(0.765 0.022 252);
  --color-accent: oklch(0.555 0.205 258);
  --color-accent-ink: oklch(0.985 0.006 252);
  --color-focus: oklch(0.690 0.165 245);
  --color-focus-surface: oklch(0.260 0.100 245);
  --font-display: "Space Grotesk", "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;
  --font-body: "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;
  --font-outlier: "JetBrains Mono", ui-monospace, monospace;
  --space-3xs: 0.125rem;
  --space-2xs: 0.25rem;
  --space-xs: 0.5rem;
  --space-sm: 0.75rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  --space-2xl: 3rem;
  --space-3xl: 4.5rem;
  --space-4xl: 7rem;
  --radius-card: 12px;
  --radius-input: 8px;
  --radius-small: 6px;
  --radius-pill: 999px;
  --radius-marketing: 28px;
  --radius-feature: 20px;
  --radius-control: 14px;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
}
```

### Tailwind v4 `@theme`

```css
@theme {
  --color-paper: oklch(0.982 0.006 252);
  --color-paper-2: oklch(0.958 0.010 252);
  --color-paper-3: oklch(0.928 0.014 252);
  --color-rule: oklch(0.875 0.016 252);
  --color-rule-2: oklch(0.765 0.022 252);
  --color-ink: oklch(0.225 0.032 258);
  --color-ink-2: oklch(0.335 0.026 258);
  --color-accent: oklch(0.555 0.205 258);
  --color-focus: oklch(0.690 0.165 245);
  --color-focus-surface: oklch(0.260 0.100 245);
  --font-display: "Space Grotesk", "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;
  --font-body: "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;
  --font-outlier: "JetBrains Mono", ui-monospace, monospace;
  --spacing-xs: 0.5rem;
  --spacing-sm: 0.75rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --radius-card: 12px;
  --radius-input: 8px;
  --radius-marketing: 28px;
  --radius-feature: 20px;
  --radius-control: 14px;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}
```

### DTCG `tokens.json`

```json
{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "color": {
    "paper": { "$value": "oklch(0.982 0.006 252)", "$type": "color" },
    "paper-2": { "$value": "oklch(0.958 0.010 252)", "$type": "color" },
    "rule": { "$value": "oklch(0.875 0.016 252)", "$type": "color" },
    "ink": { "$value": "oklch(0.225 0.032 258)", "$type": "color" },
    "accent": { "$value": "oklch(0.555 0.205 258)", "$type": "color" },
    "focus": { "$value": "oklch(0.690 0.165 245)", "$type": "color" },
    "focus-surface": { "$value": "oklch(0.260 0.100 245)", "$type": "color" }
  },
  "font": {
    "display": { "$value": "Space Grotesk, IBM Plex Sans, ui-sans-serif, system-ui, sans-serif", "$type": "fontFamily" },
    "body": { "$value": "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif", "$type": "fontFamily" },
    "outlier": { "$value": "JetBrains Mono, ui-monospace, monospace", "$type": "fontFamily" }
  },
  "space": {
    "xs": { "$value": "0.5rem", "$type": "dimension" },
    "sm": { "$value": "0.75rem", "$type": "dimension" },
    "md": { "$value": "1rem", "$type": "dimension" },
    "lg": { "$value": "1.5rem", "$type": "dimension" },
    "xl": { "$value": "2rem", "$type": "dimension" }
  },
  "duration": {
    "micro": { "$value": "120ms", "$type": "duration" },
    "short": { "$value": "220ms", "$type": "duration" },
    "long": { "$value": "420ms", "$type": "duration" }
  }
}
```

### shadcn/ui CSS variables

```css
:root {
  --background: 98.2% 0.006 252;
  --foreground: 22.5% 0.032 258;
  --card: 99.5% 0.003 252;
  --card-foreground: 22.5% 0.032 258;
  --popover: 99.5% 0.003 252;
  --popover-foreground: 22.5% 0.032 258;
  --primary: 55.5% 0.205 258;
  --primary-foreground: 98.5% 0.006 252;
  --secondary: 92.8% 0.014 252;
  --secondary-foreground: 33.5% 0.026 258;
  --muted: 87.5% 0.016 252;
  --muted-foreground: 54.5% 0.020 258;
  --accent: 55.5% 0.205 258;
  --accent-foreground: 98.5% 0.006 252;
  --destructive: 52.5% 0.185 25;
  --destructive-foreground: 98.5% 0.006 252;
  --border: 87.5% 0.016 252;
  --input: 76.5% 0.022 252;
  --ring: 69% 0.165 245;
  --radius: 12px;
}
```
