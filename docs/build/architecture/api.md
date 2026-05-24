# API

**Status:** 🔵 proposed
**Owner:** infrastructure
**Last updated:** 2026-05-24

## What this module does

The HTTP entry point for oss-mailer. Accepts a send request from the developer's backend, validates it, then either sends immediately (magic links) or enqueues for async delivery (promotional, update). Returns a result to the caller.

## Who uses it directly

- [P001](../personas/P001-indie-dev.md) — calls this from their own backend with a single function call: `sendEmail({ category, to, subject, ... })`

## What it depends on

- **Other modules:** Mail Sender (for synchronous magic link sends), Queue (for async enqueuing of promotional/update sends)
- **External services:** none directly
- **Hardware or infrastructure:** Next.js API route on Vercel

## What depends on it

- Nothing inside oss-mailer — it is the entry point
- The developer's backend (external caller)

## Contracts this module owns

| Contract | What it provides |
| --- | --- |
| [api](../contracts/api.md) | A single HTTP endpoint that accepts send requests and returns a send result or queue acknowledgement |

## Open questions about this module

_none currently_

## Decisions specific to this module

- [D003](../decisions/D003-hybrid-send-strategy.md) — magic links sent synchronously, promotional/update enqueued

## Notes

### 2026-05-24 — first filed

The branch on category (sync vs async) is the API's main logic. Everything else is validation and pass-through.
