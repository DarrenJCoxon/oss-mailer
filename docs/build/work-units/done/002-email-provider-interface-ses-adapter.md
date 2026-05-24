# Work Unit 002 — `EmailProvider` interface + SES adapter

**Status:** ✅ shipped
**For:** [P001 — Indie SaaS Developer](../../personas/P001-indie-dev.md) / [P002 — OSS Contributor](../../personas/P002-oss-contributor.md)
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
- Invalid credentials: `send()` returns `{ success: false, error: '<auth message>', provider: 'ses', sentAt }` — never throws.
- Recipient not verified (SES sandbox): same — `{ success: false }` with the SES error message preserved verbatim.

## How we'll know it's done

1. `EmailProvider` interface exported from `src/providers/interface.ts` with `name: string`, `validate(): void`, and `send(req: ProviderSendRequest): Promise<SendResult>` fully typed.
2. `SesAdapter` implements `EmailProvider` using AWS SDK v3 and passes all unit tests with a mocked SES client.
3. `SesAdapter` adds `List-Unsubscribe` header on sends where `req.headers['List-Unsubscribe']` is present (populated by Mail Sender for promotional/update categories per D008).
4. Calling `sesAdapter.send({ from, to, subject, html, text })` with real credentials delivers an email including a plain-text part (manual smoke test).
5. When credentials are invalid, `send()` returns `{ success: false, error: '<message>', provider: 'ses', sentAt }` — the raw AWS SDK error is caught and never re-thrown.
6. `sesAdapter.validate()` throws `ProviderError` immediately if required env vars are absent.
7. `npx vitest run` exits 0.

## Notes / log

### 2026-05-24 — initial filing

The `EmailProvider` interface is the most load-bearing extension point in the codebase (architecture note, 2026-05-24). P002's acid test: implement a new adapter in under 2 hours without touching any file outside `src/providers/`. Filed before Router (WU-003) because the Router's return type depends on the interface being defined.

### 2026-05-24 — architect brief

**Design question 1 — ProviderError:**

Option A — `class ProviderError extends Error` with `provider`, `code`, `cause?` fields and a `_tag: 'ProviderError'` brand. Idiomatic `throw new ProviderError(...)`; native `.stack`; Mail Sender catches with `instanceof ProviderError`; Vitest matches via `expect(fn).toThrowError(ProviderError)`. Risk: `instanceof` fails if the class is loaded by two distinct module graphs (dual ESM/CJS, RSC payload boundaries, dev HMR re-evaluation). Mitigation: belt-and-suspenders `_tag` brand checked by a sibling `isProviderError()` guard.

Option B — Branded plain object `{ _tag: 'ProviderError', provider, code, message, cause? }` plus `isProviderError(e: unknown): e is ProviderError`. No instanceof concerns. Cost: must hand-roll a `stack` field (`new Error().stack`) to retain trace; loses the "throw an Error" convention that IDEs, Next.js error overlays, Sentry, and Vitest assertions all expect; tests must `try/catch` and run the guard rather than use `toThrowError(Class)`.

**Chosen: A** — single Next.js bundle with one tsconfig means the cross-graph `instanceof` failure mode does not apply, and we gain native stack traces, idiomatic throw semantics, and clean test ergonomics; the `_tag` brand and `isProviderError()` guard sit alongside for free as a defence-in-depth narrow.

**Design question 2 — SesAdapter instantiation:**

Option A — `new SesAdapter()` reads `SES_ACCESS_KEY_ID` / `SES_SECRET_ACCESS_KEY` / `SES_REGION` directly from `process.env` inside the constructor; `validate()` re-reads them. Simplest call site. Tests must mutate `process.env` via `vi.stubEnv` (works, but per-test global state). Coupling to env is implicit; a second adapter would copy the pattern, embedding the same coupling.

Option B — `createSesAdapter(config?: { accessKeyId?, secretAccessKey?, region? }): EmailProvider`. Factory falls back to `process.env` for any unspecified field, returning an object that conforms to `EmailProvider`. Tests pass credentials directly — no global mutation, no cross-test leakage. Explicit seam between "where credentials originate" and "what the adapter does"; future config sources (Secrets Manager, Doppler) plug in at the factory call site without touching adapter internals. One extra indirection layer; no runtime cost on Vercel (env still read by default).

