# oss-mailer — where we are right now

> This file is the snapshot read at the start of every session. If anything important about the project's current state is not here, it is not real. The end-of-session protocol updates this file every time work stops.

**Last updated:** 2026-05-24 (Phase E complete — planning arc closed)

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

Planning arc complete (Phases A–E). 11 work units filed and ordered. Phase 1 Core Build has started. WU-001 (project scaffolding) is the active work unit — nothing can proceed until it lands.

## Project description

A self-hosted email routing service that sits in front of cheap bulk providers (SES, Mailgun, etc.) and handles transactional (magic links), promotional, and update emails. The value prop is cost — Postmark and Resend charge a premium; this routes the same sends through cheaper infrastructure under your control.

## What just shipped

Nothing yet — Phase A planning in progress.

## What is next

Complete WU-001 (project scaffolding). After it lands: WU-002, WU-004, WU-006, WU-010 can all start in parallel. Run `/build-wu WU-001` to spawn the swarm.

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

## Active work units

| Work Unit | Status | Notes |
| --- | --- | --- |
| [WU-001 — Project scaffolding](docs/build/work-units/001-project-scaffolding.md) | 🟡 in flight | No deps — first to build |
| [WU-002 — EmailProvider interface + SES adapter](docs/build/work-units/002-email-provider-interface-ses-adapter.md) | 🔵 proposed | After WU-001 |
| [WU-003 — Router](docs/build/work-units/003-router.md) | 🔵 proposed | After WU-002 |
| [WU-004 — Template Renderer](docs/build/work-units/004-template-renderer.md) | 🔵 proposed | After WU-001 |
| [WU-005 — Mail Sender](docs/build/work-units/005-mail-sender.md) | 🔵 proposed | After WU-002, 003, 004 |
| [WU-006 — Send Log backend](docs/build/work-units/006-send-log-backend.md) | 🔵 proposed | After WU-001 |
| [WU-007 — Queue](docs/build/work-units/007-queue.md) | 🔵 proposed | After WU-005 |
| [WU-008 — API endpoint](docs/build/work-units/008-api-endpoint.md) | 🔵 proposed | After WU-005, 007 |
| [WU-009 — Test Send UI](docs/build/work-units/009-test-send-ui.md) | 🔵 proposed | After WU-008 |
| [WU-010 — Config Health Check UI](docs/build/work-units/010-config-health-check-ui.md) | 🔵 proposed | After WU-001 |
| [WU-011 — Send Log Dashboard UI](docs/build/work-units/011-send-log-dashboard-ui.md) | 🔵 proposed | After WU-006, 008 |

## How to read this file

- **Planning progress** shows where you are in the 5-phase arc that takes a brand-new project to "ready to build"
- **What is currently in flight** describes ongoing work; updated when work changes shape
- **What just shipped** notes the most recent completion(s)
- **What is next** points at the immediate concrete action
- Below: open questions, risks, decisions, and active work units — pulled from their respective registers for quick scanning

This file is the project's executive summary. The detail lives in the register files; this is the one-screen view that says where the project is.
