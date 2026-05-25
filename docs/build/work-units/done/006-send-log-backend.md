# Work Unit 006 — Send Log backend — Postgres schema + Drizzle + write path

**Status:** ✅ shipped
**For:** [P001 — Indie SaaS Developer](../../personas/P001-indie-dev.md)
**Last updated:** 2026-05-25

**Depends on:** [WU-001 — Project scaffolding](001-project-scaffolding.md)

## What's done when this ships

A `send_log` table exists in Neon Postgres, managed by a Drizzle migration. The Send Log module exports a `writeSendAttempt()` function that persists a send attempt and its result. A basic query function (`getRecentSends()`) returns the last N log entries. No UI yet — this is the data layer only.

## Walkthrough

1. Mail Sender calls `writeSendAttempt({ category, to, provider, success, messageId, error, durationMs })`. `sent_at` is recorded as `new Date()` inside the module — callers do not pass it.
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

### 2026-05-25 — coder implementation

**Files changed:**
- `src/db/schema.ts` — replaced the empty export stub with the `sendLog` pgTable definition (all 10 columns per spec). Exports `sendLog`, `InsertSendLog`, `SelectSendLog`.
- `src/send-log/index.ts` — created new module. Exports `SendLogError`, `isSendLogError`, `SendLogErrorCode`, re-exports `WriteSendAttemptArgs` from `src/sender`, exports `GetRecentSendsArgs`, `writeSendAttempt`, `getRecentSends`.

**Unexpected discoveries:**
- Drizzle handles the `to` reserved keyword automatically at the driver level — no `.as('"to"')` needed. The column is declared as `text('to').notNull()` and compiles cleanly.
- `getRecentSends` uses Drizzle's `and(...conditions)` with spread to compose optional `WHERE` clauses — passing `undefined` to `.where()` is a supported Drizzle no-op.

**Ready for tester:** `writeSendAttempt` and `getRecentSends` in `src/send-log/index.ts` are fully exported and testable with mocked `db`. `SendLogError` and `isSendLogError` are straightforward to unit-test.

**NOT done:** Migration file — operator runs `npm run db:generate` separately per D009. No vitest tests — tester agent's job.

### 2026-05-25 — tester

**Tests written:**
- `src/send-log/index.test.ts` — 41 new tests covering all 10 acceptance criteria
- `src/db/schema.test.ts` — extended with 11 additional tests verifying `sendLog` column presence

**Acceptance criteria coverage:**
- AC-1 (writeSendAttempt returns { id: string }): VERIFIED — 4 tests
- AC-2 (messageId → message_id, error → error_detail mapping): VERIFIED — 5 tests
- AC-3 (DB write error → SendLogError DB_WRITE_FAILED): VERIFIED — 3 tests
- AC-4 (getRecentSends limit + ordering): VERIFIED — 3 tests
- AC-5 (getRecentSends category filter): VERIFIED — 3 tests (includes no-filter → undefined WHERE path)
- AC-6 (getRecentSends status 'failure' filter): VERIFIED — 2 tests
- AC-7 (getRecentSends status 'success' filter): VERIFIED — 2 tests
- AC-8 (DB read error → SendLogError DB_READ_FAILED): VERIFIED — 3 tests
- AC-9 (isSendLogError true for instances and duck-typed objects): VERIFIED — 9 tests
- AC-10 (isSendLogError false for non-SendLogError values): VERIFIED — 7 tests
- Schema columns (sendLog table shape): VERIFIED — 10 column tests in schema.test.ts

**Test run result:** 189 tests passed, 0 failed (13 test files). Pre-existing 148 tests all still pass.

**Testability note:** Drizzle's chainable query builder required `vi.hoisted()` for the mock objects — the factory in `vi.mock()` is hoisted before variable declarations, so a plain `const mockInsert = vi.fn()` at module level is not yet initialised when the factory runs. `vi.hoisted()` is the correct pattern and is now documented in this codebase via `src/send-log/index.test.ts`.

**Recommendation:** Ready for review. All acceptance criteria verified. Migration file (AC-1 schema gate) is an operator step and not testable in vitest.
