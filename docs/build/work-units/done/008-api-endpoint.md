# Work Unit 008 — API endpoint — `POST /api/send`

**Status:** ✅ shipped
**For:** [P001 — Indie SaaS Developer](../../personas/P001-indie-dev.md)
**Last updated:** 2026-05-25

**Depends on:** [WU-005 — Mail Sender](005-mail-sender.md), [WU-007 — Queue](007-queue.md)

## What's done when this ships

`POST /api/send` is live. It validates the request body, checks the API key, branches by category (magic link → Mail Sender sync, promotional/update → Queue), and returns a typed result. This is P001's single integration point — the one call their backend makes to send any type of email.

## Walkthrough

1. P001's backend calls `POST /api/send` with header `Authorization: Bearer <MAILER_API_KEY>` and body `{ category: 'magic_link', to: 'user@example.com', subject: 'Login', props: { url: '...' } }`. Note: `from` is not in the body — read from `MAILER_FROM` env var by Mail Sender (D006).
2. Endpoint validates the API key and body schema.
3. Category is `magic_link` → calls `mailSender.send()` synchronously → returns `{ success: true, messageId, provider, sentAt }`.
4. Category is `promotional` → calls `queue.enqueue()` → returns `{ queued: true, jobId }`.

**What if something goes wrong:**
- Invalid API key: returns 401 `{ error: 'UNAUTHORIZED' }`.
- Schema validation failure: returns 400 `{ error: 'VALIDATION_FAILED', fields: [...] }`.
- Unknown category: returns 400 `{ error: 'UNKNOWN_CATEGORY', category }`.
- Mail Sender failure (magic link): returns 500 `{ error: 'SEND_FAILED', detail }`.
- Queue enqueue failure: returns 500 `{ error: 'QUEUE_FAILED', detail }`.

## How we'll know it's done

1. `POST /api/send` with a valid magic link payload delivers an email and returns `{ success: true, messageId }`.
2. `POST /api/send` with a valid promotional payload returns `{ queued: true, jobId }` in under 200ms.
3. Missing or wrong API key returns 401.
4. Malformed body returns 400 with a field-level error description.
5. Unknown category returns 400 with `error: 'UNKNOWN_CATEGORY'`.
6. All error response bodies use voice-compliant language (no "Oops", no "Unfortunately", no orphan "Please try again" — per voice.md).
7. `npx vitest run` exits 0.

## Notes / log

### 2026-05-24 — initial filing

P001's single integration point (architecture note, api.md). The branch on category (sync vs async) is the endpoint's main logic; everything else is validation and pass-through. API key auth is env-var-based (`MAILER_API_KEY`) — simple, no OAuth, consistent with self-hosted OSS design (D001).

### 2026-05-25 — architect

#### Pre-decision context discovered while reading

- **Zod is not installed.** `package.json` lists no `zod` dependency. Adoption requires `npm install zod` (one direct dep, no peer deps, ~50 KB minified). No transitive impact on the existing 189 passing tests.
- **The codebase has zero schema-validation precedent.** Every existing module (router, sender, send-log, queue, providers) uses hand-written validation against TypeScript types and throws tagged error classes (`RouterError`, `MailSenderError`, `SendLogError`, `QueueError`, `ProviderError`). The discrimination of "valid vs invalid" is always done at the boundary by the function that receives the data; there is no shared validator framework.
- **WU-007 set a strong factory-handler precedent.** `createDeliverHandler({ mailSender })` lives in `src/queue/index.ts` and is mounted in `src/app/api/queue/deliver/route.ts` as a one-liner. The route file is pure wiring; all observable handler behaviour is exercised through `src/queue/index.test.ts` by passing fakes directly. The Gate B rebuttal in that WU explicitly stated: route files in this repo are construction-time wiring only, not testable logic.
- **`SendRequest` is already typed in `src/sender/index.ts`** as `{ category: EmailCategory; to: string; subject: string; props?: Record<string, unknown> }`. `EmailCategory = 'magic_link' | 'promotional' | 'update'` from `src/router/index.ts`. The shape is small (4 fields, one literal-union) and the runtime checks needed for AC-4/AC-5 are: (a) `category` ∈ union, (b) `to` is non-empty string, (c) `subject` is non-empty string, (d) `props` is undefined or a plain object. Four checks. No nested structure.
- **AC-4 specifies "field-level error description"** — not "JSON Schema error object", not "a list of `{path, message}` records". A simple `fields: string[]` array (or `fields: Array<{ field: string; reason: string }>`) satisfies it. The contract `docs/build/contracts/api.md` says only "field-level error detail"; the exact shape is the architect's call.
- **The WU-007 reviewer flagged a DRY debt.** `src/app/api/queue/deliver/route.ts` line 8 contained an inline adapter. WU-008 extracted this to `createLogWriter()` per D010.
- **`DELIVER_URL` is not yet an env var.** WU-007 hard-passed it as a constructor arg. WU-008 added it to `REQUIRED_ENV_VARS` and `src/lib/env.ts`.

