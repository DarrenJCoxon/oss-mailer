# Button

**Status:** 🔵 proposed
**Last updated:** 2026-05-24

## What it is

A clickable element that triggers an action when pressed.

## When to use it

Use for actions that change state or trigger a process. Use a link for navigation between pages.

## Variants

| Variant | When |
| --- | --- |
| `primary` | Main call-to-action — one per region max. Blue (`colour.brand.primary`) background. |
| `secondary` | Supporting actions. Outlined border, transparent background. |
| `ghost` | Low-emphasis actions inside tables or toolbars. No border, no background. |
| `destructive` | Dangerous or irreversible actions. Red (`colour.semantic.error`) background. |

## States

| State | Behaviour |
| --- | --- |
| default | Resting visual |
| hover | Background darkens by one step (`colour.brand.primary.hover`), `motion.duration.fast` |
| focus | 2px offset focus ring in `colour.brand.primary`, `radius.md` |
| active | Slight scale down (0.98) for tactile feel |
| disabled | 50% opacity, `cursor: not-allowed`, not focusable, `aria-disabled` |
| loading | Spinner replaces label, `aria-busy="true"`, not pressable |

## Tokens consumed

- **Colour:** `colour.brand.primary` / variant-specific
- **Typography:** `text.label` (font-size sm, weight medium)
- **Spacing:** `space.2` vertical padding × `space.4` horizontal padding
- **Radius:** `radius.md` (6px)
- **Motion:** `motion.duration.fast` + `motion.ease.standard` on hover/focus

## Accessibility

- Keyboard: Tab to focus, Space or Enter to activate
- Visible focus ring meeting 3:1 contrast vs surrounding surface
- `aria-disabled` when disabled (not just visual)
- `aria-busy` when loading
- Icon-only buttons require `aria-label`

## Examples

| Surface | Variant | Action |
| --- | --- | --- |
| [Test Send](../../ui-ux/test-send.md) | primary | "Send test email" |
