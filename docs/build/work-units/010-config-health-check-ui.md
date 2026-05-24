# Work Unit 010 — Config Health Check UI

**Status:** 🔵 proposed
**For:** [P001 — Indie SaaS Developer](../personas/P001-indie-dev.md)
**Last updated:** 2026-05-24

**Depends on:** [WU-001 — Project scaffolding](001-project-scaffolding.md)

**Canonical env var checklist:** `MAILER_API_KEY`, `MAILER_FROM`, `SES_ACCESS_KEY_ID`, `SES_REGION`, `MAGIC_LINK_PROVIDER`, `PROMOTIONAL_PROVIDER`, `UPDATE_PROVIDER`, `DATABASE_URL`, `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`

## What's done when this ships

A server-rendered page at `/health` shows the status of every required environment variable (✅ set / ❌ missing) and a summary of the category-to-provider routing config derived from those vars. No JavaScript required. Protected by the `MAILER_API_KEY` so it isn't exposed publicly. P001 opens this page immediately after deploy to confirm their env is wired up before sending a real email.

## Walkthrough

1. P001 deploys to Vercel and opens `https://their-app.vercel.app/health` with the API key in a header or query param.
2. Page renders server-side: each required env var shown with ✅ or ❌.
3. Routing summary: `magic_link → ses`, `promotional → ses`, `update → ses` (or whatever is configured).
4. All ✅: P001 proceeds to Test Send. Any ❌: P001 knows exactly which var is missing.

**What if something goes wrong:**
- Missing API key in request: page returns 401, no env var details exposed.
- Partial config (some vars set, some missing): each var shown individually — P001 can see exactly which are missing.

## How we'll know it's done

1. `/health` renders without JavaScript (server component, no client-side fetch).
2. All 11 required env vars appear with ✅ (present) or ❌ (missing): `MAILER_API_KEY`, `MAILER_FROM`, `SES_ACCESS_KEY_ID`, `SES_REGION`, `MAGIC_LINK_PROVIDER`, `PROMOTIONAL_PROVIDER`, `UPDATE_PROVIDER`, `DATABASE_URL`, `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`.
3. The routing summary correctly reflects the current `*_PROVIDER` env vars.
4. Accessing `/health` without `MAILER_API_KEY` returns 401 — no env details in the response body.
5. The page is readable in a terminal via `curl` (plain HTML, no JS dependency).
6. A warning banner appears if `SES_SANDBOX_MODE=true` is set: "SES is in sandbox mode — sends are restricted to verified addresses."

## Notes / log

### 2026-05-24 — initial filing

Can run in parallel with WU-002–WU-004 after WU-001, since it only depends on env var definitions being established in scaffolding. Server-rendered by design (architecture note) — no JS required, works with `curl`. R001 (SES sandbox mode) should be surfaced here: if `SES_SANDBOX_MODE=true`, show a yellow warning noting that sends are restricted to verified addresses.
