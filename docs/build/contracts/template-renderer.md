# Contract: Template Renderer

**Owner module:** [Template Renderer](../architecture/template-renderer.md)
**Status:** 🔵 proposed
**Last updated:** 2026-05-24

## In one sentence

Template Renderer takes a template name and data object and returns a rendered HTML string ready to be sent as an email body.

## What this module produces

- A rendered HTML string — the full email body, ready for the provider
- Plain-text fallback (React Email generates both automatically)

## What this module consumes

- Template name — a string matching a React Email component in the templates directory
- Data object — the variables the template needs (e.g. `{ magicLink: '...', userName: '...' }`)

## What this module does not provide

- Template storage or management UI — templates are code files (out of scope, Map 1)
- Dynamic template creation at runtime — templates are compiled components, not database records
- Email subject lines — those come from the send request, not the template

## How it fails

- If the template name doesn't match a known component, the renderer throws immediately — the send is rejected before reaching the provider
- If required data fields are missing, the rendered output will have empty placeholders — caller's responsibility to pass complete data

## Personas this contract serves

- [P001 — Indie SaaS Developer](../personas/P001-indie-dev.md) — writes templates as React Email components; this module renders them at send time

## Work units that produce this contract

| WU | Status |
| --- | --- |
| [WU-004 — Template Renderer](../work-units/done/004-template-renderer.md) | ✅ shipped |

## Work units that consume this contract

| WU | Status |
| --- | --- |

## Decisions that shaped this contract

_none currently_

## Notes

### 2026-05-24 — first filed

React Email handles both HTML and plain-text rendering. No custom rendering logic needed.
