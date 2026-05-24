# Provider Adapter

**Status:** 🔵 proposed
**Owner:** infrastructure
**Last updated:** 2026-05-24

## What this module does

Defines a standard interface (`EmailProvider`) that every email provider must implement, and ships one adapter per supported provider (starting with SES). The Mail Sender calls the interface — never a provider SDK directly — so adding a new provider means writing one new file with zero changes to core code.

## Who uses it directly

- [P002](../personas/P002-oss-contributor.md) — contributes new provider adapters by implementing the `EmailProvider` interface in a single file

## What it depends on

- **Other modules:** none
- **External services:** AWS SES SDK (SES adapter), provider-specific SDKs per adapter
- **Hardware or infrastructure:** none — credentials come from env vars

## What depends on it

- **Mail Sender** — calls the adapter returned by the Router to execute the send

## Contracts this module owns

| Contract | What it provides |
| --- | --- |
| [provider-adapter](../contracts/provider-adapter.md) | A standard `EmailProvider` interface and one concrete adapter per supported provider |

## Open questions about this module

_none currently_

## Decisions specific to this module

- [D002](../decisions/D002-no-fallback-routing-by-category.md) — one provider per category; no switching logic inside the adapter

## Notes

### 2026-05-24 — first filed

The `EmailProvider` interface is the single most important extension point in the codebase. P002's acid test: clone the repo, copy an existing adapter file, implement the interface, add an env var — done in under two hours without touching any other file.
