# Contract: Router

**Owner module:** [Router](../architecture/router.md)
**Status:** 🔵 proposed
**Last updated:** 2026-05-24

## In one sentence

Router takes an email category and returns the provider that should handle the send, based on deployment configuration.

## What this module produces

- A provider identifier for a given email category (`magic_link` → `ses`, `promotional` → `ses`, etc.)
- The mapping is determined entirely by env vars — no hardcoded category→provider logic

## What this module consumes

- Email category (`magic_link` / `promotional` / `update`) — from the send request
- Provider configuration — from env vars (e.g. `MAGIC_LINK_PROVIDER=ses`, `PROMOTIONAL_PROVIDER=ses`)

## What this module does not provide

- Actual sending — that is the Mail Sender's job
- Provider health checks or failover — by design (see D002)
- Dynamic routing based on volume, time, or cost — out of scope for v1

## How it fails

- If no provider is configured for a given category, the router returns an error and the send is rejected before attempting delivery
- If an unrecognised category is passed, the router rejects it immediately

## Personas this contract serves

- [P001 — Indie SaaS Developer](../personas/P001-indie-dev.md) — indirectly; correct routing means their emails land via the right (cheap) provider
- [P002 — Open Source Contributor](../personas/P002-oss-contributor.md) — the config-driven mapping is what makes adding a new provider require no changes to this module

## Work units that produce this contract

| WU | Status |
| --- | --- |

## Work units that consume this contract

| WU | Status |
| --- | --- |

## Decisions that shaped this contract

- [D002 — No fallback, routing by category](../decisions/D002-no-fallback-routing-by-category.md)

## Notes

### 2026-05-24 — first filed

The config-driven mapping (env vars) is the key design decision here. It's what enables P002 to add a provider without touching core routing logic.
