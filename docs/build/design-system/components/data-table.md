# Data Table

**Status:** 🔵 proposed
**Last updated:** 2026-05-24

## What it is

A structured table for displaying rows of send records with columns, optional filtering, and expandable rows.

## When to use it

Use for the Send Log — the primary data display surface. Not for forms or single-item details.

## Variants

| Variant | When |
| --- | --- |
| `default` | Standard send log table |
| `expandable` | Rows can be expanded to show error detail (failed sends) |

## Structure

- **Column header row:** `text.label` (sm, medium weight), `colour.neutral.text.muted`, `colour.neutral.border` bottom border
- **Data rows:** `layout.table.row.height` (48px minimum), alternating `colour.neutral.background` / `colour.neutral.surface` for scannability
- **Monospace columns:** timestamp and message ID use `text.mono` style
- **Status column:** contains `Badge` component
- **Expandable row:** chevron icon in rightmost column; expanded area shows error detail in `colour.semantic.error.bg` with `text.body.sm`

## States

| State | Behaviour |
| --- | --- |
| default | Standard row |
| hover | Row background shifts to `colour.neutral.surface`, `motion.duration.fast` |
| expanded | Row shows detail panel below, chevron rotates 180° |
| empty | Replaced by `EmptyState` component |

## Tokens consumed

- **Colour:** `colour.neutral.border`, `colour.neutral.surface`, `colour.semantic.error.bg`
- **Typography:** `text.label` (headers), `text.body.sm` (cells), `text.mono` (timestamps, IDs)
- **Spacing:** `space.4` horizontal cell padding, `space.2` vertical cell padding
- **Motion:** `motion.duration.fast` on hover, `motion.duration.base` on expand

## Accessibility

- `<table>` with proper `<th scope="col">` headers
- Keyboard: Tab navigates to rows, Enter expands/collapses
- Expanded state announced via `aria-expanded`
- Failed rows: `colour.semantic.error` badge + text, not colour alone

## Examples

| Surface | Usage |
| --- | --- |
| [Send Log](../../ui-ux/send-log.md) | Primary send history table |
