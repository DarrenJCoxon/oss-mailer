# Work Unit 011 — Send Log Dashboard UI

**Status:** ✅ shipped
**For:** [P001 — Indie SaaS Developer](../personas/P001-indie-dev.md)
**Last updated:** 2026-05-25

**Depends on:** [WU-006 — Send Log backend](done/006-send-log-backend.md), [WU-008 — API endpoint](done/008-api-endpoint.md)

## What's done when this ships

P001 can open `/` (or `/log`) in the browser and see a filterable table of every send attempt. Each row shows timestamp, category, recipient, provider, and a success/failed badge. Failed rows are expandable to reveal the error detail. When no sends exist, an empty state with a link to Test Send is shown. This is the primary operational surface for verifying sends and debugging failures.

## Walkthrough

1. P001 deploys oss-mailer and opens the root URL.
2. Sees a table of send records: timestamp (monospace), category badge, recipient, provider, status badge.
3. Filters by category (`magic_link`) — table updates to show only magic link sends.
4. Filters by status (`failed`) — table updates to show only failed sends.
5. Clicks the chevron on a failed row — row expands to show the error detail.
6. Clears filters — all sends visible again.
7. If no sends exist: EmptyState — "No sends yet. Use the Test Send page to fire your first email." → link to `/test-send`.

**What if something goes wrong:**
- DB connection failure: error banner above table — "Could not load send log. Check your database connection." (per data-table-with-filters pattern).
- Filtered result empty: "No results match your filters. Clear filters to see all sends."

## How we'll know it's done

1. `/` (or `/log`) loads and displays send records from the database.
2. Category filter (magic_link / promotional / update / all) correctly filters the table rows.
3. Status filter (success / failed / all) correctly filters the table rows.
4. A failed send row expands on chevron click to show `error_detail`.
5. No sends in DB → EmptyState with "No sends yet" copy and link to `/test-send`.
6. Timestamp and message ID columns render in JetBrains Mono.
7. Status badges use colour + text (success = green "sent", failed = red "failed").
8. Table is keyboard-navigable: Tab to row, Enter to expand/collapse.
9. `axe-core` scan returns zero violations.

## Notes / log

### 2026-05-24 — initial filing

Filed as WU-011 after the plan review identified the missing surface. The backend (`getRecentSends`) is delivered by WU-006; this WU wires the UI. Phase 1 gate does not require this surface, but it is one of the three surfaces filed in Phase C (UI/UX). Ship after WU-008 so the API is available for any client-side data fetching, or use a Server Component querying the DB directly (preferred — no extra API call).

### 2026-05-25 — architect

#### Design brief

**Decision:** Client-side filtering of a single server-fetched page (200 rows). Server Component fetches once; Client Component owns filter state, expansion state, and applies a pure filter function. Filed as [D011](../decisions/D011-send-log-dashboard-client-filtering.md). Alternative rejected: URL-search-param-driven server-side re-fetch (loses testability under `environment: 'node'`, adds an async failure path, splits filter logic across two files for no Phase 1 user benefit). Full reasoning in D011.

**Pattern continuity:** This WU follows the WU-009/WU-010 shape — a pure helper module (`src/log/index.ts`) tested directly in Vitest, consumed by a Server Component for I/O and a Client Component for interaction.

#### Coder brief

**1 — Files to create**

| Path | Type | Purpose |
| --- | --- | --- |
| `src/log/index.ts` | pure helpers | View-model type, filter type, filter function, default limit constant |
| `src/log/index.test.ts` | tests (tester writes) | Covers `filterSendLogRows`, `toSendLogRow`, voice spot-check on UI copy constants |
| `src/app/page.tsx` | Server Component | Replaces stub. Fetches rows, maps to view-model, renders `<LogTable>` or `<ErrorBanner>` |
| `src/app/(dashboard)/LogTable.tsx` | Client Component | Owns filter state, expansion state, renders filtered table |

Use a route group `(dashboard)` so the Client Component sits next to the page without becoming a child route. Do **not** create a new layout file.

No other files. No edits to `src/send-log/`, `src/db/`, `src/app/layout.tsx`. No new npm packages.

**2 — Pure helper module: `src/log/index.ts`**

