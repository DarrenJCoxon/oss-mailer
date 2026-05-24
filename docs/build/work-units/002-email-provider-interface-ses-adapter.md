# Work Unit 002 — `EmailProvider` interface + SES adapter

**Status:** 🔵 proposed
**For:** [P001 — Indie SaaS Developer](../personas/P001-indie-dev.md) / [P002 — OSS Contributor](../personas/P002-oss-contributor.md)
**Last updated:** 2026-05-24

**Depends on:** [WU-001 — Project scaffolding](001-project-scaffolding.md)

## What's done when this ships

The `EmailProvider` TypeScript interface is defined and exported. A concrete SES adapter implements it. A developer adding a new provider only needs to implement this interface in a single file — no changes anywhere else. The SES adapter is tested with a mocked SES client; it can send a real email when SES credentials are present in `.env.local` (access key ID, secret key, region, from-address).

## Walkthrough

1. P002 opens `src/providers/` and finds the `EmailProvider` interface in `interface.ts` — three members, fully typed, with JSDoc on each.
2. Copies `ses.ts` as a starting point for a new adapter, implements the interface, exports the class.
3. No other file needs to change.

P001 path:
1. Adds the four SES-related env vars to `.env.local` (documented in `.env.example`).
2. The SES adapter reads them at instantiation — no additional wiring.

**What if something goes wrong:**
- Invalid credentials: the adapter throws a typed `ProviderError` with `{ provider: 'ses', code: 'AUTH_FAILED', message }`.
- Recipient not verified (SES sandbox): throws `ProviderError` with `code: 'RECIPIENT_NOT_VERIFIED'`.

## How we'll know it's done

1. `EmailProvider` interface exported from `src/providers/interface.ts` with `name: string`, `validate(): void`, and `send(req: ProviderSendRequest): Promise<SendResult>` fully typed.
2. `SesAdapter` implements `EmailProvider` using AWS SDK v3 and passes all unit tests with a mocked SES client.
3. `SesAdapter` adds `List-Unsubscribe` header on sends where `req.headers['List-Unsubscribe']` is present (populated by Mail Sender for promotional/update categories per D008).
4. Calling `sesAdapter.send({ from, to, subject, html, text })` with real credentials delivers an email including a plain-text part (manual smoke test).
5. A `ProviderError` is thrown — not a raw AWS SDK error — when credentials are invalid.
6. `sesAdapter.validate()` throws `ProviderError` immediately if required env vars are absent.
7. `npx vitest run` exits 0.

## Notes / log

### 2026-05-24 — initial filing

The `EmailProvider` interface is the most load-bearing extension point in the codebase (architecture note, 2026-05-24). P002's acid test: implement a new adapter in under 2 hours without touching any file outside `src/providers/`. Filed before Router (WU-003) because the Router's return type depends on the interface being defined.
