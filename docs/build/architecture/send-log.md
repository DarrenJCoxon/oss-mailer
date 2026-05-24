# Send Log

**Status:** 🔵 proposed
**Owner:** infrastructure
**Last updated:** 2026-05-24

## What this module does

Records every send attempt to Postgres (Neon via Drizzle): timestamp, category, recipient address, provider used, success or failure, message ID, and error detail if applicable. Provides a queryable history so the developer can see exactly what sent, when, and via which provider.

## Who uses it directly

- [P001](../personas/P001-indie-dev.md) — queries the log (via database or a simple admin route) to verify sends and debug failures

## What it depends on

- **Other modules:** none — written to by Mail Sender after every send attempt
- **External services:** Neon (Postgres) via Drizzle ORM
- **Hardware or infrastructure:** none

## What depends on it

- Nothing — the log is a terminal sink; no other module reads from it at runtime

## Contracts this module owns

| Contract | What it provides |
| --- | --- |
| [send-log](../contracts/send-log.md) | A persistent, queryable record of every send attempt with outcome |

## Open questions about this module

_none currently_

## Decisions specific to this module

_none currently_

## Notes

### 2026-05-24 — first filed

Terminal sink — written to, not read from at runtime. P001 queries it directly via DB or a lightweight admin route. No analytics dashboard (out of scope, Map 1).
