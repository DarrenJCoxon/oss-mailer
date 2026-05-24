# Router

**Status:** 🔵 proposed
**Owner:** infrastructure
**Last updated:** 2026-05-24

## What this module does

Looks at the email category on an incoming send request and returns the provider that should handle it. The category-to-provider mapping is config-driven (env vars), so adding a new provider adapter requires no changes to this module — just a new env var.

## Who uses it directly

No persona interacts with the router directly. It is called internally by the Mail Sender.

## What it depends on

- **Other modules:** none
- **External services:** none — reads env var config only
- **Hardware or infrastructure:** none

## What depends on it

- **Mail Sender** — calls the router to determine which provider adapter to invoke

## Contracts this module owns

| Contract | What it provides |
| --- | --- |
| [router](../contracts/router.md) | A provider selection for a given email category |

## Open questions about this module

_none currently_

## Decisions specific to this module

- [D002](../decisions/D002-no-fallback-routing-by-category.md) — routing is by category; no failover

## Notes

### 2026-05-24 — first filed

Intentionally thin. Single responsibility: category in, provider out. Config-driven mapping (e.g. `MAGIC_LINK_PROVIDER=ses`) means new providers plug in without touching this module.
