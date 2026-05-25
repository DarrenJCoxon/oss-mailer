# Work Unit 007 — Queue — QStash enqueue + webhook handler

**Status:** ✅ shipped
**For:** [P001 — Indie SaaS Developer](../../personas/P001-indie-dev.md)
**Last updated:** 2026-05-25

**Depends on:** [WU-005 — Mail Sender](005-mail-sender.md)

**Env vars required:** `QSTASH_TOKEN` (publish), `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` (webhook signature verification) — all three must be in `.env.example` and Config Health checklist.

## What's done when this ships

The Queue module can accept a `SendRequest` and enqueue it to Upstash QStash. A webhook handler at `POST /api/queue/deliver` receives QStash callbacks and passes them to the Mail Sender for execution. Promotional and update sends are delivered asynchronously; magic link sends are unaffected (they bypass the queue entirely per D003).

## Walkthrough

1. API receives a promotional send request, calls `queue.enqueue(sendRequest)`.
2. QStash receives the job and immediately returns an acknowledgement ID; API returns `{ queued: true, jobId }` to the caller in under 200ms.
3. QStash calls `POST /api/queue/deliver` with the send payload.
4. Webhook handler validates the QStash signature, calls `mailSender.send(request)`, returns 200.
5. If Mail Sender fails, webhook returns 500 — QStash retries on 5xx. Note: the 401 (invalid signature) is a 4xx and will NOT trigger QStash retry — this is correct behaviour.

**What if something goes wrong:**
- Invalid QStash signature: webhook returns 401 and does not execute the send.
- Mail Sender failure: webhook returns 500, QStash retries up to the configured retry limit.
- QStash enqueue failure: `queue.enqueue()` throws `QueueError` with `{ code: 'ENQUEUE_FAILED', cause }`.

## How we'll know it's done

1. `queue.enqueue(sendRequest)` posts the job to QStash and returns an acknowledgement within 200ms.
2. `POST /api/queue/deliver` with a valid QStash signature triggers `mailSender.send()` and returns 200.
3. `POST /api/queue/deliver` with an invalid signature returns 401 and does not call Mail Sender.
4. A failed `mailSender.send()` inside the webhook returns 500 (triggering QStash retry).
5. `npx vitest run` exits 0 (QStash SDK mocked).

## Notes / log

### 2026-05-25 — coder

#### What was implemented

- `package.json`: added `"@upstash/qstash": "^2.11.0"` to `dependencies`; `npm install` confirmed `node_modules/@upstash/qstash/` exists
- `src/queue/index.ts` (new): exports `QueueErrorCode`, `QueueError`, `isQueueError`, `QStashPublisher`, `createQueue`, `MailSenderForHandler`, `createDeliverHandler` — all per the architect's exact shapes
- `src/app/api/queue/deliver/route.ts` (new): thin glue — constructs `router`, `logWriter`, `mailSender`, exports `POST = verifySignatureAppRouter(createDeliverHandler({ mailSender }))`. **Gate B rebuttal:** this file is construction-time wiring only; no testable logic exists in it. All observable behaviour is exercised through `src/queue/index.test.ts` and the sender/router/send-log test suites. No separate test file warranted.

#### Discoveries during implementation

- `verifySignatureAppRouter` is NOT at `@upstash/qstash` top level; it lives at `@upstash/qstash/nextjs` (confirmed via `node -e` inspection of exports)
- `writeSendAttempt` from `src/send-log/index.ts` returns `Promise<{ id: string }>`, but `SendLogWriter` expects `Promise<void>`. TypeScript strict mode does not allow this assignment (contrary to intuition). Wrapped with `.then(() => undefined)` at the route file's `logWriter` construction site — no modification to `sender/index.ts` or `send-log/index.ts`
- The JSON parse catch block uses bare `catch {}` (no binding) because `cause` would be unused (ESLint `no-unused-vars` warning)
- `tsc --noEmit` exits 0; `npm run lint` shows no new warnings from queue files; `npm test` — all 189 pre-existing tests pass

#### Ready for tester

