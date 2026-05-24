# Q001 — Which provider should be the fallback to AWS SES?

| Field | Value |
| --- | --- |
| Status | 🟡 open |
| Date opened | 2026-05-24 |
| Blocks | Phase B — Architecture (provider adapter design) |

## The question

AWS SES is the primary send provider. When SES is down or a send fails, oss-mailer needs a fallback. Two candidates were named during Phase A: **Mailgun** and **Brevo**. Which one ships as the built-in fallback, and which (if either) is left to contributors?

## Why it matters

The fallback provider needs a production-ready adapter in the initial release. The router needs to know the fallback priority order. Whichever is chosen sets the template for how contributors add new providers.

## Options considered

- **Mailgun**: well-known, generous free tier, good deliverability, straightforward REST API.
- **Brevo (formerly Sendinblue)**: very cheap, solid free tier (300 emails/day), slightly less known but improving deliverability reputation.
- **Both**: ship both adapters in v1 so users have a real choice — adds a small amount of initial build work but raises immediate value.

## What would resolve this

A preference call — either is technically sound. Resolve before Phase B begins so the adapter interface can be designed with the right providers in mind.
