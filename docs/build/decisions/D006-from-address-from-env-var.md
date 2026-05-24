# D006 — Sender `from` address comes from env var, not from the API caller

| Field | Value |
| --- | --- |
| Status | accepted |
| Date | 2026-05-24 |
| Affects | contracts/api.md, contracts/queue.md, WU-001 (.env.example), WU-008 (API endpoint), WU-009 (Test Send UI), Config Health Check |
| Supersedes | none |
| Superseded by | — |

## Context

The API contract originally included `from: string` as a required field in every send request. The Test Send UI surface has no `from` input field. This inconsistency was surfaced in the planning review: if `from` is caller-supplied, the Test Send UI is wrong; if it's config-driven, the contract is wrong.

## Decision

The `from` address is configured once via the `MAILER_FROM` environment variable, not passed per-request. It supports the RFC 5322 friendly-name format: `"Display Name <address@domain.com>"`. The SES adapter reads it at instantiation. The `from` field is removed from the public API request schema.

## Rationale

Self-hosted, single-tenant deployment (D001) means one sender identity per instance. P001 configures their verified SES sender address once at deploy time — they should never have to pass it per call. Removing it from the request schema makes the API simpler and eliminates a class of error (sending from an unverified address). Per-request override is a Phase 2+ concern if demand warrants it.

## Consequences

- `MAILER_FROM` added to `.env.example` and the Config Health Check checklist
- API request schema drops `from`: `{ category, to, subject, props? }`
- Test Send UI is correct as-filed (no `from` input)
- SES deliverability note: `MAILER_FROM` must be a verified domain or email address in SES before any send will succeed

## Alternatives considered

- **Per-request `from`** — rejected: more surface for misconfiguration, inconsistent with the Test Send UI, unnecessary for single-tenant deployment
- **Env-var default + per-request override** — rejected: adds contract complexity for a use case not in the persona descriptions; revisit in Phase 2 if needed

## Pointers

- Builds on [D001 — Self-hosted, single-tenant](D001-open-source-self-hosted.md)
- Shapes [contracts/api.md](../contracts/api.md), [contracts/queue.md](../contracts/queue.md)
