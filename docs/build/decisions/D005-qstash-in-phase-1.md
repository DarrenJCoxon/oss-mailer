# D005 — QStash async queue is a Phase 1 deliverable, not deferred to Phase 2

| Field | Value |
| --- | --- |
| Status | accepted |
| Date | 2026-05-24 |
| Affects | Map 2 phase definitions; Phase 1 scope; all work units touching the send pipeline |
| Supersedes | none |
| Superseded by | — |

## Context

D003 commits to hybrid send: magic links synchronous, promotional and update sends async via Upstash QStash. The question during Phase D (Maps) was whether to ship the QStash queue in Phase 1 (Core Build) or defer it to Phase 2 (OSS Hardening), sending all categories synchronously in Phase 1 and adding the queue later.

## Decision

QStash is included in Phase 1. The send path — sync for magic links, async for promotional/update — is wired end-to-end before Phase 1 is considered complete.

## Rationale

Deferring QStash to Phase 2 would require restructuring the send path at phase transition: the routing engine would initially treat all sends as synchronous, then be refactored to dispatch to a queue. That restructuring carries non-trivial risk and makes Phase 1's verification gate misleading (it would pass against an architecture that differs from the final design). Including QStash in Phase 1 means the architecture is complete and stable from the first working version; Phase 2 then hardens it (retry, dead-letter, observability) without changing its shape.

## Consequences

- Phase 1 scope is larger: QStash integration must ship alongside the routing engine and SES adapter
- Phase 1 verification gate correctly represents the production architecture
- Phase 2 focuses on hardening (retry, dead-letter) rather than structural addition
- Developers testing Phase 1 need both SES credentials and a QStash endpoint configured

## Alternatives considered

- **QStash in Phase 2, all-sync Phase 1** — rejected because it creates a structural refactor at phase transition and produces a Phase 1 gate that doesn't reflect the final architecture

## Pointers

- Builds on [D003 — Hybrid send strategy](D003-hybrid-send-strategy.md)
- Shapes [Map 2 — Phase 1 scope](../maps/02-phases.md)
