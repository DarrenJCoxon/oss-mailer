# Contract: Queue

**Owner module:** [Queue](../architecture/queue.md)
**Status:** 🔵 proposed
**Last updated:** 2026-05-24

## In one sentence

Queue accepts promotional and update send jobs from the API and guarantees async delivery to the Mail Sender with automatic retry on failure.

## What this module produces

- A queue acknowledgement (`{ queued: true, jobId: string }`) returned to the API immediately
- Guaranteed delivery of the send job to the Mail Sender, retried automatically on failure
- QStash manages retry schedule and dead-letter handling

## What this module consumes

- A serialised send request: `{ category: 'promotional' | 'update', from: string, to: string, subject: string, template: string, data?: object }` — produced by [API](api.md)

## What this module does not provide

- Synchronous sends — magic links bypass the queue entirely (D003)
- Delivery status callbacks to the original caller — fire and forget
- Per-job priority or scheduling — all jobs are best-effort FIFO

## How it fails

- If QStash is unavailable, the API returns `500` to the caller — the job is not lost but the caller must retry
- QStash handles retries internally; after exhausting retries, the job is dead-lettered (logged, not silently dropped)

## Personas this contract serves

- [P001 — Indie SaaS Developer](../personas/P001-indie-dev.md) — async delivery means their bulk sends don't block their backend

## Work units that produce this contract

| WU | Status |
| --- | --- |

## Work units that consume this contract

| WU | Status |
| --- | --- |

## Decisions that shaped this contract

- [D003 — Hybrid send strategy](../decisions/D003-hybrid-send-strategy.md)

## Notes

### 2026-05-24 — first filed

Upstash QStash chosen for Vercel/serverless compatibility — no persistent process or Redis instance needed.
