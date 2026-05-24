# Work Unit 007 — Queue — QStash enqueue + webhook handler

**Status:** 🔵 proposed
**For:** [P001 — Indie SaaS Developer](../personas/P001-indie-dev.md)
**Last updated:** 2026-05-24

**Depends on:** [WU-005 — Mail Sender](005-mail-sender.md)

**Env vars required:** `QSTASH_TOKEN` (publish), `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` (webhook signature verification) — all three must be in `.env.example` and Config Health checklist.

## What's done when this ships

The Queue module can accept a `SendRequest` and enqueue it to Upstash QStash. A webhook handler at `POST /api/queue/deliver` receives QStash callbacks and passes them to the Mail Sender for execution. Promotional and update sends are delivered asynchronously; magic link sends are unaffected (they bypass the queue entirely per D003).

## Walkthrough

1. API receives a promotional send request, calls `queue.enqueue(sendRequest)`.
2. QStash receives the job and immediately returns an acknowledgement ID; API returns `{ queued: true, jobId }` to the caller in under 200ms.
3. QStash calls `POST /api/queue/deliver` with the send payload.
4. Webhook handler validates the QStash signature, calls `mailSender.send(request)`, returns 200.
5. If Mail Sender fails, webhook returns 500 — QStash retries on 5xx. Note: the 401 (invalid signature) is a 4xx and will NOT trigger QStash retry — this is correct behaviour.

**What if something goes wrong:**
- Invalid QStash signature: webhook returns 401 and does not execute the send.
- Mail Sender failure: webhook returns 500, QStash retries up to the configured retry limit.
- QStash enqueue failure: `queue.enqueue()` throws `QueueError` with `{ code: 'ENQUEUE_FAILED', cause }`.

## How we'll know it's done

1. `queue.enqueue(sendRequest)` posts the job to QStash and returns an acknowledgement within 200ms.
2. `POST /api/queue/deliver` with a valid QStash signature triggers `mailSender.send()` and returns 200.
3. `POST /api/queue/deliver` with an invalid signature returns 401 and does not call Mail Sender.
4. A failed `mailSender.send()` inside the webhook returns 500 (triggering QStash retry).
5. `npx vitest run` exits 0 (QStash SDK mocked).

## Notes / log

### 2026-05-24 — initial filing

QStash chosen for serverless Vercel compatibility — no Redis/BullMQ needed (architecture note). Signature validation is required; QStash provides a signing secret. Filed after WU-005 because the webhook handler must call a working Mail Sender. D005 confirms this module is Phase 1 scope.
