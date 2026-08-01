# Design — ScienceTrend Hub

A locked design system for ScienceTrend Hub. Every page redesign reads this file before emitting code. Do not regenerate per page — extend or amend this file when the system needs to grow.

## Genre
editorial / modern-minimal (Technical-Editorial)

## Macrostructure Family
- Marketing pages (HomePage): Marquee Hero (Macro 03) + Feature Stack (Macro 16)
- App pages (Dashboard, Trends, Papers, Reports, Admin): Workbench (Macro 05) + Stat-Led (Macro 04)
- Content pages (PaperDetail, Formatted Reports): Long Document (Macro 02)

## Theme
- `--color-paper`: oklch(0.98 0.005 240) /* #f6f8fb */
- `--color-paper-2`: oklch(0.96 0.01 240) /* #eef2f7 */
- `--color-surface`: oklch(1 0 0) /* #ffffff */
- `--color-surface-dark`: oklch(0.12 0.03 165) /* #091612 */
- `--color-ink`: oklch(0.18 0.04 240) /* #0f172a */
- `--color-ink-2`: oklch(0.35 0.03 240) /* #334155 */
- `--color-muted`: oklch(0.50 0.03 240) /* #64748b */
- `--color-rule`: oklch(0.91 0.01 240) /* #e2e8f0 */
- `--color-accent-primary`: oklch(0.55 0.22 260) /* #2563eb */
- `--color-accent-emerald`: oklch(0.68 0.19 160) /* #10b981 */
- `--color-accent-violet`: oklch(0.52 0.24 290) /* #7c3aed */
- `--color-focus`: oklch(0.60 0.20 250) /* rgba(37, 99, 235, 0.45) */

## Typography
- Display: "Outfit", sans-serif, weight 700/800, style normal (No italic headers)
- Body: "DM Sans", sans-serif, weight 400/500/600, style normal
- Mono: "ui-monospace", "SFMono-Regular", "Consolas", monospace
- Display tracking: -0.03em
- Type scale anchor: clamp(24px, 2.5vw, 36px)

## Spacing & Geometry
- Spacing Scale: 4-point scale (`--space-3xs`: 0.25rem to `--space-3xl`: 7rem)
- Radius Scale: `--r-sm`: 10px, `--r-md`: 14px, `--r-lg`: 18px, `--r-xl`: 24px, `--r-full`: 999px
- Container Bounds: Max width `1440px`

## Motion
- Easings: `cubic-bezier(0.16, 1, 0.3, 1)` (named `--ease-out`)
- Reveal Pattern: Fade + subtle 8px Y-translation
- Reduced-motion fallback: opacity-only, ≤ 150 ms

## Microinteractions & State Discipline
- Every interactive element supports 8 states: default, hover, focus-visible, active, disabled, loading, error, success.
- Link underline: Banned globally (`a { text-decoration: none !important; }`).
- Interactive hover: Subtle scale/lift (`translateY(-2px)`), smooth border-color glow.

## CTA Voice & Navigation
- Primary CTA: Pill or rounded rectangle (`border-radius: 12px`), gradient fill, white text, subtle shadow, no underline.
- Secondary CTA: Translucent soft fill with hairline border (`border: 1px solid var(--st-border)`).
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
