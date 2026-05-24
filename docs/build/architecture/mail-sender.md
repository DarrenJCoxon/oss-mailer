# Mail Sender

**Status:** 🔵 proposed
**Owner:** infrastructure
**Last updated:** 2026-05-24

## What this module does

Accepts a send request (sender address, recipient address, subject, body, email category) and delivers the email to the recipient's inbox via the configured provider. The category (`magic_link`, `promotional`, `update`) determines which provider is used. This is the central module — everything else exists to feed it or record what it does.

## Who uses it directly

- [P001](../personas/P001-indie-dev.md) — calls this module indirectly via the API, from their own backend

## What it depends on

- **Other modules:** Router (to determine which provider to use), Template Renderer (to produce the HTML body), Provider Adapter (to execute the actual send)
- **External services:** AWS SES (via the SES provider adapter)
- **Hardware or infrastructure:** none

## What depends on it

- **Send Log** — records every attempt and outcome produced by this module
- **Queue** — feeds pending send requests into this module

## Contracts this module owns

| Contract | What it provides |
| --- | --- |
| [mail-sender](../contracts/mail-sender.md) | A delivered email in the recipient's inbox, plus a send result (success/failure, provider used, timestamp) |

## Open questions about this module

_none currently_

## Decisions specific to this module

- [D002](../decisions/D002-no-fallback-routing-by-category.md) — routing is by category; no failover between providers

## Notes

### 2026-05-24 — first filed

Central module. Everything else (router, queue, adapters, templates, logs) exists to support this one job: get the right email to the right inbox.
