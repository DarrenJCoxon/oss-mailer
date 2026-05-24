# Map 3 — The Near-Term Plan

> The close-in view. What's happening right now and what's immediately next. This map ages fast — updated every session by `/end-of-session`.

## Where we are

**Last updated:** 2026-05-24
**Current phase:** Phase 1 — Core Build (just started)
**Active work unit:** [WU-001 — Project scaffolding](../work-units/001-project-scaffolding.md)
**Approach:** ship as fast as possible; no fixed cadence

## Right now

Planning arc complete (Phases A–E). WU-001 is the first active work unit. After WU-001 lands, four work units can proceed in parallel (WU-002, WU-004, WU-006, WU-010).

## What's next

| Step | What | Status |
| --- | --- | --- |
| 1 | Phase E complete — planning arc closed | ✅ done |
| 2 | [WU-001](../work-units/001-project-scaffolding.md) — project scaffolding | 🟡 in flight |
| 3 | [WU-002](../work-units/002-email-provider-interface-ses-adapter.md) + [WU-004](../work-units/004-template-renderer.md) + [WU-006](../work-units/006-send-log-backend.md) + [WU-010](../work-units/010-config-health-check-ui.md) — parallel after WU-001 | 🔵 pending |
| 4 | [WU-003](../work-units/003-router.md) — router (after WU-002) | 🔵 pending |
| 5 | [WU-005](../work-units/005-mail-sender.md) — mail sender (after WU-002, 003, 004, 006) | 🔵 pending |
| 6 | [WU-007](../work-units/007-queue.md) — queue/QStash (after WU-005) | 🔵 pending |
| 7 | [WU-008](../work-units/008-api-endpoint.md) — API endpoint (after WU-005, 007) | 🔵 pending |
| 8 | [WU-009](../work-units/009-test-send-ui.md) + [WU-011](../work-units/011-send-log-dashboard-ui.md) — UI surfaces (after WU-008) | 🔵 pending |

## First blocker to clear

R001 — AWS SES sandbox mode. Before end-to-end testing works, at least one recipient address must be verified in SES. This is a deploy-time action, not a code problem — but it's the first thing that will stop a test send from completing.

## What follows

Once Phase E closes and WU-001 ships, the focus is purely Phase 1: get a real email through the full pipeline as fast as possible. The Send Log and Test Send UI can be built in parallel with the routing engine once the adapter interface is locked. Config Health Check is the last Phase 1 surface — it documents what's there, so it ships once everything else is wired.

## How this map gets updated

Every session, by `/end-of-session`. Anything started, finished, or pushed gets reflected here. When Phase 0 closes, this map gets a fresh outlook for Phase 1's first week.
