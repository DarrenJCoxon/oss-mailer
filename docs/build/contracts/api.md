# Contract: API

**Owner module:** [API](../architecture/api.md)
**Status:** 🔵 proposed
**Last updated:** 2026-05-24

## In one sentence

API accepts a send request from the developer's backend, validates it, and either delivers immediately (magic links) or enqueues for async delivery (promotional, update).

## What this module produces

- For `magic_link`: a synchronous send result — `{ success: boolean, messageId?: string, error?: string }`
- For `promotional` / `update`: a queue acknowledgement — `{ queued: true, jobId: string }` — delivery happens async
- Validation errors returned immediately with a clear message if the request is malformed

## What this module consumes

- A send request from the caller: `{ category: 'magic_link' | 'promotional' | 'update', from: string, to: string, subject: string, template: string, data?: object }`
- An API key for auth — from env vars, validated on every request

## What this module does not provide

- Email rendering — delegated to Template Renderer
- Send execution — delegated to Mail Sender
- Queue management — delegated to Queue
- Delivery status webhooks — out of scope for v1

## How it fails

- Missing or invalid API key → `401 Unauthorized` immediately
- Missing required fields → `400 Bad Request` with field-level error detail
- Mail Sender failure (magic link) → `500` with error message; no retry at API layer (caller retries)
- Queue failure (bulk) → `500`; caller should retry

## Personas this contract serves

- [P001 — Indie SaaS Developer](../personas/P001-indie-dev.md) — this is the only surface they interact with directly

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

API key auth via env var keeps it simple — single-tenant deployment, no user accounts needed (D001).