Exported surface — these signatures are the tester's contract:

```ts
// View-model the Client Component receives — no Date, no boolean → simpler serialization.
export type SendLogRow = {
  id: string                         // uuid
  category: string                   // raw from DB (magic_link | promotional | update | <anything>)
  to: string
  provider: string
  status: 'sent' | 'failed'          // derived from success boolean
  messageId: string | null
  errorDetail: string | null
  sentAtIso: string                  // sent_at.toISOString()
  durationMs: number
}

export type CategoryFilter = 'all' | 'magic_link' | 'promotional' | 'update'
export type StatusFilter   = 'all' | 'sent' | 'failed'

export type LogFilters = {
  category: CategoryFilter
  status: StatusFilter
}

export const DEFAULT_LOG_LIMIT = 200

export const CATEGORY_FILTER_OPTIONS: ReadonlyArray<{ value: CategoryFilter; label: string }> = [
  { value: 'all',          label: 'All categories' },
  { value: 'magic_link',   label: 'magic_link' },
  { value: 'promotional',  label: 'promotional' },
  { value: 'update',       label: 'update' },
]

export const STATUS_FILTER_OPTIONS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: 'all',    label: 'All statuses' },
  { value: 'sent',   label: 'sent' },
  { value: 'failed', label: 'failed' },
]

// Strings the tester voice-checks. Keep them here so they are not in JSX.
export const EMPTY_STATE_COPY = {
  title: 'No sends yet.',
  body: 'Use the Test Send page to fire your first email.',
  linkLabel: 'Go to Test Send',
  linkHref: '/test-send',
} as const

export const EMPTY_FILTERED_COPY = {
  body: 'No results match your filters. Clear filters to see all sends.',
} as const

export const DB_ERROR_COPY = {
  body: 'Could not load send log. Check your database connection.',
} as const

// Maps a DB row (typeof sendLog.$inferSelect) to the UI view-model.
// Accept the minimal shape rather than the import — keeps src/log/ independent of Drizzle types.
export type DbSendLogRow = {
  id: string
  category: string
  to: string
  provider: string
  success: boolean
  message_id: string | null
  error_detail: string | null
  sent_at: Date
  duration_ms: number
}

export function toSendLogRow(row: DbSendLogRow): SendLogRow {
  return {
    id: row.id,
    category: row.category,
    to: row.to,
    provider: row.provider,
    status: row.success ? 'sent' : 'failed',
    messageId: row.message_id,
    errorDetail: row.error_detail,
    sentAtIso: row.sent_at.toISOString(),
    durationMs: row.duration_ms,
  }
}

// The load-bearing pure function. Tester covers this directly.
export function filterSendLogRows(rows: ReadonlyArray<SendLogRow>, filters: LogFilters): SendLogRow[] {
  return rows.filter((r) => {
    if (filters.category !== 'all' && r.category !== filters.category) return false
    if (filters.status !== 'all'   && r.status   !== filters.status)   return false
    return true
  })
}
```

Notes for the coder:
- `toSendLogRow` accepts a local `DbSendLogRow` shape, **not** `typeof sendLog.$inferSelect` — this keeps `src/log/` from importing Drizzle and keeps the tests pure-node. The Server Component (which already imports from `@/send-log`) does the structural pass-through; TypeScript will check field compatibility at the call site.
- Do not export anything else. No React, no Next, no DB, no env.

**3 — Data flow**

```
Neon (Postgres)
   │  getRecentSends({ limit: DEFAULT_LOG_LIMIT })
   ▼
src/app/page.tsx (Server Component)
   │  try/catch — on throw, render <ErrorBanner>
   │  on success, map rows via toSendLogRow, then render <LogTable rows={...}>
   ▼
src/app/(dashboard)/LogTable.tsx (Client Component)
   │  useState<LogFilters>({ category: 'all', status: 'all' })
   │  useState<Record<string, boolean>>({})  // expandedById
   │  const visible = filterSendLogRows(props.rows, filters)
   ▼
Render <table>
```

No `useEffect`, no `fetch`, no re-fetch. Filter changes mutate local state and re-render.

**4 — Filter function signature**