---

#### Decision: Design B — Manual validation + handler factory (mirrors WU-007)

**Rejected Design A (Zod validation + inline handler).** Two load-bearing reasons:

1. **Testability.** All observable behaviour (auth, validation, branching, error mapping, voice-compliant strings) must be reachable without `vi.mock`. Design B achieves this by injecting `mailSender`, `queue`, and `apiKey` into `createSendHandler`. Design A embeds the handler inside the route file, requiring module-level mocks for every dependency plus all env vars at import time.

2. **Zod's value proposition does not apply.** `SendRequest` is four flat fields. The hand-written `validateSendRequest` is 25 lines and produces exactly the field-level error format needed. Adding Zod introduces a new validation idiom that diverges from every other module in the codebase — either a future cross-cutting refactor or permanent two-pattern inconsistency. The cost outweighs saving ~15 lines.

---

### 2026-05-25 — coder

#### What was implemented

**Modified files:**

- `src/send-log/index.ts` — added `createLogWriter(): SendLogWriter` factory and re-exported `SendLogWriter` type. Placed after `writeSendAttempt` definition per reviewer requirement.
- `src/app/api/queue/deliver/route.ts` — replaced inline `logWriter` adapter with `createLogWriter()` (D010 DRY debt resolved).
- `src/lib/env.ts` — added `'DELIVER_URL'` to `REQUIRED_ENV_VARS`.
- `src/lib/env.test.ts` — added `'DELIVER_URL'` to the test's `ALL_VARS` list.

**New files:**

- `src/api/send/index.ts` — exports `ValidationFailure`, `validateSendRequest`, `MailSenderForSend`, `QueueForSend`, `createSendHandler`. Uses 202 for the queue path. Auth check uses standard string equality (high-entropy API key, consistent with D001).
- `src/app/api/send/route.ts` — pure construction wiring.

**Not done / notes:**

- `.env.example` — sandbox denied access; `DELIVER_URL=http://localhost:3000/api/queue/deliver` needs manual addition.
- `SendApiError` and `isSendApiError` intentionally omitted — handler failures are HTTP responses, not thrown errors. Downstream WUs must not assume these exports exist.

**Verification:** `npx tsc --noEmit` exits 0. `npx vitest run` → 220 tests pass, 0 failures.

### 2026-05-25 — tester

38 new tests added in `src/api/send/index.test.ts`:

- `validateSendRequest` — table-driven per field: missing/non-string category, missing/empty `to`, missing/empty `subject`, array `props`, null `props`, valid body, non-object root, unknown-category string (deferred to handler).
- `createSendHandler` — missing/wrong/malformed `Authorization`, malformed JSON, invalid field shape, unknown category, magic_link happy path (200), send returns false (500), send throws (500), promotional happy path (202), update happy path (202), enqueue throws (500), voice spot-check.

Total: 258 tests, 0 failures.

Gate B rebuttal: `src/app/api/send/route.ts` and `src/app/api/queue/deliver/route.ts` are pure construction-time wiring. All observable behaviour is exercised through `src/api/send/index.test.ts` and `src/queue/index.test.ts` by injecting fakes.

### 2026-05-25 — reviewer

APPROVED after one fix cycle.

**Blocker resolved:** `createLogWriter()` was initially placed before `writeSendAttempt` in `src/send-log/index.ts`. Reviewer required it appear after the function it wraps (readability + avoids forward-reference confusion even if technically valid). Fixed: reordered.

**Findings (non-blocking, all confirmed addressed):**
- Array body passes `typeof raw === 'object'` guard — produces field-level errors rather than a `(root)` error. Tester adjusted tests to match actual behaviour. Documented here.
- Voice spot-check passes — no "Please", "Oops", "Unfortunately", or "Sorry" in any response body.
- Gate A: 258/258 pass. Gate B: all source files covered. Both gates clear.

### 2026-05-25 — operator note

`.env.example` still needs `DELIVER_URL=http://localhost:3000/api/queue/deliver` added manually (sandbox blocked coder access). For production: `DELIVER_URL=https://<your-vercel-deployment>/api/queue/deliver`.
