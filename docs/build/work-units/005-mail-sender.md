# Work Unit 005 — Mail Sender — core sync delivery

**Status:** 🔵 proposed
**For:** [P001 — Indie SaaS Developer](../personas/P001-indie-dev.md)
**Last updated:** 2026-05-24

**Depends on:** [WU-002](002-email-provider-interface-ses-adapter.md), [WU-003](003-router.md), [WU-004](004-template-renderer.md)
**Integration verification requires:** [WU-006](006-send-log-backend.md) (Send Log write path — can be built in parallel; integration test gates WU-005 done)

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