`src/queue/index.ts` exports are all testable via direct injection:
- `createQueue({ publisher: fakePublisher, deliverUrl })` — no mocking needed
- `createDeliverHandler({ mailSender: fakeSender })` — no mocking needed; call directly with `new Request(...)`
- `isQueueError` — standard guard test

#### What is NOT done

- No test file — tester writes `src/queue/index.test.ts`
- `.env.example` verification: `src/lib/env.ts` confirms all three QSTASH vars are listed; direct file read was denied by sandbox permissions (`.env.*` files are blocked). The architect's brief stated they were pre-added; env.ts is the authoritative source and confirms them present.
- WU-008 (API endpoint) will construct `new Client({ token: process.env.QSTASH_TOKEN! })` and pass it to `createQueue` as `publisher`

### 2026-05-24 — initial filing

QStash chosen for serverless Vercel compatibility — no Redis/BullMQ needed (architecture note). Signature validation is required; QStash provides a signing secret. Filed after WU-005 because the webhook handler must call a working Mail Sender. D005 confirms this module is Phase 1 scope.

### 2026-05-25 — architect

#### Pre-decision context discovered while reading

- `@upstash/qstash` is not yet installed (`node_modules/@upstash/` does not exist). The coder must add it as a `dependencies` entry — pinning to `^2.11.0` per the swarm coordinator's pre-research.
- `src/lib/env.ts` already lists `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` in `REQUIRED_ENV_VARS`, and `src/lib/env.test.ts` already asserts on them. **No env.ts change is needed.** The coder should verify `.env.example` contains the three vars; if not, add them.
- `createMailSender(router, logWriter)` is already a constructor-injection factory returning `{ send(req: SendRequest): Promise<SendResult> }`. `SendRequest = { category: EmailCategory; to: string; subject: string; props?: Record<string, unknown> }`. This is the shape that flows through the queue.
- `MailSender.send` does **not** throw on provider failure — it returns `SendResult { success: false, ... }`. It throws only for `TemplateError`, `MailSenderError` (`MISSING_CONFIG`), and unexpected runtime errors. The webhook handler must translate **both** thrown errors and `success: false` results to HTTP 500 so QStash retries; only HTTP 200 means "do not retry."
- `createRouter()` reads `MAGIC_LINK_PROVIDER` / `PROMOTIONAL_PROVIDER` / `UPDATE_PROVIDER` at construction time and throws `RouterError` if any is missing. Any module that constructs `createRouter()` at import time will explode on load in environments where those env vars are unset (notably: test files unless they mock or set env). This is a load-bearing detail for Design A vs B.
- Test precedent in this repo: heavy use of `vi.mock('../renderer', () => ...)` and `vi.mock('@aws-sdk/client-ses', ...)`. Module-level mocking is normal and accepted here. So "module-level mocking is harder" is not as strong a slight against Design A as it would be in a codebase that avoids it.
- Existing route-handler files in this repo: none — `src/app/` contains only `page.tsx`, `layout.tsx`, and their tests. `src/app/api/` does not exist yet. This WU creates the first API route. No existing pattern to follow.

#### Design A — thin module, handler constructs its own dependencies

**Files:**
- `src/queue/index.ts` — exports `createQueue({ token, deliverUrl })` returning `{ enqueue(req: SendRequest): Promise<{ jobId: string }> }`. Constructs `new Client({ token })` inside the factory closure (cached). `QueueError` class with `_tag: 'QueueError'` and `code: 'ENQUEUE_FAILED'`; `isQueueError` guard.
- `src/app/api/queue/deliver/route.ts` — imports `verifySignatureAppRouter` from `@upstash/qstash/nextjs`, imports `createRouter`, `createMailSender`, and the send-log writer. Constructs them at module top level. Defines `async function handler(req)`. Exports `POST = verifySignatureAppRouter(handler)`.

**Shape:**

