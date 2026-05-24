# Work Unit 003 — Router — category → provider from env config

**Status:** 🔵 proposed
**For:** [P001 — Indie SaaS Developer](../personas/P001-indie-dev.md)
**Last updated:** 2026-05-24

**Depends on:** [WU-002 — `EmailProvider` interface + SES adapter](002-email-provider-interface-ses-adapter.md)

## What's done when this ships

The Router module reads env vars (`MAGIC_LINK_PROVIDER`, `PROMOTIONAL_PROVIDER`, `UPDATE_PROVIDER`) and returns the correct `EmailProvider` instance for a given category. No routing logic lives anywhere else in the codebase. Adding a new provider is one new adapter file plus one env var — zero changes to the Router.

## Walkthrough

1. P001 sets `MAGIC_LINK_PROVIDER=ses` in `.env.local`.
2. At runtime, Mail Sender calls `router.resolve('magic_link')` and receives the SES adapter instance.
3. P001 later sets `PROMOTIONAL_PROVIDER=mailgun` — the Router returns the Mailgun adapter for that category without any code change.

**What if something goes wrong:**
- Unknown category: Router throws a typed `RouterError` with `{ code: 'UNKNOWN_CATEGORY', category }`.
- Provider env var missing or invalid: Router throws `RouterError` with `{ code: 'PROVIDER_NOT_CONFIGURED', category }`.

## How we'll know it's done

1. `router.resolve('magic_link')` returns the SES adapter when `MAGIC_LINK_PROVIDER=ses`.
2. `router.resolve('promotional')` returns the SES adapter when `PROMOTIONAL_PROVIDER=ses`.
3. `router.resolve('update')` returns the SES adapter when `UPDATE_PROVIDER=ses`.
4. Passing an unknown category throws `RouterError` with `code: 'UNKNOWN_CATEGORY'`.
5. Missing provider env var throws `RouterError` with `code: 'PROVIDER_NOT_CONFIGURED'`.
6. `npx vitest run` exits 0.

## Notes / log

### 2026-05-24 — initial filing

Intentionally thin module (architecture note). Single responsibility: category string in, `EmailProvider` instance out. Config-driven mapping enforced by D002 (no failover logic here). Filed after WU-002 because the return type is `EmailProvider`.
