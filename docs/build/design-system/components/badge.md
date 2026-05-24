# Badge

**Status:** 🔵 proposed
**Last updated:** 2026-05-24

## What it is

A small inline label that communicates status or category at a glance.

## When to use it

Use for send status (success/failed), email category labels, and config check results (✅/❌). Never use colour alone — always pair with text.

## Variants

| Variant | Colours | Usage |
| --- | --- | --- |
| `success` | `colour.semantic.success` text + `colour.semantic.success.bg` | "sent", "✅ configured" |
| `error` | `colour.semantic.error` text + `colour.semantic.error.bg` | "failed", "❌ missing" |
| `warning` | `colour.semantic.warning` text + `colour.semantic.warning.bg` | Partial config warnings |
| `info` | `colour.semantic.info` text + `colour.semantic.info.bg` | Category labels (`magic_link`, `promotional`, `update`) |
| `accent` | `colour.brand.accent` text + light orange bg | Highlighted items |
| `neutral` | `colour.neutral.text.body` text + `colour.neutral.surface` | Default / inactive |

## Tokens consumed

- **Colour:** variant-specific (see above)
- **Typography:** `text.badge` (xs, semibold)
- **Spacing:** `space.1` vertical × `space.2` horizontal
- **Radius:** `radius.sm` (4px)

## Accessibility

- Colour + text always (never colour alone)
- `role="status"` when badge updates dynamically (send result)

## Examples

| Surface | Variant | Content |
| --- | --- | --- |
| [Send Log](../../ui-ux/send-log.md) | success / error | "sent" / "failed" |
| [Config Health](../../ui-ux/config-health.md) | success / error | "✅ set" / "❌ missing" |