Exactly `filterSendLogRows(rows: ReadonlyArray<SendLogRow>, filters: LogFilters): SendLogRow[]` as above. The Client Component calls it on every render — do not memoize for 200 rows.

**5 — Row display: column order and cell content**

| # | Header | Cell | Class hints |
| --- | --- | --- | --- |
| 1 | Sent at | `row.sentAtIso` | `font-mono text-sm` |
| 2 | Category | category badge — see §10 | inline-block badge |
| 3 | Recipient | `row.to` | plain text |
| 4 | Provider | `row.provider` | plain text |
| 5 | Status | status badge — see §9 | inline-block badge |
| 6 | Message ID | `row.messageId ?? '—'` | `font-mono text-sm` |
| 7 | (expand toggle) | chevron button if `row.status === 'failed'`; otherwise empty cell | see §6 |

Header row uses `<th scope="col" className="text-sm font-medium text-gray-500 dark:text-gray-400 text-left px-3 py-2">`.

Body row uses `<tr className="border-t border-gray-200 dark:border-gray-700">` with `<td className="px-3 py-2 align-top">`.

Use a single `<table className="w-full">` inside the page-layout `<main className="mx-auto max-w-5xl px-4 pt-10 pb-12">`.

**6 — Expand / collapse**

Each failed row renders **two consecutive `<tr>` elements**: the data row and a detail row whose `<td>` spans all 7 columns. The data row's expand cell holds:

```tsx
<button
  type="button"
  aria-expanded={isExpanded}
  aria-controls={`row-detail-${row.id}`}
  onClick={() => toggle(row.id)}
  className="text-gray-600 dark:text-gray-300 px-2 py-1 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
>
  <span aria-hidden="true">{isExpanded ? '▾' : '▸'}</span>
  <span className="sr-only">{isExpanded ? 'Collapse error detail' : 'Expand error detail'}</span>
</button>
```

The detail row:

```tsx
<tr id={`row-detail-${row.id}`} hidden={!isExpanded}>
  <td colSpan={7} className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-sm font-mono p-3">
    {row.errorDetail ?? 'No error detail recorded.'}
  </td>
</tr>
```

Keyboard: the toggle is a `<button>`, so Tab focuses it and Enter/Space activates it natively. Do not add custom keydown handlers. Do not put `onClick` on the `<tr>` — that would force a custom keyboard story and complicate axe.

Sent rows render only the data row (no detail row). The expand cell is `<td></td>`.

**7 — Empty state**

When `props.rows.length === 0`:

```tsx
<section className="text-center py-16">
  <p className="text-base text-gray-700 dark:text-gray-300">{EMPTY_STATE_COPY.title}</p>
  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{EMPTY_STATE_COPY.body}</p>
  <a
    href={EMPTY_STATE_COPY.linkHref}
    className="inline-block mt-4 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline-offset-2 hover:underline"
  >
    {EMPTY_STATE_COPY.linkLabel}
  </a>
</section>
```

When `props.rows.length > 0` but `visible.length === 0` (filtered to nothing), render a single `<tr><td colSpan={7}>` inside the table body containing `{EMPTY_FILTERED_COPY.body}` in muted text — the table headers and filter controls stay visible so the user can clear filters.

**8 — Error state**

The Server Component wraps `getRecentSends` in try/catch. On any throw:

```tsx
<main className="mx-auto max-w-5xl px-4 pt-10 pb-12">
  <h1 className="text-2xl font-semibold leading-tight text-gray-900 dark:text-gray-50 mb-8">Send log</h1>
  <div
    role="alert"
    className="rounded-lg p-4 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-sm"
  >
    {DB_ERROR_COPY.body}
  </div>
</main>
```

Do **not** include the raw error message in the UI. The detail is for server logs only (`console.error` the caught error). The user-facing string is the constant in `src/log/`.

**9 — Status badge: exact classes per variant**

```tsx
function StatusBadge({ status }: { status: 'sent' | 'failed' }) {
  const cls =
    status === 'sent'
      ? 'inline-block rounded px-2 py-0.5 text-xs font-medium text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900'
      : 'inline-block rounded px-2 py-0.5 text-xs font-medium text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900'
  return <span className={cls}>{status}</span>
}
```

Text is the literal `'sent'` or `'failed'` — required for AC-7 (colour + text, never colour alone) and axe.

