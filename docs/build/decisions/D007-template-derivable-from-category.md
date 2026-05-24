# D007 — Email template is derivable from category — not an explicit API field

| Field | Value |
| --- | --- |
| Status | accepted |
| Date | 2026-05-24 |
| Affects | contracts/api.md, contracts/queue.md, WU-004 (Template Renderer), WU-008 (API endpoint) |
| Supersedes | none |
| Superseded by | — |

## Context

The API contract originally included `template: string` and `data?: object` as fields alongside `category`. The work units (WU-005, WU-008) used `props` and no `template` field. This inconsistency was surfaced in the planning review.

## Decision

There is exactly one template per email category. The template is selected internally by the Mail Sender based on `category` — it is not passed by the caller. The `template` field is removed from the public API request schema. The `data` field is renamed `props` for consistency with the work units. The public API request is: `{ category, to, subject, props?: object }`.

## Rationale

One template per category is the right constraint for v1: it keeps the API simple, forces the developer to put template customisation in code (not runtime data), and avoids a whole class of runtime errors (invalid template name passed by caller). Custom templates are a Phase 2+ concern.

## Consequences

- API contract, Queue contract, and Mail Sender contract are updated to use `{ category, to, subject, props?: object }`
- Template Renderer signature: `renderTemplate(category: EmailCategory, props?: Record<string, unknown>): Promise<{ html: string, text: string }>`
- P001 customises email content by editing React Email components in `src/templates/` — not by passing template names at runtime

## Alternatives considered

- **Explicit `template` field** — rejected: adds complexity, enables runtime errors (unknown template name), unnecessary for v1 use cases

## Pointers

- Builds on [D003 — Hybrid send strategy](D003-hybrid-send-strategy.md)
- Shapes [contracts/api.md](../contracts/api.md), [WU-004](../work-units/004-template-renderer.md)