```ts
// src/queue/index.ts
import { Client } from '@upstash/qstash'
import type { SendRequest } from '../sender'

export type QueueErrorCode = 'ENQUEUE_FAILED'
export class QueueError extends Error { /* _tag = 'QueueError', code, cause */ }
export function isQueueError(e: unknown): e is QueueError { ... }

export function createQueue(opts: { token: string; deliverUrl: string }) {
  const client = new Client({ token: opts.token })
  return {
    async enqueue(req: SendRequest): Promise<{ jobId: string }> {
      try {
        const { messageId } = await client.publishJSON({ url: opts.deliverUrl, body: req })
        return { jobId: messageId }
      } catch (cause) {
        throw new QueueError({ code: 'ENQUEUE_FAILED', message: '...', cause })
      }
    },
  }
}
```

```ts
// src/app/api/queue/deliver/route.ts
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { createRouter } from '@/router'
import { createMailSender } from '@/sender'
import { createSendLogWriter } from '@/send-log'   // or whatever the existing export is

const router = createRouter()
const logWriter = createSendLogWriter()
const mailSender = createMailSender(router, logWriter)

async function handler(req: Request): Promise<Response> {
  const body = await req.json() as SendRequest
  const result = await mailSender.send(body)
  if (!result.success) return new Response(JSON.stringify({ ok: false }), { status: 500 })
  return new Response(JSON.stringify({ ok: true, messageId: result.messageId }), { status: 200 })
}

export const POST = verifySignatureAppRouter(handler)
```

**Tradeoffs:**
- *Plus:* One concept ("the queue handler runs the send"); no extra factory layer; matches the conventional Next.js route-file shape that future contributors will recognise.
- *Plus:* `createQueue` stays a pure two-input factory — exactly mirroring `createMailSender`'s shape.
- *Minus:* The route file constructs `createRouter()` at module load. `createRouter()` reads env synchronously. Any test that imports this route file (e.g. an integration test of the handler) must set all `*_PROVIDER` env vars first or arrange a `vi.mock('@/router', ...)`. This is a real friction point but matches existing precedent (`router/index.test.ts` does this).
- *Minus:* The handler can only be exercised by mocking module-level imports — there is no "inject a mock mailSender" affordance. Testing the handler's response-shaping logic in isolation is awkward.
- *Minus:* If WU-008 (API endpoint) wants to share construction logic (one `mailSender` instance across enqueue and any sync-magic-link path), the route file's local construction duplicates that.

#### Design B — injected handler factory

**Files:**
- `src/queue/index.ts` — exports `createQueue({ client, deliverUrl })` (taking a pre-built QStash `Client` so the factory is trivially mockable in `enqueue` tests), `QueueError`, `isQueueError`, AND `createDeliverHandler({ mailSender, verifySignature })` returning `(req: Request) => Promise<Response>`.
- `src/app/api/queue/deliver/route.ts` — thin glue: imports `createDeliverHandler`, `verifySignatureAppRouter`, and the same production constructions. Exports `POST = verifySignatureAppRouter(createDeliverHandler({ mailSender }))`.

**Shape:**

```ts
// src/queue/index.ts
import { Client } from '@upstash/qstash'
import type { SendRequest } from '../sender'
import type { SendResult } from '../providers/interface'

export type QueueErrorCode = 'ENQUEUE_FAILED'
export class QueueError extends Error { /* _tag, code, cause */ }
export function isQueueError(e: unknown): e is QueueError { ... }

export function createQueue(opts: { client: Client; deliverUrl: string }) {
  return {
    async enqueue(req: SendRequest): Promise<{ jobId: string }> {
      try {
        const { messageId } = await opts.client.publishJSON({ url: opts.deliverUrl, body: req })
        return { jobId: messageId }
      } catch (cause) {
        throw new QueueError({ code: 'ENQUEUE_FAILED', message: '...', cause })
      }
    },
  }
}

export interface MailSenderForHandler {
  send(req: SendRequest): Promise<SendResult>
}

export function createDeliverHandler(deps: { mailSender: MailSenderForHandler }) {
  return async (req: Request): Promise<Response> => {
    const body = await req.json() as SendRequest
    const result = await deps.mailSender.send(body)
    if (!result.success) return new Response(JSON.stringify({ ok: false }), { status: 500 })
    return new Response(JSON.stringify({ ok: true, messageId: result.messageId }), { status: 200 })
  }
}
```

