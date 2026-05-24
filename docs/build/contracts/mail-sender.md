# Contract: Mail Sender

**Owner module:** [Mail Sender](../architecture/mail-sender.md)
**Status:** 🔵 proposed
**Last updated:** 2026-05-24

## In one sentence

Mail Sender accepts a categorised send request and guarantees the email reaches the recipient's inbox via the appropriate provider.

## What this module produces

- A delivered email in the recipient's inbox containing a CTA (magic link, update action, promotional content)
- A send result: success or failure, provider used, message ID, timestamp
- A log entry recording the attempt and outcome

## What this module consumes

- A send request containing: sender address, recipient address, subject, email category (`magic_link` / `promotional` / `update`), and rendered HTML body — produced by the caller via the API
- A provider selection — produced by [Router](router.md)
- Rendered HTML body — produced by [Template Renderer](template-renderer.md)
- An available provider connection — produced by [Provider Adapter](provider-adapter.md)

## What this module does not provide

- Email open/click tracking (out of scope — see Map 1)
- Scheduling or time-delayed sends (queue handles ordering; timing is the caller's responsibility)
- Bounce and complaint processing (provider webhooks are out of scope for v1)
- Multi-recipient broadcast (each send request is one recipient)

## How it fails

- If the provider returns an error, the send result records `failed` with the error reason and the queue retries on schedule
- If rendered HTML is malformed, the send is rejected before hitting the provider and the error is logged
- If required fields (recipient, category, body) are missing, the API layer rejects the request before it reaches this module

## Personas this contract serves

- [P001 — Indie SaaS Developer](../personas/P001-indie-dev.md)

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

Core contract. Every other module's contract is justified by what this one needs to do its job.
