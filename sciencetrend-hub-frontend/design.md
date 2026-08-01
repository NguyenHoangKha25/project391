# Design — ScienceTrend Hub

A locked design system for ScienceTrend Hub. Every page redesign reads this file before emitting code. Do not regenerate per page — extend or amend this file when the system needs to grow.

## Genre
editorial / modern-minimal (Technical-Editorial)

## Macrostructure Family
- Marketing pages (HomePage): Marquee Hero (Macro 03) + Feature Stack (Macro 16)
- App pages (Dashboard, Trends, Papers, Reports, Admin): Workbench (Macro 05) + Stat-Led (Macro 04)
- Content pages (PaperDetail, Formatted Reports): Long Document (Macro 02)

## Theme
- `--color-paper`: oklch(0.98 0.005 240)
- `--color-paper-2`: oklch(0.955 0.01 240)
- `--color-paper-3`: oklch(0.925 0.014 240)
- `--color-surface`: oklch(0.99 0.004 240)
- `--color-surface-dark`: oklch(0.16 0.028 240)
- `--color-ink`: oklch(0.18 0.04 240) /* #0f172a */
- `--color-ink-2`: oklch(0.35 0.03 240) /* #334155 */
- `--color-muted`: oklch(0.50 0.03 240) /* #64748b */
- `--color-rule`: oklch(0.86 0.014 240)
- `--color-rule-2`: oklch(0.70 0.018 240)
- `--color-accent-primary`: oklch(0.52 0.19 260)
- `--color-accent-ink`: oklch(0.98 0.005 240)
- `--color-focus`: oklch(0.56 0.21 255)

## Typography
- Display: "Outfit", sans-serif, weight 700/800, style normal (No italic headers)
- Body: "DM Sans", sans-serif, weight 400/500/600, style normal
- Mono: "ui-monospace", "SFMono-Regular", "Consolas", monospace
- Display tracking: -0.03em
- Type scale anchor: clamp(24px, 2.5vw, 36px)

## Spacing & Geometry
- Spacing Scale: 4-point scale (`--space-3xs`: 0.25rem to `--space-3xl`: 7rem)
- Radius Scale: `--radius-input`: 4px, `--radius-card`: 6px, `--radius-pill`: 999px. Pill is reserved for compact status only.
- Container Bounds: Max width `1440px`

## Motion
- Easings: `cubic-bezier(0.16, 1, 0.3, 1)` (named `--ease-out`)
- Reveal Pattern: Fade + subtle 8px Y-translation
- Reduced-motion fallback: opacity-only, ≤ 150 ms

## Microinteractions & State Discipline
- Every interactive element supports 8 states: default, hover, focus-visible, active, disabled, loading, error, success.
- Link underline: Banned globally (`a { text-decoration: none !important; }`).
- Interactive hover: one signal only: a 1px lift or a surface shift. No glow and no multi-effect hover.

## CTA Voice & Navigation
- Primary CTA: compact rectangular control, ink fill, paper text, no gradient and no shadow.
- Secondary CTA: transparent surface with an ink or rule hairline.
- Sidebar Nav: Clean icon + text rows, active pill state with accent indicator dot, no link underlines.

## Per-page Allowances
- Marketing pages MAY use SVG illustrations and hero visual cards.
- App pages MUST NOT use decorative art — function and data density carry the page.
- Content pages: Clean typographic hierarchy and high readability.

## What pages MUST share
- Logotype branding.
- Primary accent placement (≤ 5% per viewport).
- Display ("Outfit") and body ("DM Sans") font pairing.
- Zero link underlines across all menus and cards.
- Consistent section heading rhythm.

## Exports

`tokens.css` at the project root is the runtime source of truth. The blocks below are portable mappings for other toolchains.

### tokens.css

```css
:root {
  --color-paper: oklch(0.98 0.005 240);
  --color-paper-2: oklch(0.955 0.01 240);
  --color-paper-3: oklch(0.925 0.014 240);
  --color-rule: oklch(0.86 0.014 240);
  --color-rule-2: oklch(0.70 0.018 240);
  --color-muted: oklch(0.50 0.03 240);
  --color-neutral: oklch(0.42 0.025 240);
  --color-ink-2: oklch(0.34 0.03 240);
  --color-ink: oklch(0.18 0.04 240);
  --color-accent: oklch(0.52 0.19 260);
  --color-accent-ink: oklch(0.98 0.005 240);
  --color-focus: oklch(0.56 0.21 255);
  --font-display: "Outfit", "DM Sans", ui-sans-serif, system-ui, sans-serif;
  --font-body: "DM Sans", ui-sans-serif, system-ui, sans-serif;
  --font-outlier: ui-monospace, "SFMono-Regular", "Cascadia Code", monospace;
  --space-3xs: 0.25rem;
  --space-2xs: 0.5rem;
  --space-xs: 0.75rem;
  --space-sm: 1rem;
  --space-md: 1.5rem;
  --space-lg: 2rem;
  --space-xl: 3rem;
  --space-2xl: 4.5rem;
  --space-3xl: 7rem;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --radius-card: 6px;
  --radius-input: 4px;
  --radius-pill: 999px;
}
```

### Tailwind v4 `@theme`

```css
@theme {
  --color-paper: oklch(0.98 0.005 240);
  --color-paper-2: oklch(0.955 0.01 240);
  --color-paper-3: oklch(0.925 0.014 240);
  --color-rule: oklch(0.86 0.014 240);
  --color-ink: oklch(0.18 0.04 240);
  --color-accent: oklch(0.52 0.19 260);
  --font-display: "Outfit", "DM Sans", ui-sans-serif, system-ui, sans-serif;
  --font-body: "DM Sans", ui-sans-serif, system-ui, sans-serif;
  --spacing-sm: 1rem;
  --spacing-md: 1.5rem;
  --spacing-lg: 2rem;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --radius-card: 6px;
  --radius-input: 4px;
}
```

### DTCG `tokens.json`

```json
{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "color": {
    "paper": { "$value": "oklch(0.98 0.005 240)", "$type": "color" },
    "paper-2": { "$value": "oklch(0.955 0.01 240)", "$type": "color" },
    "ink": { "$value": "oklch(0.18 0.04 240)", "$type": "color" },
    "accent": { "$value": "oklch(0.52 0.19 260)", "$type": "color" },
    "focus": { "$value": "oklch(0.56 0.21 255)", "$type": "color" }
  },
  "font": {
    "display": { "$value": "Outfit, DM Sans, ui-sans-serif, system-ui, sans-serif", "$type": "fontFamily" },
    "body": { "$value": "DM Sans, ui-sans-serif, system-ui, sans-serif", "$type": "fontFamily" }
  },
  "space": {
    "sm": { "$value": "1rem", "$type": "dimension" },
    "md": { "$value": "1.5rem", "$type": "dimension" },
    "lg": { "$value": "2rem", "$type": "dimension" }
  }
}
```

### shadcn/ui CSS variables

```css
:root {
  --background: 98% 0.005 240;
  --foreground: 18% 0.04 240;
  --card: 95.5% 0.01 240;
  --card-foreground: 18% 0.04 240;
  --primary: 52% 0.19 260;
  --primary-foreground: 98% 0.005 240;
  --secondary: 92.5% 0.014 240;
  --secondary-foreground: 34% 0.03 240;
  --muted: 86% 0.014 240;
  --muted-foreground: 50% 0.03 240;
  --border: 86% 0.014 240;
  --input: 70% 0.018 240;
  --ring: 56% 0.21 255;
  --radius: 6px;
}
```
