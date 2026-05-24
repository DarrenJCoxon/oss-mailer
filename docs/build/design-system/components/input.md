# Input

**Status:** 🔵 proposed
**Last updated:** 2026-05-24

## What it is

A text field for single-line user input.

## When to use it

Use for free-text entry (email addresses, subject lines). Use `select` for constrained option lists.

## Variants

| Variant | When |
| --- | --- |
| `default` | Standard text input |
| `error` | Input has a validation error — red border, error message below |
| `disabled` | Input is not editable — muted background, `cursor: not-allowed` |

## States

| State | Behaviour |
| --- | --- |
| default | `colour.neutral.border` border, `colour.neutral.background` background |
| focus | Border upgrades to `colour.brand.primary`, `shadow.sm`, `motion.duration.base` |
| error | Border `colour.semantic.error`, error message in `colour.semantic.error` below |
| disabled | Background `colour.neutral.surface`, 50% opacity label |

## Tokens consumed

- **Colour:** `colour.neutral.border` → `colour.brand.primary` on focus
- **Typography:** `text.body` for value, `text.label` for label above
- **Spacing:** `space.3` internal padding, `space.2` between label and field
- **Radius:** `radius.md` (6px)
- **Motion:** `motion.duration.base` on border colour transition

## Accessibility

- Label always visible (no placeholder-as-label)
- Error message linked via `aria-describedby`
- `aria-invalid="true"` on error state
- Fully keyboard accessible

## Examples

| Surface | Usage |
| --- | --- |
| [Test Send](../../ui-ux/test-send.md) | Recipient email address, optional subject override |
