# Config Health Check

**Type:** page
**Status:** 🔵 proposed
**Last updated:** 2026-05-24

## Who uses this surface

- [P001 — Indie SaaS Developer](../personas/P001-indie-dev.md): used during initial setup to confirm all required env vars are present and valid before going live

## When they reach it

The developer has set their env vars and wants a quick sanity check before firing a real send. Or they're debugging a failure and want to rule out misconfiguration.

## What they see

- **Page header** — "Configuration"
- **Checklist** — one row per config key, with status:
  - ✅ green — env var is set
  - ❌ red — env var is missing
  - Rows: `SES_ACCESS_KEY_ID`, `SES_SECRET_ACCESS_KEY`, `SES_REGION`, `MAGIC_LINK_PROVIDER`, `PROMOTIONAL_PROVIDER`, `UPDATE_PROVIDER`, `API_KEY`, `DATABASE_URL`, `QSTASH_TOKEN`
- **Provider routing summary** — shows the resolved routing table: `magic_link → ses`, `promotional → ses`, `update → ses` (or whatever is configured)
- **Overall status** — top of page: "All systems configured" (green) or "Configuration incomplete" (red) + count of missing vars

## What they do

- Read only — no actions on this surface
- Fix missing vars in their Vercel environment settings, then refresh

## What happens next

Developer sees green across all rows and is confident to proceed. Or they see red rows and know exactly which env vars to set.

## Contracts this surface touches

- **Reads:** [router](../contracts/router.md) — to display the resolved routing table
- **Reads:** env vars directly (server-side rendered, never exposed to client)

## Design system pieces this surface uses

- **Components:** StatusRow, PageHeader, Badge (success/error)
- **Patterns:** checklist
- **Tokens:** colour (success/error semantic), typography, spacing

## Accessibility

- Status communicated via colour + icon + text (never colour alone)
- Page is readable without JavaScript (server-rendered)
- AA contrast minimum throughout

## Open questions about this surface

_none currently_

## Notes

### 2026-05-24 — first filed

Read-only surface. Env var values are never shown — only presence/absence. Security consideration: this surface should be protected behind the API key to avoid leaking config structure to anyone who finds the URL.