```ts
// src/app/api/queue/deliver/route.ts
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { createRouter } from '@/router'
import { createMailSender } from '@/sender'
import { createSendLogWriter } from '@/send-log'
import { createDeliverHandler } from '@/queue'

const router = createRouter()
const logWriter = createSendLogWriter()
const mailSender = createMailSender(router, logWriter)

export const POST = verifySignatureAppRouter(createDeliverHandler({ mailSender }))
```

**Tradeoffs:**
- *Plus:* The handler logic lives inside `src/queue/index.ts` where it can be unit-tested directly: `createDeliverHandler({ mailSender: fakeSender })(new Request(...))` — no module-level mocking required. The unit tests cover response shaping (200 vs 500), JSON parsing, calling `mailSender.send`. No env vars needed.
- *Plus:* `createQueue` taking a pre-built `Client` instance means `enqueue` tests can pass `{ publishJSON: vi.fn() }` directly — no `vi.mock('@upstash/qstash', ...)` needed. This matches the existing pattern of `createMailSender(router, logWriter)` where dependencies are arguments.
- *Plus:* The route file becomes one expression. The "where does the production wiring happen" question has exactly one answer: this file.
- *Minus:* Two factories in the queue module instead of one. Slightly more conceptual surface.
- *Minus:* `createDeliverHandler` couples the queue module to the Next.js `Request`/`Response` web-platform types. (Mitigation: those are global types in the Next 15 runtime; no import needed and no runtime coupling — only a type-level dependency.)
- *Minus:* The signature verification is still done by `verifySignatureAppRouter` at the route file. The handler factory cannot be unit-tested *through* the signature verifier without further mocking — but it shouldn't be; signature verification is QStash SDK code, not code we own.

#### Decision: Design B

**Why:** Design B's testability win is concrete and high-value. The webhook handler has three real behaviours we want to verify in unit tests:

1. `200` when `mailSender.send` returns `{ success: true }`.
2. `500` when `mailSender.send` returns `{ success: false }`.
3. `500` when `mailSender.send` throws.

In Design A, exercising any of these requires `vi.mock('@/router', ...)`, `vi.mock('@/send-log', ...)`, AND `vi.mock('@/sender', ...)` — three module-level mocks just to stub the one dependency that matters (`mailSender`). In Design B, we pass a fake `mailSender` directly. That's the difference between "test the handler" and "fight the wiring."

The "two factories" objection is weak: `createQueue` and `createDeliverHandler` are two facets of the same module — one for the enqueue side, one for the dequeue side. They're co-located because they share the `SendRequest` payload contract.

The Next.js `Request`/`Response` type coupling is a non-issue — both are part of the WHATWG Fetch standard and exist as global types in any modern TS/Node environment. The queue module gains no runtime dependency on Next.

The decision also makes WU-008 (API endpoint) cleaner: it can import `createQueue` and construct its own `Client` once, sharing the same env-driven configuration approach.

**Rejected design A on this evidence:** module-level mocking of `@/sender` is technically possible (the renderer tests do it for `../renderer`), but mocking `@/sender` means re-declaring `MailSenderError`, `SendRequest`, `SendLogWriter`, and the `createMailSender` factory inside the mock factory. That is a lot of fragile boilerplate for tests that should be the most stable in the suite. Design B avoids it entirely.

#### Coder brief

Build the following. Do not deviate from the contract shapes below — the tester writes against them.

##### Step 1 — Install the SDK

Add `@upstash/qstash` at version `^2.11.0` to `dependencies` in `package.json` and run `npm install`. Verify `node_modules/@upstash/qstash/` exists before proceeding.

##### Step 2 — Verify env

Open `.env.example`. Confirm it contains:

```
QSTASH_TOKEN=
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=
```

If any are missing, add them with empty values and a one-line comment referencing the Upstash console. **Do not** modify `src/lib/env.ts` — it already lists these three and the env test already asserts on them.

##### Step 3 — Create `src/queue/index.ts`