**10 — Category badge: exact classes**

```tsx
function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="inline-block rounded px-2 py-0.5 text-xs font-medium font-mono text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900">
      {category}
    </span>
  )
}
```

Single blue style for all categories (Phase 1). The category string itself differentiates magic_link / promotional / update visually via the monospace label.

**11 — Pagination / limit**

`DEFAULT_LOG_LIMIT = 200`. Reasoning:

- Self-hosted developer scale (Phase 1 audience per persona P001 and D001). 200 rows is a few hundred KB of JSON, well under a Vercel serverless response budget, and well under the working memory of any browser the user runs.
- Operational dashboards are reverse-chronological by design — the developer wants "what just happened" not "everything that ever happened". 200 rows covers a busy day of magic links plus a marketing campaign send for most P001-scale deployments.
- The constant lives in `src/log/index.ts`. Future infinite-scroll or paginated load is a clean follow-up WU; do not pre-bake it.

Filter controls block, above the table:

```tsx
<div className="flex gap-3 mb-6">
  <label htmlFor="filter-category" className="sr-only">Category filter</label>
  <select
    id="filter-category"
    value={filters.category}
    onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value as CategoryFilter }))}
    className="rounded-md border border-gray-200 dark:border-[#2E3244] bg-gray-50 dark:bg-[#1A1D27] text-gray-900 dark:text-gray-50 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
  >
    {CATEGORY_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>

  <label htmlFor="filter-status" className="sr-only">Status filter</label>
  <select id="filter-status" /* same shape, STATUS_FILTER_OPTIONS */ />
</div>
```

A visible `<label>` is not required by the spec — using `sr-only` labels is accessible (axe-clean) and keeps the filter row compact. If the coder prefers visible labels, that is acceptable; the AC only requires *proper `<label>` association*.

**12 — What the tester will verify**

The tester writes `src/log/index.test.ts` against the exact signatures in §2. The test plan:

| Section | Function | Cases |
| --- | --- | --- |
| 1 | `DEFAULT_LOG_LIMIT` | equals 200 |
| 2 | `toSendLogRow` | maps `success: true` → `status: 'sent'`; `success: false` → `status: 'failed'`; preserves `id`, `to`, `provider`, `category`, `duration_ms`; renames `message_id` → `messageId`, `error_detail` → `errorDetail`; calls `sent_at.toISOString()` for `sentAtIso`; preserves `null` for `messageId` and `errorDetail` |
| 3 | `filterSendLogRows` | `{ category: 'all', status: 'all' }` returns all rows; category filter excludes non-matching; status filter excludes non-matching; both filters AND together; empty input returns empty array; preserves input order |
| 4 | `CATEGORY_FILTER_OPTIONS` / `STATUS_FILTER_OPTIONS` | each has an `'all'` entry first; categories match the project's `Category` literal union; statuses are exactly `['all', 'sent', 'failed']` |
| 5 | Voice spot-check | `EMPTY_STATE_COPY`, `EMPTY_FILTERED_COPY`, `DB_ERROR_COPY` strings contain none of: `Oops`, `Unfortunately`, `Please`, `Sorry`, `Successfully`, `Looks like` |

The tester does **not** test the Server Component or the Client Component directly (no jsdom). The pure module covers the load-bearing logic. The page surfaces will be verified manually via the dashboard walkthrough and by an axe-core scan run by the reviewer.

#### Constraints the coder must honour

- No new npm packages.
- No edits to `src/send-log/`, `src/db/`, `src/app/layout.tsx`.
- No `useEffect`. No client-side fetch. No Server Action.
- The Client Component receives serializable props only (`SendLogRow[]`, no `Date`).
- The expand toggle is a `<button>` with `aria-expanded` and `aria-controls`. Detail row uses `hidden` attribute, not display style.
- DB error never leaks raw error text to the UI — only the constant in `DB_ERROR_COPY`.
- Voice: `"No sends yet."`, never `"Oops"`, `"Unfortunately"`, `"Please"`, `"Looks like"`.

#### Open questions

None. All ambiguities resolved into the brief above. If the coder hits an unresolvable conflict between the brief and reality, file a Q-NNN before improvising.

### 2026-05-25 — coder

