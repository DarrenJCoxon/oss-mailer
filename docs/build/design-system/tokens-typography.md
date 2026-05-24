# Typography Tokens

**Status:** 🔵 proposed
**Last updated:** 2026-05-24

Desktop-first, data-dense. Two families: **Inter** for all UI text, **JetBrains Mono** for timestamps, IDs, email addresses, and any data that benefits from monospacing.

---

## Font families

| Token | Value | Usage |
| --- | --- | --- |
| `font.family.sans` | `'Inter', system-ui, -apple-system, sans-serif` | All UI text |
| `font.family.mono` | `'JetBrains Mono', 'Fira Code', ui-monospace, monospace` | Timestamps, message IDs, email addresses in tables |

Loaded via Google Fonts. Inter weights: 400, 500, 600. JetBrains Mono weight: 400 only.

---

## Size scale

| Token | rem | px | Usage |
| --- | --- | --- | --- |
| `text.size.xs` | `0.75rem` | `12px` | Badge text, table metadata |
| `text.size.sm` | `0.875rem` | `14px` | Table body, form labels, secondary UI |
| `text.size.base` | `1rem` | `16px` | Body copy, form field values |
| `text.size.lg` | `1.125rem` | `18px` | Section headings |
| `text.size.xl` | `1.25rem` | `20px` | Page sub-headings |
| `text.size.2xl` | `1.5rem` | `24px` | Page headings (`<h1>`) |
| `text.size.3xl` | `1.875rem` | `30px` | Display headings (README / marketing only) |

---

## Weight variants

| Token | Value | Usage |
| --- | --- | --- |
| `font.weight.normal` | `400` | Body text, table cells, mono data |
| `font.weight.medium` | `500` | Labels, nav items, button text |
| `font.weight.semibold` | `600` | Headings, badge text, column headers |

---

## Line height

| Token | Value | Usage |
| --- | --- | --- |
| `line.height.tight` | `1.25` | Headings, badges, compact UI |
| `line.height.snug` | `1.375` | Table rows, form labels |
| `line.height.normal` | `1.5` | Body copy |

---

## Named text styles

| Style | Family | Size token | Weight | Line height | Usage |
| --- | --- | --- | --- | --- | --- |
| `text.page.title` | sans | 2xl | semibold | tight | `<h1>` page headings |
| `text.section.heading` | sans | lg | semibold | tight | `<h2>` section titles |
| `text.label` | sans | sm | medium | snug | Form labels, table column headers |
| `text.body` | sans | base | normal | normal | Body copy |
| `text.body.sm` | sans | sm | normal | normal | Secondary body, descriptions |
| `text.mono` | mono | sm | normal | snug | Timestamps, IDs, email addresses |
| `text.badge` | sans | xs | semibold | tight | Badge / status text |
