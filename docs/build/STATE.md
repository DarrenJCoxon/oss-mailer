# oss-mailer — where we are right now

> This file is the snapshot read at the start of every session. If anything important about the project's current state is not here, it is not real. The end-of-session protocol updates this file every time work stops.

**Last updated:** 2026-05-25 (WU-011 shipped — Send Log Dashboard UI — all Phase 1 work units complete)

## Planning progress

This project is at the start of its planning arc. The AI will walk you through five phases before you begin building. Each phase is its own session.

| Phase | What it produces | Status |
| --- | --- | --- |
| A — Orientation | Project description, 1-3 personas, the horizon map | ✅ complete (2026-05-24) |
| B — Architecture & Contracts | The major pieces of the project and what they exchange | ✅ complete (2026-05-24) |
| C — UI/UX + Design System | The user-facing surfaces and the shared visual language | ✅ complete (2026-05-24) |
| D — Maps | Phases of work and the near-term plan | ✅ complete (2026-05-24) |
| E — Initial Work Units | The first 5-10 things to build, in dependency order | ✅ complete (2026-05-24) |

When you run `/start-of-session` on this fresh project, the AI will see this tracker and offer to begin Phase A.

## What is currently in flight

All Phase 1 work units (WU-001 through WU-011) ✅ shipped. Full send pipeline, browser test surface, config health page, and send log dashboard complete. Next: deploy to Vercel.

## Project description

A self-hosted email routing service that sits in front of cheap bulk providers (SES, Mailgun, etc.) and handles transactional (magic links), promotional, and update emails. The value prop is cost — Postmark and Resend charge a premium; this routes the same sends through cheaper infrastructure under your control.

## What just shipped

**WU-011 — Send Log Dashboard UI** (2026-05-25). `GET /` — async Server Component fetches last 200 send-log rows, maps to serialisable view-model, renders `<LogTable>` Client Component. Client-side filtering (category + status dropdowns, pure `filterSendLogRows` fn). Failed rows expand via chevron button (`aria-expanded`, `aria-controls`, Escape-to-collapse). `aria-live="polite"` on `<tbody>` for screen-reader filter announcements. DB error shows `role="alert"` banner, no raw error text. Empty state links to `/test-send`. 32 new tests, 355 total passing.

**WU-010 — Config Health Check UI** (2026-05-25). `GET /health` — self-contained HTML page (no JS), Bearer-token auth (401 with no env details on bad key), shows all 13 required env vars as ✅/❌, routing table (category→provider), amber sandbox warning if `SES_SANDBOX_MODE=true`. Inline CSS, `cache-control: no-store`, XSS-escaped. 37 new tests, 323 total passing.

## What is next

Deploy to Vercel:
1. Push repo to GitHub
2. Import project in Vercel dashboard
3. Add all 13 env vars (from `.env.example`) in Vercel → Settings → Environment Variables
4. Run `npx drizzle-kit migrate` against the production Neon DB
5. Verify at `GET /health` with `Authorization: Bearer <MAILER_API_KEY>`

## Open questions blocking progress

None blocking. Q001 resolved → D002.

## Active risks

| ID | Risk | Severity |
| --- | --- | --- |
| R001 | AWS SES sandbox mode — new deployers may hit send restrictions until production access granted | Medium |

## Decisions made recently

| Decision | Status | Date |
| --- | --- | --- |
| D001 — Open-source and self-hosted, no SaaS | ✅ accepted | 2026-05-24 |
| D002 — No fallback provider, routing by category | ✅ accepted | 2026-05-24 |
| D003 — Hybrid send: magic links sync, bulk async via queue | ✅ accepted | 2026-05-24 |
| D004 — Design language: blue/orange/grey, Inter + JetBrains Mono, dark/light/system | ✅ accepted | 2026-05-24 |
| D005 — QStash async queue in Phase 1, not Phase 2 | ✅ accepted | 2026-05-24 |
| D006 — `from` address from `MAILER_FROM` env var | ✅ accepted | 2026-05-24 |
| D007 — Template derivable from category, `template` field dropped | ✅ accepted | 2026-05-24 |
| D008 — Templates must meet deliverability standards | ✅ accepted | 2026-05-24 |
| D009 — Drizzle generate+migrate workflow, not push | ✅ accepted | 2026-05-24 |
| D010 — createLogWriter factory co-located in send-log/index.ts | ✅ accepted | 2026-05-25 |
| D011 — Client-side filtering over URL-param server re-fetch for send log dashboard | ✅ accepted | 2026-05-25 |

## Active work units

| Work Unit | Status | Notes |
| --- | --- | --- |
| [WU-001 — Project scaffolding](docs/build/work-units/done/001-project-scaffolding.md) | ✅ shipped | — |
| [WU-002 — EmailProvider interface + SES adapter](docs/build/work-units/done/002-email-provider-interface-ses-adapter.md) | ✅ shipped | — |
| [WU-003 — Router](docs/build/work-units/done/003-router.md) | ✅ shipped | — |
| [WU-004 — Template Renderer](docs/build/work-units/done/004-template-renderer.md) | ✅ shipped | — |
| [WU-005 — Mail Sender](docs/build/work-units/done/005-mail-sender.md) | ✅ shipped | — |
| [WU-006 — Send Log backend](docs/build/work-units/done/006-send-log-backend.md) | ✅ shipped | — |
| [WU-007 — Queue](docs/build/work-units/done/007-queue.md) | ✅ shipped | — |
| [WU-008 — API endpoint](docs/build/work-units/done/008-api-endpoint.md) | ✅ shipped | — |
| [WU-009 — Test Send UI](docs/build/work-units/done/009-test-send-ui.md) | ✅ shipped | — |
| [WU-010 — Config Health Check UI](docs/build/work-units/done/010-config-health-check-ui.md) | ✅ shipped | — |
| [WU-011 — Send Log Dashboard UI](docs/build/work-units/done/011-send-log-dashboard-ui.md) | ✅ shipped | — |

## How to read this file

- **Planning progress** shows where you are in the 5-phase arc that takes a brand-new project to "ready to build"
- **What is currently in flight** describes ongoing work; updated when work changes shape
- **What just shipped** notes the most recent completion(s)
- **What is next** points at the immediate concrete action
- Below: open questions, risks, decisions, and active work units — pulled from their respective registers for quick scanning

This file is the project's executive summary. The detail lives in the register files; this is the one-screen view that says where the project is.