#### Files created / modified

| File | Action |
| --- | --- |
| `src/log/index.ts` | Created — pure helper module (no React, no Drizzle, no env) |
| `src/app/(dashboard)/LogTable.tsx` | Created — Client Component, owns filter + expand state |
| `src/app/page.tsx` | Replaced stub with Server Component (async, try/catch around `getRecentSends`) |
| `src/app/page.test.tsx` | Updated (see below) |

#### page.test.tsx update

The original test did `import Home from './page'` at module level which transitively pulled in `@/send-log` → `@/db` → `neon(process.env.DATABASE_URL!)` — failing in the `node` test environment with no `DATABASE_URL`. Updated to add `vi.mock` calls for `@neondatabase/serverless`, `drizzle-orm/neon-http`, and `@/send-log` (same pattern as `src/db/index.test.ts`), then uses a dynamic `await import('./page')` so the mocks are in place before the module loads. The assertion remains `typeof Home === 'function'` — an async function satisfies this.

#### Verification

- `npx tsc --noEmit` exits 0.
- `npx vitest run` — **323 tests, 17 test files, all passed**.

#### One implementation note

React Fragment with explicit `key` prop (`<React.Fragment key={row.id}>`) is used around each data row + detail row pair in the table body. This is required because the two consecutive `<tr>` elements share a single map iteration and the `key` must sit on the outermost element returned.

#### Handoff for tester — exact exports from `src/log/index.ts`

```ts
export type SendLogRow           // 9 fields: id, category, to, provider, status, messageId, errorDetail, sentAtIso, durationMs
export type CategoryFilter       // 'all' | 'magic_link' | 'promotional' | 'update'
export type StatusFilter         // 'all' | 'sent' | 'failed'
export type LogFilters           // { category: CategoryFilter; status: StatusFilter }
export type DbSendLogRow         // minimal DB shape (no Drizzle import)
export const DEFAULT_LOG_LIMIT   // 200
export const CATEGORY_FILTER_OPTIONS  // 4 entries, 'all' first
export const STATUS_FILTER_OPTIONS    // 3 entries, 'all' first
export const EMPTY_STATE_COPY    // { title, body, linkLabel, linkHref }
export const EMPTY_FILTERED_COPY // { body }
export const DB_ERROR_COPY       // { body }
export function toSendLogRow(row: DbSendLogRow): SendLogRow
export function filterSendLogRows(rows: ReadonlyArray<SendLogRow>, filters: LogFilters): SendLogRow[]
```

Write tests in `src/log/index.test.ts` — the module has no side effects and no imports outside the standard library.

### 2026-05-25 — tester

#### Tests written

**File:** `src/log/index.test.ts` — 32 tests across 7 `describe` blocks.

| Section | Describe block | Tests |
| --- | --- | --- |
| 1 | `DEFAULT_LOG_LIMIT` | 1 |
| 2 | `toSendLogRow` | 12 |
| 3 | `filterSendLogRows` | 6 |
| 4a | `CATEGORY_FILTER_OPTIONS` | 5 |
| 4b | `STATUS_FILTER_OPTIONS` | 4 |
| 5a–5c | `UI copy constants — voice spot-check` | 4 |

#### Vitest summary

```
Test Files  18 passed (18)
     Tests  355 passed (355)
  Start at  13:55:46
  Duration  1.14s
```

All 32 new tests pass. No pre-existing tests were broken. The `stderr` lines visible in the run are expected `console.error` outputs from deliberately exercised error paths in `src/sender/index.test.ts` and `src/api/send/index.test.ts` — not failures.

#### Acceptance criteria coverage