**Chosen: B** — factory with injected config. Testability without `process.env` mutation is the dominant property for an extension point whose acid test (P002, under two hours) hinges on a copy-able adapter file; the factory pattern is also the seam that lets the next adapter author swap config loaders without rewriting the adapter.

**File map for the coder:**

- `src/providers/interface.ts`
  - Exports `interface EmailProvider { name: string; validate(): void; send(req: ProviderSendRequest): Promise<SendResult> }`
  - Exports `type ProviderSendRequest = { from: string; to: string; subject: string; html: string; text: string; headers?: Record<string, string> }`
  - Exports `type SendResult = { success: boolean; messageId?: string; error?: string; provider: string; sentAt: string }`
  - JSDoc on every member; the `sentAt` field is documented as ISO-8601
  - No runtime code in this file — types and interface only

- `src/providers/errors.ts`
  - Exports `type ProviderErrorCode = 'MISSING_ENV' | 'AUTH_FAILED' | 'RECIPIENT_NOT_VERIFIED'`
  - Exports `class ProviderError extends Error` with public readonly `provider: string`, `code: ProviderErrorCode`, `cause?: unknown`, and `readonly _tag = 'ProviderError'`
  - Constructor signature: `constructor(args: { provider: string; code: ProviderErrorCode; message: string; cause?: unknown })`
  - Constructor calls `super(args.message)`, sets `this.name = 'ProviderError'`, assigns fields, and calls `Error.captureStackTrace?.(this, ProviderError)`
  - Exports `function isProviderError(e: unknown): e is ProviderError` that checks `e instanceof ProviderError || (typeof e === 'object' && e !== null && (e as { _tag?: unknown })._tag === 'ProviderError')`

- `src/providers/ses.ts`
  - Imports `SESClient` and `SendEmailCommand` (or `SendRawEmailCommand` — see Coder notes) from `@aws-sdk/client-ses`
  - Exports `function createSesAdapter(config?: { accessKeyId?: string; secretAccessKey?: string; region?: string }): EmailProvider`
  - Internal: resolves config by merging `config` over env defaults; builds an `SESClient` once at factory time using the resolved credentials
  - Returns an object: `{ name: 'ses', validate, send }`
  - `validate()` re-reads env vars (or stored config) and throws `new ProviderError({ provider: 'ses', code: 'MISSING_ENV', message: 'Missing SES env var(s): <list>' })` if any are absent
  - `send(req)` always returns `SendResult`, never throws:
    - Builds the SES command from `req`
    - On success: returns `{ success: true, messageId: response.MessageId, provider: 'ses', sentAt: new Date().toISOString() }`
    - On failure: catches; if it's an auth/credential class error, returns `{ success: false, error: '<message>', provider: 'ses', sentAt }`; for `MessageRejected` with "Email address is not verified", same shape but the message preserves the SES reason verbatim so Mail Sender's log captures it
  - The single carve-out: if `req.headers?.['List-Unsubscribe']` is present, the send MUST use `SendRawEmailCommand` with a hand-built MIME body that includes that header (and the optional `List-Unsubscribe-Post: List-Unsubscribe=One-Click`); `SendEmailCommand` does not expose custom headers. See Coder notes for the MIME shape.

- `src/providers/index.ts`
  - Re-exports `EmailProvider`, `ProviderSendRequest`, `SendResult` from `./interface`
  - Re-exports `ProviderError`, `ProviderErrorCode`, `isProviderError` from `./errors`
  - Re-exports `createSesAdapter` from `./ses`

**Coder notes:**

