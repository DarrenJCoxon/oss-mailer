# D002 — No fallback provider — routing is by email category, not redundancy

| Field | Value |
| --- | --- |
| Status | ✅ accepted |
| Date | 2026-05-24 |
| Supersedes | — |
| Superseded by | — |
| Resolves | Q001 |

## Context

During Phase A, a fallback provider (Mailgun or Brevo) was proposed in case AWS SES went down. On reflection, this adds complexity for a failure mode that's extremely rare (SES uptime ~99.9%) and doesn't match the project's "keep it simple" ethos.

## Decision

oss-mailer has no failover or fallback logic. The router picks a provider based on email category (e.g. `magic_link` → SES, `promotional` → whichever provider the user configures). If a send fails, it fails — the queue retries on schedule. There is no automatic switch to a secondary provider.

## Why

- Failover logic is complex to implement correctly and nearly never triggered
- The project's value is simplicity — routing by category is already the interesting part
- Users who need high-availability failover have more complex needs than oss-mailer targets
- Contributors can always add failover later if demand warrants it

## What this commits future work to

- No provider-switching logic in the router
- Retry logic is time-based (queue retries), not provider-switching
- Each email category maps to one configured provider — straightforward config
