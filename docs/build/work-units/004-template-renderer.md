# Work Unit 004 — Template Renderer — React Email → HTML

**Status:** 🔵 proposed
**For:** [P001 — Indie SaaS Developer](../personas/P001-indie-dev.md)
**Last updated:** 2026-05-24

**Depends on:** [WU-001 — Project scaffolding](001-project-scaffolding.md)

## What's done when this ships

The Template Renderer accepts an email category and a props object, renders the corresponding React Email component to both an HTML string and a plain-text string, and returns both. One template exists per category (`magic_link`, `promotional`, `update`) — minimal but correct. Mail Sender calls the renderer to produce the `{ html, text }` body it passes to the provider adapter. All three templates meet D008 deliverability standards: text-first, preheader included, unsubscribe placeholder in bulk templates, no spam-trigger words.

## Walkthrough

1. Mail Sender calls `renderTemplate('magic_link', { url: 'https://...' })`.
2. Renderer imports `MagicLinkEmail` React Email component, renders to `{ html, text }` via `@react-email/render`.
3. Returns `{ html: string, text: string }` — no side effects, no I/O.

P001 customising a template:
1. Opens `src/templates/magic-link.tsx`, edits the React Email component.
2. Calls `renderTemplate` — gets updated `{ html, text }` immediately.

**Template props schemas (D008):**
- `magic_link`: `{ url: string }`
- `promotional`: `{ subject: string, body: string, unsubscribeUrl: string }`
- `update`: `{ subject: string, body: string, unsubscribeUrl: string }`

**What if something goes wrong:**
- Unknown category: throws `TemplateError` with `{ code: 'UNKNOWN_TEMPLATE', category }`.
- Render failure: throws `TemplateError` with `{ code: 'RENDER_FAILED', cause }`.

## How we'll know it's done

1. `renderTemplate('magic_link', { url: 'https://example.com' })` returns `{ html, text }` — both non-empty, html contains the URL, text is non-empty.
2. `renderTemplate('promotional', { subject: 'Hello', body: 'World', unsubscribeUrl: 'https://example.com/unsub' })` returns `{ html, text }` — html contains the unsubscribeUrl as a visible link.
3. `renderTemplate('update', { subject: 'Hello', body: 'World', unsubscribeUrl: 'https://example.com/unsub' })` returns `{ html, text }` — html contains the unsubscribeUrl as a visible link.
4. All three templates include a preheader text element in the HTML.
5. Unknown category throws `TemplateError` with `code: 'UNKNOWN_TEMPLATE'`.
6. No template contains images, JavaScript, or external CSS files.
7. `npx vitest run` exits 0.

## Notes / log

### 2026-05-24 — initial filing

Can run in parallel with WU-002 and WU-003 after WU-001 lands. Templates are minimal for Phase 1 — the goal is a working renderer, not polished email design. P001 will customise templates after the pipeline works end-to-end.
