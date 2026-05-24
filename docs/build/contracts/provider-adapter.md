# Contract: Provider Adapter

**Owner module:** [Provider Adapter](../architecture/provider-adapter.md)
**Status:** 🔵 proposed
**Last updated:** 2026-05-24

## In one sentence

Provider Adapter defines the `EmailProvider` interface and ships a concrete adapter for each supported provider, so the Mail Sender can send without knowing which provider it's talking to.

## What this module produces

- A shared `EmailProvider` interface with three members:
  - `name: string` — provider identifier used in Send Log records and Config Health display (e.g. `'ses'`)
  - `validate(): void` — throws `ProviderError` immediately if required env vars are missing or clearly invalid; called at startup
  - `send(request: ProviderSendRequest): Promise<SendResult>` — executes the send
- A concrete adapter for AWS SES (AWS SDK v3) implementing that interface
- Each adapter reads its credentials from env vars and translates the standard request into provider-specific API calls
- `ProviderSendRequest`: `{ from: string, to: string, subject: string, html: string, text: string, headers?: Record<string, string> }`
- `SendResult`: `{ success: boolean, messageId?: string, error?: string, provider: string, sentAt: string }` (ISO-8601 `sentAt`)

## What this module consumes

- `ProviderSendRequest` (see above) — assembled by Mail Sender from the API request, rendered template, and `MAILER_FROM` env var
- SES adapter env vars: `SES_ACCESS_KEY_ID`, `SES_REGION` (plus the secret key — see `.env.example`)

## What this module does not provide

- Routing logic — that belongs to the Router
- Retry logic — that belongs to the Queue
- Bounce/complaint webhook handling — out of scope for v1
- Any provider-specific features beyond sending (e.g. SES templates, Mailgun tags)

## How it fails

- If credentials are missing or invalid, the adapter throws immediately with a clear error message before attempting the send
- If the provider API returns an error, the adapter returns `{ success: false, error: '...' }` — it does not throw, so the Mail Sender can log and hand off to the queue for retry

## Personas this contract serves

- [P001 — Indie SaaS Developer](../personas/P001-indie-dev.md) — benefits from reliable sends via cheap providers
- [P002 — Open Source Contributor](../personas/P002-oss-contributor.md) — this interface is their primary contribution target

## Work units that produce this contract

| WU | Status |
| --- | --- |

## Work units that consume this contract

| WU | Status |
| --- | --- |

## Decisions that shaped this contract

- [D002 — No fallback, routing by category](../decisions/D002-no-fallback-routing-by-category.md)

## Notes

### 2026-05-24 — first filed

The `SendResult` shape is important: always returns, never throws (on provider error). Keeps Mail Sender logic clean — it checks `success`, logs, and hands to the queue if needed.