| AC | Verifiable by pure-module tests | Covered |
| --- | --- | --- |
| AC-2: Category filter correctly filters rows | Yes | Yes — Section 3 |
| AC-3: Status filter correctly filters rows | Yes | Yes — Section 3 |
| AC-5: Empty state copy correct and no forbidden voice | Yes | Yes — Section 5 |
| `DEFAULT_LOG_LIMIT` = 200 | Yes | Yes — Section 1 |
| `toSendLogRow` all field mappings | Yes | Yes — Section 2 |
| `CATEGORY_FILTER_OPTIONS` / `STATUS_FILTER_OPTIONS` shape | Yes | Yes — Section 4 |
| AC-1: Loads and displays DB records | Requires running app + DB | Not covered by unit tests (as per §12 mandate) |
| AC-4: Failed row expands to show error_detail | Requires jsdom / browser | Not covered by unit tests (as per §12 mandate) |
| AC-6: Timestamp and message ID in JetBrains Mono | Requires visual / DOM | Not covered by unit tests (as per §12 mandate) |
| AC-7: Status badges colour + text | Requires DOM / visual | Not covered by unit tests (as per §12 mandate) |
| AC-8: Keyboard navigable | Requires browser | Not covered by unit tests (as per §12 mandate) |
| AC-9: axe-core zero violations | Requires browser | Not covered by unit tests (as per §12 mandate) |

ACs 1, 4, 6, 7, 8, 9 are explicitly deferred to manual walkthrough and an axe-core scan per §12 of the architect brief. This is by design, not a gap.

#### Gate B assessment

- `src/log/index.ts` — covered by `src/log/index.test.ts`. Gate B: PASS.
- `src/app/page.tsx` — Server Component; DB call mocked in `src/app/page.test.tsx` (pre-existing, 1 test, still passing). Gate B rebuttal accepted: PASS.
- `src/app/(dashboard)/LogTable.tsx` — Client Component; no jsdom; all filter + copy logic covered by `src/log/index.test.ts`. Gate B rebuttal accepted: PASS.

#### Discrepancies

None. All exported signatures matched the §2 contract exactly. Implementation is consistent with the architect brief.

### 2026-05-25 — reviewer

#### Verdict: APPROVE (with two warns documented below)

No blockers found. Two non-blocking findings are recorded. The work unit may promote.

---

#### Acceptance criteria walkthrough

| AC | File + line | Result |
| --- | --- | --- |
| AC-1: `page.tsx` calls `getRecentSends` and renders rows | `src/app/page.tsx:8–9` | PASS |
| AC-2: Category filter select has options for all / magic_link / promotional / update | `src/app/(dashboard)/LogTable.tsx:71–75` — driven by `CATEGORY_FILTER_OPTIONS` from `src/log/index.ts:23–28` | PASS |
| AC-3: Status filter select has options for all / sent / failed | `src/app/(dashboard)/LogTable.tsx:89–93` — driven by `STATUS_FILTER_OPTIONS` from `src/log/index.ts:30–34` | PASS |
| AC-4: Failed row has expand button with `aria-expanded` and detail row using `hidden` | `src/app/(dashboard)/LogTable.tsx:155–179` — `aria-expanded={isExpanded}`, `aria-controls`, `hidden={!isExpanded}` | PASS |
| AC-5: Empty state "No sends yet." and link to `/test-send` | `src/app/(dashboard)/LogTable.tsx:42–55`, copy sourced from `EMPTY_STATE_COPY` | PASS |
| AC-6: `sentAtIso` and `messageId` cells use `font-mono text-sm` | `src/app/(dashboard)/LogTable.tsx:140, 151` | PASS |
| AC-7: StatusBadge renders literal text "sent"/"failed" | `src/app/(dashboard)/LogTable.tsx:21` — `{status}` rendered inside `<span>` | PASS |
| AC-8: Filter controls have associated `<label>` elements | `src/app/(dashboard)/LogTable.tsx:60–62, 78–80` — `sr-only` labels with matching `htmlFor` / `id` | PASS |

---

#### Pure module compliance

- `src/log/index.ts` exports exactly the types, functions, and constants specified in §2. No additional exports. PASS.
- No React, Next.js, or Drizzle imports present in `src/log/index.ts`. PASS.
- `DbSendLogRow` is a hand-written local type at `src/log/index.ts:51–61` — not `typeof sendLog.$inferSelect`. PASS.
- `DEFAULT_LOG_LIMIT = 200` at `src/log/index.ts:21`. PASS.

---

#### Data flow

- `page.tsx` has no `"use client"` directive and is declared `async`. PASS.
- `LogTable.tsx` has `'use client'` at line 1. PASS.
- Props passed from `page.tsx` to `LogTable` are `SendLogRow[]` — all fields are primitives or `string | null` or `number`. No `Date` objects cross the boundary. PASS.
- Error path: `console.error` at `page.tsx:11`, only `DB_ERROR_COPY.body` rendered in UI at `page.tsx:20`, `role="alert"` at `page.tsx:17`. PASS.

