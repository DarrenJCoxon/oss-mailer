# Work Unit 006 — Send Log backend — Postgres schema + Drizzle + write path

**Status:** 🔵 proposed
**For:** [P001 — Indie SaaS Developer](../personas/P001-indie-dev.md)
**Last updated:** 2026-05-24

**Depends on:** [WU-001 — Project scaffolding](001-project-scaffolding.md)

## What's done when this ships

A `send_log` table exists in Neon Postgres, managed by a Drizzle migration. The Send Log module exports a `writeSendAttempt()` function that persists a send attempt and its result. A basic query function (`getRecentSends()`) returns the last N log entries. No UI yet — this is the data layer only.

## Walkthrough

1. Mail Sender calls `writeSendAttempt({ category, to, provider, success, messageId, errorDetail, sentAt })`.
2. Row is inserted into `send_log` with all fields.
3. P001 calls `getRecentSends(50)` from a test script or admin route and receives the last 50 send records.

**What if something goes wrong:**
- DB connection failure: `writeSendAttempt` throws a `SendLogError` with `{ code: 'DB_WRITE_FAILED', cause }`. Mail Sender catches this and logs to stderr — it does not surface the log failure to the API caller.

## How we'll know it's done

1. `npm run db:generate && npm run db:migrate` creates the `send_log` table in Neon with columns: `id` (uuid), `category`, `to`, `provider`, `success` (boolean), `message_id`, `error_detail`, `sent_at` (timestamp), `created_at` (timestamp), `duration_ms` (integer). Migration file committed to `drizzle/`.
2. `writeSendAttempt()` inserts a row and returns the inserted record's `id`.
3. `getRecentSends({ limit, category?, status? })` returns at most `limit` rows in descending `sent_at` order, filtered by category and/or status if provided.
4. A DB connection failure in `writeSendAttempt` throws `SendLogError` — not a raw Drizzle/Postgres error. (Mail Sender catches this — the throw is correct; the swallow happens one layer up.)
5. `npx vitest run` exits 0 (DB calls mocked).

## Notes / log

### 2026-05-24 — initial filing

Terminal sink — written to, never read at runtime by other modules (architecture note). Can run in parallel with WU-002, WU-003, WU-004 after WU-001. WU-005 (Mail Sender) lists this as a dependency for its integration tests.
