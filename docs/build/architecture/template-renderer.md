# Template Renderer

**Status:** 🔵 proposed
**Owner:** infrastructure
**Last updated:** 2026-05-24

## What this module does

Takes a template name and a data object, finds the matching React Email component, and renders it to an HTML string ready for the Mail Sender. Templates live in code — no UI, no database, no drag-and-drop editor.

## Who uses it directly

- [P001](../personas/P001-indie-dev.md) — indirectly; writes React Email templates as part of their oss-mailer setup
- [P002](../personas/P002-oss-contributor.md) — may contribute new template components

## What it depends on

- **Other modules:** none
- **External services:** React Email
- **Hardware or infrastructure:** none

## What depends on it

- **Mail Sender** — calls this module to produce the HTML body before sending

## Contracts this module owns

| Contract | What it provides |
| --- | --- |
| [template-renderer](../contracts/template-renderer.md) | A rendered HTML string from a named React Email template and data object |

## Open questions about this module

_none currently_

## Decisions specific to this module

_none currently_

## Notes

### 2026-05-24 — first filed

Templates are React Email components in the codebase — not stored in a database and not editable via UI (out of scope, Map 1).