1. **AWS SDK v3 commands.** Use two code paths inside `send()`:
   - **No custom headers:** `SendEmailCommand` with `Destination.ToAddresses`, `Message.Subject`, `Message.Body.Html.Data`, `Message.Body.Text.Data`, `Source: req.from`. This is the common path and keeps the body simple.
   - **With `List-Unsubscribe` header:** `SendRawEmailCommand` with a manually built multipart/alternative MIME message. Minimum structure: top-level headers (`From`, `To`, `Subject`, `MIME-Version: 1.0`, `List-Unsubscribe: <url>`, `List-Unsubscribe-Post: List-Unsubscribe=One-Click`, `Content-Type: multipart/alternative; boundary="b1"`), then two parts — `text/plain; charset=UTF-8` then `text/html; charset=UTF-8`. The text part comes first (RFC 2046 — clients pick the last understood part; html-last means html wins). Encode the MIME string to a `Uint8Array` (`new TextEncoder().encode(mime)`) and pass as `RawMessage.Data`. Wrap the subject in `=?UTF-8?B?<base64>?=` only if it contains non-ASCII; for ASCII subjects pass raw.

2. **Error categorisation in `send()`.** Catch `unknown`, then narrow:
   - `error?.name === 'CredentialsProviderError'` or `error?.name === 'InvalidClientTokenId'` or `error?.name === 'SignatureDoesNotMatch'` → treat as auth failure
   - `error?.name === 'MessageRejected'` with message including `not verified` → recipient-not-verified
   - Default: pass through `error.message` (or `String(error)` if no message)
   Return the `SendResult` shape; do not throw from `send()`. The contract is hard: `send()` never throws on provider error. Throwing is reserved for `validate()`.

3. **`validate()` semantics.** `validate()` is called at startup (likely by the existing `validateEnv()` orchestrator or directly by a server bootstrap). It throws `ProviderError` with code `MISSING_ENV` when any of the three SES env vars are absent. It should NOT make a network call — env presence only. Live credential validation happens implicitly on the first `send()`.

4. **Factory closure pattern.** `createSesAdapter` returns a plain object, not a class instance. Example shape:
   ```typescript
   export function createSesAdapter(config?: SesConfig): EmailProvider {
     const resolved = {
       accessKeyId: config?.accessKeyId ?? process.env.SES_ACCESS_KEY_ID,
       secretAccessKey: config?.secretAccessKey ?? process.env.SES_SECRET_ACCESS_KEY,
       region: config?.region ?? process.env.SES_REGION,
     }
     // client is lazily built only when all three resolve, so validate() can run before client construction
     let client: SESClient | null = null
     const getClient = () => { /* build SESClient with resolved creds; cache */ }
     return {
       name: 'ses',
       validate() { /* check resolved fields; throw ProviderError MISSING_ENV if absent */ },
       async send(req) { /* getClient() then SendEmailCommand or SendRawEmailCommand */ },
     }
   }
   ```
   This keeps `validate()` callable on a partially-configured adapter without crashing on SDK construction.

5. **Tests (the tester will own these but plan for them):**
   - Unit test `validate()` returns void when config is fully injected.
   - Unit test `validate()` throws `ProviderError` with code `MISSING_ENV` when any field is missing — pass partial config; do not touch `process.env`.
   - Unit test `send()` happy path with a mocked `SESClient.send` (use `@aws-sdk/client-ses` mock via `vi.mock` or `aws-sdk-client-mock`) returns `{ success: true, messageId, provider: 'ses', sentAt }`.
   - Unit test `send()` with `headers['List-Unsubscribe']` triggers the `SendRawEmailCommand` path; assert the raw MIME contains `List-Unsubscribe:` line and both `text/plain` and `text/html` parts in that order.
   - Unit test `send()` on a thrown SDK error returns `{ success: false, error, provider, sentAt }` and does NOT re-throw.
   - Unit test `isProviderError(new ProviderError(...))` is true; `isProviderError(new Error('x'))` is false.

6. **No dependency on Mail Sender, Router, or env validator.** This WU stands alone behind WU-001. The adapter's env vars are already in `REQUIRED_ENV_VARS` (verified in `src/lib/env.ts`), so the global `validateEnv()` already fails fast at startup — `SesAdapter.validate()` is a per-adapter belt that lets Config Health (WU-010) check a specific adapter's readiness without re-running the global check.

