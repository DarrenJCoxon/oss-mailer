# Empty State

**Status:** 🔵 proposed
**Last updated:** 2026-05-24

## What it is

A placeholder displayed when a data surface has no content yet.

## When to use it

Replace the DataTable with this component when there are no send records. Also used on any surface that loads data and finds none.

## Structure

- **Icon:** simple envelope or inbox icon, `colour.neutral.text.muted`, 40px
- **Heading:** `text.section.heading` style, `colour.neutral.text.heading`
- **Body:** `text.body.sm` style, `colour.neutral.text.muted`, max 2 sentences
- **CTA link (optional):** `Button` (secondary variant) linking to the relevant next action

## Tokens consumed

- **Colour:** `colour.neutral.text.heading`, `colour.neutral.text.muted`
- **Typography:** `text.section.heading`, `text.body.sm`
- **Spacing:** `space.12` top padding, `space.4` between elements, centred layout

## Examples

| Surface | Heading | Body | CTA |
| --- | --- | --- | --- |
| [Send Log](../../ui-ux/send-log.md) | "No sends yet" | "No emails have been sent through oss-mailer yet." | "Send a test email →" |