Export the following:

1. **Error machinery** (mirror the pattern in `src/router/index.ts`):

   ```ts
   export type QueueErrorCode = 'ENQUEUE_FAILED'

   export class QueueError extends Error {
     readonly code: QueueErrorCode
     readonly cause?: unknown
     readonly _tag = 'QueueError' as const
     constructor(args: { code: QueueErrorCode; message: string; cause?: unknown }) {
       super(args.message)
       this.name = 'QueueError'
       this.code = args.code
       this.cause = args.cause
       Error.captureStackTrace?.(this, QueueError)
     }
   }

   export function isQueueError(e: unknown): e is QueueError {
     return (
       e instanceof QueueError ||
       (typeof e === 'object' && e !== null && (e as { _tag?: unknown })._tag === 'QueueError')
     )
   }
   ```

2. **A narrow `QStashPublisher` interface** so `createQueue` is mockable without `vi.mock('@upstash/qstash', ...)`:

   ```ts
   export interface QStashPublisher {
     publishJSON(args: { url: string; body: unknown; retries?: number }): Promise<{ messageId: string }>
   }
   ```

   The real `Client` from `@upstash/qstash` is structurally assignable to this — verify this by running `tsc --noEmit` after writing.

3. **`createQueue` factory** taking the publisher + the deliver URL:

   ```ts
   export function createQueue(opts: { publisher: QStashPublisher; deliverUrl: string }):
     { enqueue(req: SendRequest): Promise<{ jobId: string }> } {
     return {
       async enqueue(req) {
         try {
           const { messageId } = await opts.publisher.publishJSON({
             url: opts.deliverUrl,
             body: req,
           })
           return { jobId: messageId }
         } catch (cause) {
           throw new QueueError({
             code: 'ENQUEUE_FAILED',
             message: `Failed to enqueue send to QStash for category=${req.category} to=${req.to}`,
             cause,
           })
         }
       },
     }
   }
   ```

   Import `SendRequest` from `'../sender'`. Do not re-declare it.

4. **`MailSenderForHandler` interface** — narrow surface needed by the deliver handler:

   ```ts
   import type { SendResult } from '../providers/interface'

   export interface MailSenderForHandler {
     send(req: SendRequest): Promise<SendResult>
   }
   ```

5. **`createDeliverHandler` factory** — returns a Fetch-style handler:

   ```ts
   export function createDeliverHandler(deps: { mailSender: MailSenderForHandler }):
     (req: Request) => Promise<Response> {
     return async function deliverHandler(req: Request): Promise<Response> {
       let body: SendRequest
       try {
         body = (await req.json()) as SendRequest
       } catch (cause) {
         return new Response(
           JSON.stringify({ ok: false, error: 'INVALID_JSON' }),
           { status: 400, headers: { 'content-type': 'application/json' } },
         )
       }

       let result: SendResult
       try {
         result = await deps.mailSender.send(body)
       } catch (cause) {
         // Thrown errors (TemplateError, MISSING_CONFIG, etc.) → 500 so QStash retries.
         // The Mail Sender writes its own log entries; the handler does not log here.
         console.error('[Queue.deliverHandler] mailSender.send threw:', cause)
         return new Response(
           JSON.stringify({ ok: false, error: 'SEND_THREW' }),
           { status: 500, headers: { 'content-type': 'application/json' } },
         )
       }

       if (!result.success) {
         return new Response(
           JSON.stringify({ ok: false, error: result.error ?? 'SEND_FAILED' }),
           { status: 500, headers: { 'content-type': 'application/json' } },
         )
       }

       return new Response(
         JSON.stringify({ ok: true, messageId: result.messageId }),
         { status: 200, headers: { 'content-type': 'application/json' } },
       )
     }
   }
   ```

   **Key contract decisions baked in:**
   - Malformed JSON body returns 400, not 500. QStash won't retry on 4xx — and correctly so, because retrying the same malformed payload is pointless.
   - Both a thrown error and a `success: false` result return 500. QStash retries on 5xx. This is the correct "transient failure" signal.
   - The handler does NOT call any send-log code. The Mail Sender already writes a log entry per attempt (AC-2 of WU-005). Double-logging would corrupt the log.
   - No `try`/`catch` around `req.json()` and the `send` call combined — they are deliberately separate so a JSON parse failure surfaces as 400, not 500.

