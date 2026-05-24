# Work Unit 011 — Send Log Dashboard UI

**Status:** 🔵 proposed
**For:** [P001 — Indie SaaS Developer](../personas/P001-indie-dev.md)
**Last updated:** 2026-05-24

**Depends on:** [WU-006 — Send Log backend](006-send-log-backend.md), [WU-008 — API endpoint](008-api-endpoint.md)

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
