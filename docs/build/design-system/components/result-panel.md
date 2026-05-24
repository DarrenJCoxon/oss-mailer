# Result Panel

**Status:** 🔵 proposed
**Last updated:** 2026-05-24

## What it is

An inline feedback panel that appears after an action completes — success or failure — with the result details.

## When to use it

Appears below the Test Send form after a send attempt. Not a modal — inline, in context.

## Variants

| Variant | Colours | Content |
| --- | --- | --- |
| `success` | `colour.semantic.success.bg` background, `colour.semantic.success` text/icon | "Email sent. Message ID: [mono ID]" |
| `error` | `colour.semantic.error.bg` background, `colour.semantic.error` text/icon | "Send failed. [error message from provider]" |

## Structure

- **Icon:** checkmark (success) or X (error), 20px, left-aligned
- **Heading:** "Sent successfully" or "Send failed" — `text.label` (medium weight)
- **Detail:** message ID (success) or error description (error) — `text.mono` for IDs, `text.body.sm` for error text
- Appears with `motion.duration.base` fade-in; `aria-live="polite"` so screen readers announce it

## Tokens consumed

- **Colour:** variant-specific semantic colours
- **Typography:** `text.label`, `text.mono`, `text.body.sm`
- **Spacing:** `space.4` internal padding, `space.5` margin above (separating from form)
- **Radius:** `radius.lg` (8px)
- **Motion:** `motion.duration.base` fade-in

## Accessibility

- `aria-live="polite"` — result announced to screen readers automatically
- Colour + icon + text (never colour alone)

## Examples

| Surface | Usage |
| --- | --- |
| [Test Send](../../ui-ux/test-send.md) | Shows after send button is pressed |
