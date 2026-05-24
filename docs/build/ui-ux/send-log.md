# Send Log / Dashboard

**Type:** page
**Status:** 🔵 proposed
**Last updated:** 2026-05-24

## Who uses this surface

- [P001 — Indie SaaS Developer](../personas/P001-indie-dev.md): primary surface for verifying sends are going out and debugging failures

## When they reach it

The developer has just pushed a feature that sends emails, or a user reports they didn't receive something. They open the oss-mailer dashboard to see what happened — did it send? Which provider? Did it fail?

## What they see

- **Page header** — "Send Log" title + current date range
- **Filter bar** — filter by category (`magic_link` / `promotional` / `update`) and status (`success` / `failed` / `all`)
- **Data table** — one row per send attempt, columns: timestamp, category, recipient, provider, status badge, message ID
- **Status badge** — green `success` or red `failed`
- **Empty state** — if no sends yet: "No sends recorded yet. Send a test email to get started." + link to Test Send surface
- **Failed row detail** — expandable row showing the error message on failure

## What they do

- Filter by category or status → table updates
- Expand a failed row → see error detail
- Click "Test Send" link in empty state → navigate to Test Send surface

## What happens next

Developer sees confirmation that sends are working, or identifies a failed send and its error reason, then goes to fix their configuration.

## Contracts this surface touches

- **Reads:** [send-log](../contracts/send-log.md) — queries Postgres for send records

## Design system pieces this surface uses

- **Components:** DataTable, Badge, FilterBar, EmptyState, PageHeader
- **Patterns:** data-table-with-filters, empty-state
- **Tokens:** colour, typography (monospace for timestamps/IDs), spacing

## Accessibility

- Table is keyboard-navigable (Tab between rows, Enter to expand)
- Status badges use colour + text (not colour alone)
- AA contrast minimum throughout

## Open questions about this surface

_none currently_

## Notes

### 2026-05-24 — first filed

Primary operational surface. Monospace font for timestamps and message IDs — this is a developer-facing tool.
