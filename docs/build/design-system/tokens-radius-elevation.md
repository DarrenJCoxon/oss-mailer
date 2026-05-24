# Radius & Elevation Tokens

**Status:** 🔵 proposed
**Last updated:** 2026-05-24

Slightly rounded — not sharp, not pill-shaped. Clean developer aesthetic. Elevation is subtle; this is a data tool, not a layered consumer UI. Dark mode uses border-based separation rather than shadows.

---

## Border radius

| Token | Value | Usage |
| --- | --- | --- |
| `radius.sm` | `4px` | Badges, status indicators |
| `radius.md` | `6px` | Buttons, inputs, form fields |
| `radius.lg` | `8px` | Cards, panels |
| `radius.xl` | `12px` | Modals, large containers |
| `radius.full` | `9999px` | Pills (reserved for future use) |

---

## Elevation (shadows)

Used sparingly. Light mode only — dark mode uses `colour.neutral.border` for separation.

| Token | Value | Usage |
| --- | --- | --- |
| `shadow.none` | `none` | Default surface, table rows |
| `shadow.sm` | `0 1px 2px 0 rgba(0,0,0,0.05)` | Subtle card lift (light mode) |
| `shadow.md` | `0 4px 6px -1px rgba(0,0,0,0.10), 0 2px 4px -2px rgba(0,0,0,0.10)` | Modal, dropdown (light mode) |