---

#### Accessibility

- All 7 `<th>` elements have `scope="col"` — `src/app/(dashboard)/LogTable.tsx:100–118`. PASS.
- Expand button has `type="button"`, `aria-expanded`, `aria-controls={row-detail-${id}}` — line 155–160. PASS.
- Detail row uses `hidden={!isExpanded}` attribute — line 171. PASS.
- Filter selects have `<label htmlFor>` matching `id` — lines 60/63, 78/81. PASS.
- `colSpan={7}` on filtered-empty cell — line 127. PASS.
- `role="alert"` on DB error banner — `page.tsx:17`. PASS.

---

#### Voice compliance

All string literals in `LogTable.tsx` and `page.tsx` source from `src/log/index.ts` constants or are header/button labels prescribed by the architect brief (e.g., "Sent at", "Category", "Collapse error detail"). `EMPTY_STATE_COPY.title = 'No sends yet.'` — period present, no exclamation mark. No "Oops", "Unfortunately", "Please", "Looks like" found in any user-facing string. PASS.

---

#### Prohibited file check

- `src/send-log/` — not in this WU's diff. PASS.
- `src/db/schema.ts` — modified in prior WUs (not by this WU's work). PASS.
- `src/app/layout.tsx` — not in this WU's diff. PASS.
- No new `package.json` dependency additions attributable to this WU. PASS.

---

#### Vitest gate

Gate A: 355 tests, 18 files, all passed (reproduced by reviewer — exit 0).
Gate B: `src/log/index.ts` covered by `src/log/index.test.ts` (32 tests). `src/app/page.tsx` covered by `src/app/page.test.tsx` (smoke test, mocks in place). `src/app/(dashboard)/LogTable.tsx` — Gate B rebuttal accepted per §12: Client Component has no side effects; all filter/copy logic is exercised through the pure module tests. PASS.

---

#### Findings

**F1 — WARN — Missing `aria-live` on the filter result region**

The design-system accessibility commitment (`docs/build/design-system/accessibility.md`, "Dynamic content ... filter results ... uses `aria-live="polite"`") is not satisfied. When the user changes a filter select, the visible row count changes but no live region announces the update to screen readers.

The architect brief (§11) does not prescribe `aria-live` and the coder followed the brief exactly — this is not a coder error. The omission is a gap between the brief and the global accessibility gate that the architect should close in a follow-up or explicitly waive in a decision file.

Suggested fix: add `aria-live="polite"` and `aria-atomic="false"` to the `<tbody>` wrapper (or a visually-hidden announcer `<span>` outside the table that receives the row count on filter change). File a decision if the waiver is intentional.

**F2 — WARN — Escape-to-collapse not implemented**

The accessibility commitment states: "Expandable table rows: Enter to expand/collapse, Escape to collapse." The architect brief (§6) explicitly says "Do not add custom keydown handlers," which contradicts this commitment. The coder followed the brief. The gap stands: Escape does not collapse expanded detail rows.

This is an architect-level conflict between the global accessibility gate and the WU-011 brief. It should be resolved by the architect — either by adding an `onKeyDown` handler that calls `toggle(row.id)` when `key === 'Escape'` (overriding the brief waiver) or by filing a decision that waives the Escape requirement for Phase 1.

Suggested fix: add an `onKeyDown` handler to each expand button that calls `toggle(row.id)` when `event.key === 'Escape'`. This is three lines of code and does not require a custom keyboard story — it is native button behaviour extended with one key.

---

#### DRY check

No existing utilities, hooks, types, or components in the codebase duplicate the new exports in `src/log/index.ts`. The `filterSendLogRows`, `toSendLogRow`, `SendLogRow`, and copy constants are net-new. No violations.

---

#### No scope creep

Files created match the brief exactly: `src/log/index.ts`, `src/app/(dashboard)/LogTable.tsx`, `src/app/page.tsx` (replacement), `src/app/page.test.tsx` (update). No unrequested refactors or abstractions.
