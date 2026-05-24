# Map 3 — The Near-Term Plan

> The close-in view. What's happening right now and what's immediately next. This map ages fast — updated every session by `/end-of-session`.

## Where we are

**Last updated:** 2026-05-24
**Current phase:** Phase 0 — Foundation (closing)
**Active work unit:** none yet — Phase E files the first batch
**Approach:** ship as fast as possible; no fixed cadence

## Right now

Phase D (Maps) just completed. The planning arc has one step left: Phase E — Initial Work Units (~60 min). After Phase E the arc closes and Phase 1 Core Build begins immediately.

## What's next

| Step | What | Status |
| --- | --- | --- |
| 1 | Phase E — file first 5–10 work units in dependency order | 🟡 next |
| 2 | Phase 0 closes — planning arc complete | 🔵 pending |
| 3 | WU-001 — project scaffolding (Next.js, Drizzle, env setup) | 🔵 pending |
| 4 | WU-002 — provider adapter interface + SES implementation | 🔵 pending |
| 5 | WU-003 — routing engine (category → provider dispatch) | 🔵 pending |
| 6 | WU-004 — QStash queue integration (async sends) | 🔵 pending |
| 7 | WU-005 — Send Log (Postgres schema + API) | 🔵 pending |

Work unit handles and exact scope are confirmed in Phase E. The list above is the expected shape, not the filed order.

## First blocker to clear

R001 — AWS SES sandbox mode. Before end-to-end testing works, at least one recipient address must be verified in SES. This is a deploy-time action, not a code problem — but it's the first thing that will stop a test send from completing.

## What follows

Once Phase E closes and WU-001 ships, the focus is purely Phase 1: get a real email through the full pipeline as fast as possible. The Send Log and Test Send UI can be built in parallel with the routing engine once the adapter interface is locked. Config Health Check is the last Phase 1 surface — it documents what's there, so it ships once everything else is wired.

## How this map gets updated

Every session, by `/end-of-session`. Anything started, finished, or pushed gets reflected here. When Phase 0 closes, this map gets a fresh outlook for Phase 1's first week.