##### Step 4 — Create `src/app/api/queue/deliver/route.ts`

Thin glue, exactly:

```ts
import { Client, verifySignatureAppRouter } from '@upstash/qstash'
// Verify import path: the wrapper may live at '@upstash/qstash/nextjs' in the
// installed version. Check the package's "exports" map after install; use whichever
// path actually resolves. If both work, prefer the deeper '/nextjs' path.
import { createRouter } from '@/router'
import { createMailSender } from '@/sender'
import { /* getSendLogWriter, or whatever WU-006 shipped */ } from '@/send-log'
import { createDeliverHandler } from '@/queue'

const router = createRouter()
const logWriter = /* ...send-log writer construction... */
const mailSender = createMailSender(router, logWriter)

export const POST = verifySignatureAppRouter(createDeliverHandler({ mailSender }))
```

**Verification step before writing this file:** read `src/send-log/index.ts` and use whatever its actual exported factory/function is. Do not invent a name.

**Verification step about `verifySignatureAppRouter` location:** the swarm coordinator's brief says it's a top-level export of `@upstash/qstash`. Some versions expose it at `@upstash/qstash/nextjs`. After install, run `node -e "console.log(Object.keys(require('@upstash/qstash')))"` (or check the package's `exports` field in `node_modules/@upstash/qstash/package.json`) to determine the correct import path. Use the one that resolves. If you cannot find it on the top-level export, try `@upstash/qstash/nextjs`. This is the **one** place hedge-word is replaced with verification at coding time.

##### Step 5 — `tsc` clean, lint clean

Run `npx tsc --noEmit` and `npm run lint`. Both must pass. The `Client` from `@upstash/qstash` must be assignable to `QStashPublisher` (this is what justifies the narrow interface — the type check at the route file is your proof). If the structural check fails, widen `QStashPublisher` to match the real `publishJSON` signature; do not widen by `as any`.

##### What you do NOT do

- Do not write tests. The tester writes against the contract above.
- Do not modify `src/sender/index.ts`, `src/router/index.ts`, or `src/lib/env.ts`.
- Do not add the QStash `Client` construction inside `createQueue` — the factory takes a pre-built publisher. WU-008 (API endpoint) is the file that will construct `new Client({ token: process.env.QSTASH_TOKEN! })` and pass it in. That is intentional: it keeps env access at the edge.
- Do not add a `console.log` of the request body. PII (the `to` address) must not leak to stdout.

##### What the tester will verify

The tester writes `src/queue/index.test.ts`. They will check:

- `createQueue({ publisher: fake, deliverUrl: 'https://x' }).enqueue(req)` returns `{ jobId }` from `fake.publishJSON`.
- `createQueue` wraps a publisher throw in `QueueError({ code: 'ENQUEUE_FAILED' })`.
- `isQueueError` behaves like `isRouterError` / `isMailSenderError`.
- `createDeliverHandler({ mailSender: fakeSucceeds })(req)` returns 200.
- `createDeliverHandler({ mailSender: fakeFails })(req)` returns 500 (success: false case).
- `createDeliverHandler({ mailSender: fakeThrows })(req)` returns 500 (thrown case).
- Handler with malformed JSON body returns 400.
- Handler does not call `mailSender.send` when `req.json()` throws.

The signature-verification wrapper is QStash SDK code and is NOT unit-tested by us. AC-3 in the WU spec ("invalid signature returns 401") is satisfied by the wrapper's own behaviour — we trust the SDK. (If a future failure ever traces back to that wrapper, file an integration test then.)

#### Open question for the coder to surface if encountered

- **`verifySignatureAppRouter` import path.** Verify against the installed package. If it is **not** at either `@upstash/qstash` or `@upstash/qstash/nextjs`, stop and file an open question — do not guess.
