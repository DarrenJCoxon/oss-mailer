# Contract: Send Log

**Owner module:** [Send Log](../architecture/send-log.md)
**Status:** 🔵 proposed
**Last updated:** 2026-05-24

## In one sentence

Send Log writes a record of every send attempt — success or failure — to Postgres, giving the developer a queryable history of what sent, when, and via which provider.

## What this module produces

- A persisted log entry per send attempt: `{ id: uuid, category: string, to: string, provider: string, success: boolean, message_id?: string, error_detail?: string, sent_at: timestamp, created_at: timestamp, duration_ms: number }`
- A queryable Postgres table (Neon/Drizzle) with the schema above — accessible directly via DB client or a lightweight admin route

## What this module consumes

- A send result from [Mail Sender](mail-sender.md): `{ success, messageId?, error?, provider, timestamp }`
- The original send request fields: `{ category, to }` — for context in the log entry

## What this module does not provide

- Analytics dashboards or aggregated reporting — out of scope (Map 1)
- Open/click tracking — out of scope (Map 1)
- Automatic log pruning or retention policies — v1 keeps all records

## How it fails

- `writeSendAttempt()` throws `SendLogError` on Postgres write failure. Mail Sender catches this, logs to stderr, and continues — the log write failure does not affect the send result. Logging is best-effort, not transactional with the send.

## Personas this contract serves

- [P001 — Indie SaaS Developer](../personas/P001-indie-dev.md) — queries the log to verify sends and debug failures

## Work units that produce this contract

| WU | Status |
| --- | --- |

## Work units that consume this contract

| WU | Status |
| --- | --- |

## Decisions that shaped this contract

_none currently_

## Notes

### 2026-05-24 — first filed

Best-effort logging — a log write failure must never fail a send. The send is the primary operation; the log is secondary.
