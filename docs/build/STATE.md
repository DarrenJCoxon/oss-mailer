# oss-mailer — where we are right now

> This file is the snapshot read at the start of every session. If anything important about the project's current state is not here, it is not real. The end-of-session protocol updates this file every time work stops.

**Last updated:** 2026-05-24

## Planning progress

This project is at the start of its planning arc. The AI will walk you through five phases before you begin building. Each phase is its own session.

| Phase | What it produces | Status |
| --- | --- | --- |
| A — Orientation | Project description, 1-3 personas, the horizon map | ✅ complete (2026-05-24) |
| B — Architecture & Contracts | The major pieces of the project and what they exchange | ✅ complete (2026-05-24) |
| C — UI/UX + Design System | The user-facing surfaces and the shared visual language | ✅ complete (2026-05-24) |
| D — Maps | Phases of work and the near-term plan | 🟡 next |
| E — Initial Work Units | The first 5-10 things to build, in dependency order | 🔵 not yet started |

When you run `/start-of-session` on this fresh project, the AI will see this tracker and offer to begin Phase A.

## What is currently in flight

Phase C complete. 3 surfaces + full design system filed. Phase D — Maps — is next.

## Project description

A self-hosted email routing service that sits in front of cheap bulk providers (SES, Mailgun, etc.) and handles transactional (magic links), promotional, and update emails. The value prop is cost — Postmark and Resend charge a premium; this routes the same sends through cheaper infrastructure under your control.

## What just shipped

Nothing yet — Phase A planning in progress.

## What is next

Phase D — Maps. Produce Map 2 (phases in detail) and Map 3 (near-term plan).

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

## Active work units

| Work Unit | Status | Notes |
| --- | --- | --- |
| _none yet — Phase E of planning produces the first batch_ | | |

## How to read this file

- **Planning progress** shows where you are in the 5-phase arc that takes a brand-new project to "ready to build"
- **What is currently in flight** describes ongoing work; updated when work changes shape
- **What just shipped** notes the most recent completion(s)
- **What is next** points at the immediate concrete action
- Below: open questions, risks, decisions, and active work units — pulled from their respective registers for quick scanning

This file is the project's executive summary. The detail lives in the register files; this is the one-screen view that says where the project is.
