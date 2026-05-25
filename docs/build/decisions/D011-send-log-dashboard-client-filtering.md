# D011 — Send Log Dashboard: client-side filtering of a single server-fetched page

| Field | Value |
| --- | --- |
| Status | accepted |
| Date | 2026-05-25 |
| Supersedes | — |
| Superseded by | — |

## Context

WU-011 (Send Log Dashboard UI) ships the operational table at `/`. The table has two layers of dynamism: (1) category and status filters, and (2) per-row expansion to reveal `error_detail`. The load-bearing question is **where filtering happens**: the database (re-fetch on every filter change, controlled by URL search params) or the browser (one fetch, in-memory filter).

`getRecentSends({ limit, category?, status? })` already filters at the DB layer, so either model is mechanically available. The choice determines the file shape, the testability surface, and the user experience on filter changes.

Phase 1 scale is small — a self-hosted developer instance whose send volume is bounded by the deploying team's traffic. The expected dataset visible on the dashboard is the most-recent N rows (low hundreds, not tens of thousands).

## Decision

**Fetch the most-recent 200 rows in the Server Component once. Pass the array to a Client Component (`LogTable`) that owns filter state, row expansion state, and renders the filtered view by applying a pure filter function (`filterSendLogRows`) from `src/log/index.ts`.**

- No URL search params for filter state.
- No Server Action, no re-fetch on filter change.
- Filter logic is a pure function extracted to `src/log/index.ts` so the tester can cover it directly under the `environment: 'node'` constraint without jsdom.
- Row shape is mapped server-side to a `SendLogRow` view-model (timestamp pre-formatted to ISO string, `success` boolean → `'sent' | 'failed'` status literal) so the Client Component never touches `Date` objects across the serialization boundary.

## Why

1. **Testability under the `environment: 'node'` constraint.** Vitest is configured for `node`, with no jsdom and no `@testing-library/react`. URL-driven filtering would either push the filter logic into the Server Component (untestable in isolation because it pulls in the DB import graph), or into a `useRouter`-coupled Client Component (untestable without jsdom). Client-side filtering with the filter function extracted to a pure module gives the tester a single `filterSendLogRows(rows, filters)` to cover — exactly the pattern WU-009 (`mapApiResponseToResult`) and WU-010 (`buildHealthReport`) already established.

2. **One trip to the DB per dashboard load, not one per filter click.** Each filter change re-fetching means: a round trip to Neon, a Drizzle query allocation, and a React tree reconciliation gated on an async boundary. For a 200-row dataset, in-memory filtering is sub-millisecond and feels instant. The DB filter capability of `getRecentSends` is retained for future API/CLI consumers; the dashboard simply doesn't need it.

3. **Failure surface is contained.** With one fetch, there is exactly one place DB failure can show up — the initial render. The Server Component catches `SendLogError` (or any throw from `getRecentSends`) and renders the error banner with `role="alert"`. A filter-re-fetch model would need an additional error path inside the Client Component when the re-fetch fails, doubling the error states the user can hit.

4. **Row expansion is unambiguously client state.** Whichever model wins, expansion state must live in the Client Component. With client-side filtering, expansion state and filter state co-locate naturally in one `useState` cluster, and resetting expansion when a filter hides a row is a one-line concern (the row falls out of the rendered set; its expand entry in the state map is harmless dead weight that GCs on remount).

5. **Pattern continuity.** The existing surfaces (`/test-send`, `/health`) use the pure-helper-plus-server-component-plus-client-component shape. Choosing client-side filtering keeps WU-011 on the same rails — easier to read, easier to debug, fewer novel patterns to maintain.

## What this commits future work to

- A new module `src/log/index.ts` exporting the view-model type `SendLogRow`, the filter input type `LogFilters`, and the pure function `filterSendLogRows(rows, filters)`.
- The dashboard route file `src/app/page.tsx` becomes a Server Component that calls `getRecentSends({ limit: 200 })` inside a try/catch and renders either `<LogTable rows={...} />` or `<ErrorBanner message={...} />`.
- The Client Component `src/app/(dashboard)/LogTable.tsx` (route group used to keep `page.tsx` clean) owns `useState` for filters and expansion, and calls `filterSendLogRows` on each render.
- Filter state is **not** in the URL. Bookmarking a filtered view is explicitly out of scope for Phase 1. If a future WU adds shareable filter URLs, it supersedes this decision and adds search-param wiring; the pure filter function stays.
- The 200-row limit is a constant in `src/log/index.ts` (`DEFAULT_LOG_LIMIT = 200`) so the tester and the page agree, and a future change is one edit.

## Alternatives considered

- **Design A — Server Component reads `searchParams`, calls `getRecentSends` with the filter args, Client Component pushes new search params via `useRouter`.** Rejected for three reasons:
  1. The filter logic that *matters* (turning UI filter selections into a query) ends up split: the select-to-search-param mapping is in the Client Component, the search-param-to-DB-arg mapping is in the Server Component. The tester has to reach both to be confident — one of them through a `useRouter` indirection the test runner cannot drive.
  2. Each filter change is an async DB round trip the dataset does not need. At 200 rows, filtering is a synchronous JS operation faster than the network can complete a single hop.
  3. Adds a new failure mode (filter re-fetch can fail mid-session) without adding user value Phase 1 needs. Bookmarkable filtered URLs are nice but not in the AC list and explicitly noted as deferrable in the WU spec.

- **Hybrid — server-fetch the default unfiltered view, client-fetch via `/api/log` on filter change.** Rejected: requires a new API endpoint (out of scope), introduces an auth question (does the log API need the Bearer token like `/api/send`?), and duplicates the failure surface. A non-starter for Phase 1.

- **Server Action that returns filtered rows on demand.** Rejected: a Server Action is a POST under the hood; we would be making mutating-shaped requests for read-only filtering. Worse, the action would need to be defined in a file that pulls in `db` (via `getRecentSends`), so the Server Action file becomes another piece of code that cannot be tested without a DB mock — exactly what the WU-009 split avoided.

## Pointers

- WU-011: `docs/build/work-units/011-send-log-dashboard-ui.md`
- Backend already in place: `src/send-log/index.ts` — `getRecentSends`
- Pattern precedent: `src/app/test-send/` (Server Component + Client Component + pure helpers in `src/test-send/index.ts`)
- Pattern precedent: `src/health/index.ts` (pure `buildHealthReport` consumed by a thin handler)
- Test constraint: `vitest.config.ts` — `environment: 'node'`, no jsdom
