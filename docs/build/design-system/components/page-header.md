# Page Header

**Status:** 🔵 proposed
**Last updated:** 2026-05-24

## What it is

The top section of every page — page title, optional subtitle, optional primary action.

## When to use it

Once per page, at the top of the main content area. Not inside cards or modals.

## Variants

| Variant | When |
| --- | --- |
| `title-only` | Simple pages with no action (Config Health) |
| `title-action` | Pages with a primary action alongside the title |

## Structure

- **Title:** `text.page.title` style (2xl, semibold, `colour.neutral.text.heading`)
- **Subtitle (optional):** `text.body.sm` style (`colour.neutral.text.muted`), `space.1` below title
- **Primary action (optional):** `Button` (primary variant), right-aligned on desktop

## Tokens consumed

- **Colour:** `colour.neutral.text.heading`, `colour.neutral.text.muted`
- **Typography:** `text.page.title`, `text.body.sm`
- **Spacing:** `space.8` padding below header, `space.16` padding top

## Examples

| Surface | Variant | Title |
| --- | --- | --- |
| [Send Log](../../ui-ux/send-log.md) | title-only | "Send Log" |
| [Test Send](../../ui-ux/test-send.md) | title-only | "Test Send" |
| [Config Health](../../ui-ux/config-health.md) | title-only | "Configuration" |
