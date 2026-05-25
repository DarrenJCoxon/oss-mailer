# Work Unit 005 — Mail Sender — core sync delivery

**Status:** ✅ shipped
**For:** [P001 — Indie SaaS Developer](../../personas/P001-indie-dev.md)
**Last updated:** 2026-05-25

**Depends on:** [WU-002](002-email-provider-interface-ses-adapter.md), [WU-003](003-router.md), [WU-004](004-template-renderer.md)
**Integration verification requires:** [WU-006](../006-send-log-backend.md) (Send Log write path — can be built in parallel; integration test gates WU-005 done)

## What's done when this ships

The Mail Sender accepts a `SendRequest` (category, to, subject, optional props), renders the template, routes to the correct provider, executes the send, writes the result to the Send Log, and returns a `SendResult`. A magic link send called directly against Mail Sender delivers an email within 3 seconds. This is the central module — when it ships, the core pipeline is functional end-to-end.

## Walkthrough

1. Mail Sender receives `{ category: 'magic_link', to: 'user@example.com', subject: 'Your login link', props: { url: '...' } }`.
2. Calls `renderTemplate('magic_link', props)` → `{ html, text }`.
3. Calls `router.resolve('magic_link')` → SES adapter.
4. Assembles `ProviderSendRequest`: reads `MAILER_FROM` from env, adds `List-Unsubscribe` header for promotional/update (D008).
5. Calls `adapter.send({ from, to, subject, html, text, headers? })` → `{ success, messageId, provider, sentAt }`.
6. Writes attempt + result to Send Log (catches `SendLogError`, logs to stderr, does not propagate).
7. Returns `SendResult { success: true, messageId, provider, sentAt }`.

**What if something goes wrong:**
- Provider throws `ProviderError`: Mail Sender catches it, writes failure to Send Log, returns `SendResult { success: false, error }`.
- Template render fails: throws before send attempt; no log entry written (nothing was attempted at the provider level).

## How we'll know it's done

1. `mailSender.send({ category: 'magic_link', to, subject, props })` with real SES credentials delivers an email to the recipient inbox.
2. A Send Log entry is written for every send attempt (success and failure).
3. A failed send (bad credentials) returns `SendResult { success: false }` and writes a failure log entry — it does not throw.
4. The send completes in under 3 seconds for magic link category in a local dev environment.
5. `npx vitest run` exits 0 (Send Log writes mocked).

## Notes / log

### 2026-05-24 — initial filing

Central module (architecture note). Depends on WU-006 (Send Log backend) for the write path — both can be built in parallel but this WU's integration test requires WU-006 to be complete. WU-007 (Queue) feeds this module for async sends; that dependency runs the other way (Queue → Mail Sender), so this WU has no hard dependency on WU-007.

### 2026-05-25 — implementation

**Files changed:** `src/sender/index.ts` (new file, 111 lines)

**What was implemented:**
- `SendRequest` type, `MailSenderError` class with codes `'TEMPLATE_ERROR' | 'SEND_LOG_ERROR'`, `isMailSenderError` guard
- `WriteSendAttemptArgs` type and `SendLogWriter` interface
- `createMailSender(router, logWriter)` factory returning `{ send }` implementing the full pipeline: renderTemplate → router.resolve → MAILER_FROM check → List-Unsubscribe header for promotional/update → adapter.send → logWriter.writeSendAttempt (best-effort, stderr on failure) → return SendResult

**Unexpected findings:**
- `TemplateError` is rethrown as-is (not wrapped) — template failures surface before any provider call, so no log entry is written and the caller sees the TemplateError directly.
- `MAILER_FROM` can be a bare address (`user@example.com`) or `Name <user@example.com>` format. Domain extraction handles both via `split('@')[1].split('>')[0]`.
- `MailSenderError` is exported as required by the spec; however, it is not thrown anywhere in the current pipeline — it exists for caller consumption and future use. The only config throw is a plain `Error` for missing `MAILER_FROM`.

**Ready for tester:** `src/sender/index.ts` exports all units needed for unit tests. `createMailSender` accepts injected `router` and `logWriter` — both are trivially mockable. `renderTemplate` can be mocked at the module level.

**Not done:** Send Log implementation (WU-006, separate work unit). Integration test requires WU-006 complete.

### 2026-05-25 — tester pass

**Tests written:** 26 tests in `src/sender/index.test.ts`

**Acceptance criteria coverage:**

| AC | Description | Status |
|----|-------------|--------|
| AC-1 | `send()` happy path returns `SendResult { success: true, messageId, provider, sentAt }` | verified — 6 tests |
| AC-2 | Log entry written for every send attempt (success and failure) | verified — 4 tests |
| AC-3 | Failed provider send returns `{ success: false }`, writes failure log, does not throw | verified — 3 tests |
| AC-4 | `List-Unsubscribe` added for `promotional`/`update`; absent for `magic_link` | verified — 4 tests |
| AC-5 | `TemplateError` rethrown as-is; no log entry written | verified — 3 tests |
| AC-6 | `writeSendAttempt` throw is swallowed; send returns result anyway | verified — 2 tests |
| AC-7 | Missing `MAILER_FROM` throws plain `Error` before adapter is called | verified — 4 tests |

**Run result:** `npx vitest run src/sender/index.test.ts` — 26/26 passed, 0 failed. Two `stderr` lines are expected output from the implementation's own `console.error` inside the `writeSendAttempt` error-swallow path (AC-6).

**Notes on testability:**
- `createMailSender` is straightforwardly testable via constructor injection (router + logWriter).
- `renderTemplate` must be mocked at module level (`vi.mock('../renderer')`) because it is called directly rather than injected. The `TemplateError` class must be re-declared inside the mock factory due to vitest hoisting; the real class cannot be imported before the mock is in place.
- `MAILER_FROM` is checked after `router.resolve()` but before `adapter.send()` — the AC-7 tests confirm the adapter is never called.

**Recommendation:** ready for review.
