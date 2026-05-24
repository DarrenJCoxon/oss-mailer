# Work Unit 008 — API endpoint — `POST /api/send`

**Status:** 🔵 proposed
**For:** [P001 — Indie SaaS Developer](../personas/P001-indie-dev.md)
**Last updated:** 2026-05-24

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
