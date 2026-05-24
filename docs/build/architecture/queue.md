# Queue

**Status:** 🔵 proposed
**Owner:** infrastructure
**Last updated:** 2026-05-24

## What this module does

Receives promotional and update send jobs from the API and delivers them to the Mail Sender asynchronously via Upstash QStash. Handles retries automatically on failure. Magic link sends bypass the queue entirely (D003).

## Who uses it directly

No persona interacts with the queue directly. It operates invisibly between the API and the Mail Sender.

## What it depends on

- **Other modules:** none
- **External services:** Upstash QStash
- **Hardware or infrastructure:** none

## What depends on it

- **Mail Sender** — receives jobs from the queue and executes sends

## Contracts this module owns

| Contract | What it provides |
| --- | --- |
| [queue](../contracts/queue.md) | Guaranteed async delivery of promotional and update send jobs, with automatic retry on failure |

## Open questions about this module

_none currently_

## Decisions specific to this module

- [D003](../decisions/D003-hybrid-send-strategy.md) — magic links bypass the queue; only promotional/update are enqueued

## Notes

### 2026-05-24 — first filed

QStash chosen for serverless compatibility with Vercel. No Redis/BullMQ needed.
