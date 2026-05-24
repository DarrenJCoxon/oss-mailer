# D003 — Hybrid send strategy: magic links synchronous, bulk async

| Field | Value |
| --- | --- |
| Status | ✅ accepted |
| Date | 2026-05-24 |
| Supersedes | — |
| Superseded by | — |

## Context

The API needs to decide whether to send immediately or queue every request. Two options were evaluated: always queue (simple, consistent) or hybrid (magic links sync, bulk async).

## Decision

The API uses a hybrid strategy:
- `magic_link` — sent synchronously, response returned when the send completes
- `promotional` and `update` — queued via QStash and delivered asynchronously

## Why

Magic links are auth flows — a user is actively waiting on a "check your email" screen. Queueing introduces unnecessary and unpredictable latency for that experience. Promotional and update emails have no user waiting on them; async delivery handles bursts and retries more reliably.

## What this commits future work to

- The API layer must branch on email category before deciding whether to send or enqueue
- `magic_link` sends must complete (or fail) within the API request lifecycle
- `promotional` and `update` sends are fire-and-forget from the caller's perspective — the queue owns delivery
