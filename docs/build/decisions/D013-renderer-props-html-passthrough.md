# D013 — Renderer accepts a `props.html` passthrough for pre-rendered HTML sends

| Field | Value |
| --- | --- |
| Status | ✅ accepted |
| Date | 2026-05-25 |
| Affects | `src/renderer/index.tsx`, WU-012, future sends that need custom HTML |
| Supersedes | — |
| Superseded by | — |

## Context

D007 established that the template is derivable from the category — the API caller does not pass a template name, and the renderer owns the HTML. This is the right default for v1: it keeps the API surface minimal and forces template customisation into version-controlled React Email components inside the mailer.

The plug-and-play story exposed in WU-012 surfaced a real use case that the D007 model cannot handle: a developer who already has a digest renderer in their own app (e.g. a server-rendered `incontact` newsletter) wants to send pre-rendered HTML through the mailer without re-implementing the template in `src/templates/`. They have the HTML; they want delivery + logging + provider routing; they should not have to fork the mailer to do it.

Two shapes were on the table. (a) A new `raw_html` category — adds a fourth `EmailCategory` value, requires a corresponding "template" file that is just a passthrough, and creates an awkward special case in the router. (b) A `props.html` passthrough on the existing categories — if the caller supplies `props.html` as a non-empty string, the renderer returns that HTML as-is and skips the template lookup entirely. The category still drives routing (which provider, which env var) and logging (the send-log row records the category accurately).

## Decision

The renderer accepts a `props.html` passthrough on **all** categories. The contract is:

- If `props` is an object and `props.html` is a non-empty string, the renderer returns `{ html: props.html, text: '' }` without invoking any react-email template.
- The category is still validated against the known set — an unknown category throws `TemplateError` with code `UNKNOWN_TEMPLATE` regardless of whether `props.html` was supplied.
- The check happens **after** the category validation and **before** the template registry lookup, so a known-category-with-html call never touches the template registry.
- The text field is empty (`''`) for passthrough sends; the caller is responsible for providing HTML that degrades acceptably for plain-text-only clients (the major email providers all accept HTML-only sends; if a future deployment cares, the caller can pre-render plain text and pass it via a future `props.text` field — out of scope for v1).
- `props.html` must be `string`. If `props.html` is present but not a string, the renderer falls back to template rendering (treating it as if absent) — the type narrowing is deliberate: only the happy path of "a string was supplied" short-circuits.

## Why

The category-as-routing-key is load-bearing in the rest of the system: the router maps category → provider, the queue branches on category, the send log records category. A `raw_html` category would either need its own routing entry (duplicating `update`'s provider mapping in env config — what does `RAW_HTML_PROVIDER` mean?) or special-case the routing layer to fall back to another category's provider. Either path leaks the rendering concern into modules that should not care about HTML.

The `props.html` passthrough keeps category-as-routing-key intact: the caller still says "this is an update / promotional / magic_link" for the purposes of provider, queue, and audit. They are only opting out of the rendering pipeline. The renderer is the right place to make that decision because the renderer is the only module that owns HTML.

A NextAuth magic link send will never set `props.html` (it sets `props.url`), so the v1 templates continue to serve their primary use case unchanged. The 355 existing tests stay green — the passthrough is a new code path, not a modification of the existing path.

## What this commits future work to

- The renderer's exported `renderTemplate` signature does not change: `renderTemplate(category: EmailCategory, props?: Record<string, unknown>): Promise<{ html: string; text: string }>`. The passthrough is internal behaviour, not a new entry point.
- The category-list validation is the first check in the renderer body and is preserved verbatim. Unknown category still throws `UNKNOWN_TEMPLATE` even if `props.html` is supplied — the send log must never record a send under an unknown category.
- `props.html` is the only reserved key in `props` for v1. If a future template wants a prop called `html` (e.g. a `raw` category that needs its own html prop), this decision must be superseded.
- The send log row records `category` exactly as supplied. There is no separate "this was a passthrough" flag in v1 — the operator can infer it from `provider` + outbound HTML if needed. Adding a `mode: 'template' | 'passthrough'` field is a Phase 2 concern if the operator asks for it.
- Tests must cover both the happy path (`props.html` is a non-empty string → returned as-is) and the precedence rules (unknown category still throws; `props.html` as non-string is ignored; empty string is ignored).

## Alternatives considered

**A new `raw_html` category.** Rejected — described above. Leaks the rendering concern into the routing and queue layers, requires invented env var semantics, and creates an awkward asymmetry where one category has no corresponding template file.

**A separate `renderRaw(html: string)` exported function bypassing `renderTemplate`.** Rejected — the API handler at `src/api/send/index.ts` calls into the renderer through a single seam (`renderTemplate`). Adding a second export would force the handler to branch on `'html' in props` and dispatch to the right function, moving the rendering concern out of the renderer and into the handler. The passthrough belongs inside `renderTemplate` so the handler stays a thin orchestrator.

**A `bypassRender: true` flag in the request.** Rejected — adds an API field whose value is fully determined by whether `props.html` is set. A single shape (`props.html` is the signal) is simpler than a flag plus a payload that must agree with it.

## Pointers

- Pairs with [D012 — Client SDK lives in a separate package directory](D012-client-sdk-package-layout.md)
- Refines [D007 — Email template is derivable from category](D007-template-derivable-from-category.md)
- Shapes [WU-012 — npm package + client SDK](../work-units/012-npm-package-client.md)
