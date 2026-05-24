# Accessibility Commitments

**Status:** 🔵 proposed
**Last updated:** 2026-05-24

These are project-wide promises. Every surface in `ui-ux/` honours them. They are not aspirational — they are gates. A work unit that ships a surface without meeting these commitments is not done.

---

## Standard

**WCAG 2.1 Level AA** across all surfaces.

---

## Colour and contrast

- All body text (`text.body`, `text.body.sm`) meets 4.5:1 contrast against its background — verified in `tokens-colour.md`
- All large text (18px+ regular, 14px+ bold) meets 3:1 contrast
- All UI components (inputs, buttons, badges, focus rings) meet 3:1 contrast against adjacent colours
- Status is never communicated by colour alone — always colour + text or colour + icon

---

## Keyboard navigation

- Every interactive element is reachable via Tab
- Focus order matches visual reading order
- Focus rings are always visible: 2px solid `colour.brand.primary`, 2px offset, `radius.md`
- No keyboard traps anywhere
- Expandable table rows: Enter to expand/collapse, Escape to collapse

---

## Screen reader

- Every interactive element has an accessible name (visible label, or `aria-label` for icon-only controls)
- Page landmarks used correctly: `<header>`, `<main>`, `<nav>` (if navigation added later)
- Heading hierarchy is correct — one `<h1>` per page, `<h2>` for sections
- All form fields have visible, programmatically associated labels (`<label for>`)
- Dynamic content (result panel, filter results) uses `aria-live="polite"`
- Loading states: `aria-busy="true"` on the relevant container

---

## Motion

- All transitions respect `prefers-reduced-motion: reduce` — implemented via Tailwind `motion-safe:` / `motion-reduce:` variants
- No auto-playing animation; no flashing content above 3 Hz

---

## Forms

- Errors described in text, not just colour
- Error messages appear inline next to the affected field, linked via `aria-describedby`
- Required fields marked in text (not asterisk alone)
- Submit button shows loading state after click; `aria-busy="true"` during async send

---

## Dark / light mode

- All colour tokens are defined for both modes (see `tokens-colour.md`)
- Mode follows system preference (`prefers-color-scheme`) by default — no manual toggle required in v1

---

## Testing protocol

- `axe-core` automated scan on every page — zero violations before a WU can ship a surface
- Keyboard-only walkthrough of every new surface before merge
- Screen reader spot-check (VoiceOver/macOS) on any new form or dynamic UI
