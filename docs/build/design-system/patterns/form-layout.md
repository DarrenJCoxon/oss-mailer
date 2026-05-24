# Form Layout

**Status:** 🔵 proposed
**Last updated:** 2026-05-24

## What it is

A stacked form in which labels sit above inputs, fields are full-width, and a primary button sits below the last field.

## When to use it

Any form with two or more inputs. Used on Test Send.

## Anatomy

1. [PageHeader](../components/page-header.md) — page title above the form
2. Label (`text.label`) — sits `space.2` above its field
3. [Input](../components/input.md) or [Select](../components/select.md) — full width of the form container
4. Error message (`text.body.sm`, `colour.semantic.error`) — replaces helper text inline, `space.1` below field
5. `space.5` gap between each field group
6. [Button](../components/button.md) (primary) — `space.6` below last field, right-aligned on desktop

## Tokens consumed

- **Spacing:** `space.2` label-to-field, `space.5` between fields, `space.6` above submit
- **Typography:** `text.label` for labels, `text.body.sm` for errors
- **Breakpoints:** single column at all breakpoints (form is narrow by design — max 480px)

## Behaviour

### At different breakpoints

Single column at all breakpoints. Max width 480px, centred on desktop.

### In different states

| State | Behaviour |
| --- | --- |
| Default | Labels above fields, button below |
| Error | Error message appears below the invalid field; field border turns `colour.semantic.error` |
| Loading | Submit button shows spinner, `aria-busy="true"`, fields disabled |
| Success | [ResultPanel](../components/result-panel.md) appears below the button |

## Examples

| Surface | Usage |
| --- | --- |
| [Test Send](../../ui-ux/test-send.md) | Category select + recipient input + optional subject + send button |