7. **Install:** `npm install @aws-sdk/client-ses` (production dep). Optionally `npm install -D aws-sdk-client-mock` for cleaner test mocks, though `vi.mock` on the SDK module also works.


### Review -- 2026-05-24

**Reviewer:** claude-sonnet-4-6 (reviewer agent)

#### AC-4 -- Operator gate

AC-4 (real-credential smoke test) is a manual operator gate, not an automated check. It cannot be verified by this review. The gate requires SES_ACCESS_KEY_ID, SES_SECRET_ACCESS_KEY, SES_REGION, and a verified-sender MAILER_FROM set in .env.local, then a manual call to sesAdapter.send(...) to confirm a plain-text part arrives in the inbox. This finding is informational -- it does not block promotion.

#### Findings

**WARN -- AC-5 wording contradicts the contract and architect brief**
File: docs/build/work-units/002-email-provider-interface-ses-adapter.md, line 33

AC-5 reads: "A ProviderError is thrown -- not a raw AWS SDK error -- when credentials are invalid." The implementation returns { success: false } and never throws from send(), which is correct per docs/build/contracts/provider-adapter.md ("the adapter returns { success: false } -- it does not throw") and per the architect coder note 2 in the same WU ("Return the SendResult shape; do not throw from send()."). The tests correctly assert { success: false }. The AC wording is the outlier.
Suggested fix: reword AC-5 to: "When credentials are invalid, send() returns { success: false, error: message, provider: ses, sentAt } -- the raw AWS SDK error is caught and never re-thrown." This is a documentation fix only; no code change needed.

**WARN -- MIME body ordering not asserted in tests**
File: src/providers/ses.test.ts, lines 74-99 (AC-3 describe block)

The architect brief and this review spec require text/plain to precede text/html in the MIME body (RFC 2046: clients pick the last understood part; html-last means html wins). The implementation at ses.ts lines 65-71 is correct -- text/plain comes first. However the AC-3 test only asserts commandArg._type === "SendRawEmailCommand"; it does not decode the RawMessage.Data bytes and verify part ordering. A future reorder of MIME parts would not be caught.
Suggested fix: after the _type assertion in the AC-3 test, add:
  const mimeBody = new TextDecoder().decode(commandArg.input.RawMessage.Data)
  expect(mimeBody.indexOf('text/plain')).toBeLessThan(mimeBody.indexOf('text/html'))

**NIT -- ProviderErrorCode export accessibility from barrel**
File: src/providers/index.ts, line 2

errors.ts exports ProviderErrorCode (the union type). The barrel uses export * from ./errors which should include it transitively. Confirm consumers can import { ProviderErrorCode } from @/providers without TS error. No action needed if tsc passes; flag if a future consumer finds it missing.

**NIT -- as Record<string, unknown> cast in catch block**
File: src/providers/ses.ts, line 110

The cast is the idiomatic approach with useUnknownInCatchVariables. Acceptable; no change required.

**NIT -- InvalidClientTokenId / SignatureDoesNotMatch matched via message string, not name**
File: src/providers/ses.ts, lines 115-116

The coder note describes checking error?.name for these values, but the implementation checks String(e?.message).includes(...). AWS SDK v3 embeds the code in the message string, so this is pragmatically correct. The test suite does not cover this specific branch but the general "any SDK error returns { success: false }" path is covered. Worth noting for future hardening; not a blocker.

### 2026-05-24 — reviewer findings applied + promotion

- **WARN 1 resolved** — AC-5 wording fixed in "How we'll know it's done" and "What if something goes wrong" to accurately state `send()` returns `{ success: false }` rather than throwing.
- **WARN 2 resolved** — MIME body ordering assertion added to `ses.test.ts` AC-3 test: `text/plain` index must be less than `text/html` index in decoded `RawMessage.Data`.
- **NITs deferred** — ProviderErrorCode barrel check confirmed via `tsc --noEmit`; cast and message-matching approaches acceptable as-is.
- **AC-4 operator-gate** — manual smoke test with live credentials required before declaring full production readiness.
- **Final gate: 43 tests, 9 files, all passing.**

**WU-002 ✅ shipped. Moved to done/.**
