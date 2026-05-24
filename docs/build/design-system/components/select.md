# Select

**Status:** 🔵 proposed
**Last updated:** 2026-05-24

## What it is

A dropdown for selecting one option from a constrained list.

## When to use it

Use when options are fixed and known (e.g. email category). Use an `input` for free text.

## Variants

| Variant | When |
| --- | --- |
| `default` | Standard option selection |
| `error` | Invalid selection — red border + error message |
| `disabled` | Not interactive |

## States

Same as `input` — border, focus ring, error, disabled follow identical token rules.

## Tokens consumed

Same as `input`. Chevron icon uses `colour.neutral.text.muted`.

## Accessibility

- Native `<select>` element (accessible by default)
- Label always visible above field
- `aria-invalid` on error state

## Examples

| Surface | Usage |
| --- | --- |
| [Test Send](../../ui-ux/test-send.md) | Email category picker (`magic_link` / `promotional` / `update`) |
