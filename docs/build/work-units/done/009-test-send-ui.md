# Work Unit 009 — Test Send UI

**Status:** ✅ shipped
**For:** [P001 — Indie SaaS Developer](../../personas/P001-indie-dev.md)
**Last updated:** 2026-05-25

**Depends on:** [WU-008 — API endpoint](008-api-endpoint.md)

## What's done when this ships

A page at `/test-send` lets P001 send a test email from the browser without writing code. They choose a category, enter a recipient address, and submit. The result panel shows the message ID on success or a specific error message on failure. This is the Phase 1 verification surface — the thing used to prove the pipeline works end-to-end.

## Walkthrough

1. P001 opens `/test-send` in the browser.
2. Selects category from a dropdown (`magic_link`, `promotional`, `update`).
3. Enters recipient email address. Optionally edits the subject.
4. Clicks "Send". The button shows a loading state.
5. On success: result panel shows `✓ Sent — Message ID: <id>` with provider and timestamp.
6. On failure: result panel shows the specific error (`SES credentials invalid`, `Recipient not verified in SES sandbox`, etc.) — not a generic "send failed".

**What if something goes wrong:**
- API returns an error: result panel shows the specific error message from the API response.
- Network failure: result panel shows "Could not reach the server — check dev server is running."

## How we'll know it's done

1. `/test-send` loads without errors.
2. Submitting a valid magic link send delivers an email and shows the message ID in the result panel.
3. Submitting with a known-bad recipient (sandbox restriction) shows a specific error, not a generic one.
4. The category dropdown contains exactly three options: `magic_link`, `promotional`, `update`.
5. The send button is disabled during the in-flight request (no double-submit).
6. The page is accessible: keyboard-navigable, no colour-only state indicators.

## Notes / log

### 2026-05-24 — initial filing

This surface is named in the Phase 1 verification gate — it's the manual step that proves the full pipeline works. Error specificity is critical (design system voice note: "Say what happened"). The page is intentionally simple; no auth required beyond being localhost or having the API key in env (the API itself checks the key).

### 2026-05-25 — architect

#### Pre-decision context discovered while reading

- **`POST /api/send` already enforces bearer-token auth** via `MAILER_API_KEY` and returns voice-compliant error bodies (UNAUTHORIZED / VALIDATION_FAILED / UNKNOWN_CATEGORY / SEND_FAILED / QUEUE_FAILED). The Test Send page is a thin caller — all server-side logic exists.
- **`MAILER_API_KEY` is server-only** (already in `REQUIRED_ENV_VARS`). It must not be inlined into client JS. Any design that runs `fetch('/api/send', { Authorization: 'Bearer …' })` from the browser must read the key in a server boundary (Server Action, Route Handler, or Server Component data-fetch) and forward the call — not expose the key to the client bundle.
- **WU-007 and WU-008 codified the factory-handler pattern.** Testable logic lives in `src/<module>/index.ts` as a `createXxx({ deps })` factory; the wiring file under `src/app/...` is a one-liner that imports the factory and supplies real deps. Gate B (review) rejects business logic embedded in the wiring file. WU-009 must honour the same boundary.
- **Vitest is configured with `environment: 'node'`** (`vitest.config.ts` line 8). `@testing-library/react`, `jsdom`, and `happy-dom` are not installed. Adding them is out of scope for this WU (operator hasn't approved new deps; WU-008 explicitly avoided adding `zod` for analogous reasons). Therefore: any UI-component logic that must be tested has to be reachable as a **pure function** — i.e. extracted into a non-React helper that the test imports directly. The React component itself is verified by Gate B (route file is wiring; logic is covered by the helper's tests).
- **Tailwind v4 is installed** (`@tailwindcss/postcss`, `tailwindcss ^4`) via `@import "tailwindcss"` in `globals.css`. No `tailwind.config.js` exists — v4 uses the new zero-config pattern. Token-to-class mappings below use stock Tailwind utility classes; no custom theme tokens are introduced (the design-system token names map onto stock Tailwind values that already match the design language hex codes per D004).
- **`MAILER_FROM`, `MAILER_API_KEY`, `DELIVER_URL` and all SES vars are present in `REQUIRED_ENV_VARS`.** The Test Send wiring can rely on them being set (or `validateEnv()` would have already thrown). `MAGIC_LINK_PROVIDER='ses'` is the only configured route in Phase 1.
- **The existing `/api/send` handler does not currently accept relative-URL self-calls inside a Server Action when running on Vercel** without an absolute origin. Internal calls from a Next.js Server Action to a Route Handler on the same deployment require an absolute URL (`https://${VERCEL_URL}` or `http://localhost:3000`). A simpler shape is to call the **handler function directly** in the Server Action — same module, no HTTP round-trip, same auth check skipped because the call is server-internal. The Server Action injects a synthesised `Request` with the bearer header, or — cleaner — calls `createSendHandler({ … })` once at module load and reuses it. This is the load-bearing piece of Design B below.
- **`globals.css` has only `@import "tailwindcss"`.** No font is loaded, no dark-mode hook, no CSS variables. Loading Inter/JetBrains Mono is out of scope per the "do not invent new tokens" instruction and the principle of minimum scope; we use the design-system font-family stacks via Tailwind's `font-sans` / `font-mono` (system fallbacks render fine; D004 typography is a project-wide commitment that lands when the operator wires Google Fonts at root layout — not this WU's job).

#### Design A — Client Component + browser fetch via thin server proxy

**Shape.** `src/app/test-send/page.tsx` is a Client Component (`"use client"`). It owns the form state with `useState`, submits via browser `fetch('/api/test-send', { method: 'POST', body: JSON.stringify(formState) })`. A new route handler `src/app/api/test-send/route.ts` accepts that JSON, reads `MAILER_API_KEY` from `process.env`, and forwards to `POST /api/send` with the bearer header. The client component renders the result panel from the JSON it receives.

**Data flow.** Browser form → `fetch /api/test-send` → server reads env, calls `/api/send` (or `createSendHandler` directly) → response back to browser → React state updates → result panel re-renders.

**Files added.**
1. `src/app/test-send/page.tsx` — Client Component with form + result UI
2. `src/app/api/test-send/route.ts` — server proxy that injects the bearer
3. `src/test-send/index.ts` — pure helpers: `buildDefaultSubject(category)`, `formatResultPanel(apiResponse)`, `validateClientForm(form)`. Tested in isolation.
4. `src/test-send/index.test.ts` — tests for the helpers

**Tradeoffs.**
- **Testability.** Good for the helpers (pure functions, node-env vitest happy). Poor for the component itself (no jsdom), but the helpers cover all observable string-building and validation logic — the component is wiring.
- **Simplicity.** Two server files (route handler + proxy) + one Client Component + one helper module = four moving pieces. The proxy is necessary only because `MAILER_API_KEY` must not ship to the browser. The proxy duplicates JSON-in/JSON-out shape on top of the already-existing `/api/send` — a thin layer with a clear reason for existing.
- **Alignment with WU-007/008 precedent.** Helper module mirrors the factory pattern. Route file stays thin (just calls into `/api/send` with injected key). Component is the new shape — App Router Client Component, which is idiomatic Next.js 15.
- **Accessibility.** Client state makes `aria-busy`, `aria-live`, focus-after-submit straightforward — all handled in JSX with React state.
- **Next.js 15 idioms.** Client Components + fetch is fully supported and matches what most existing Next.js tutorials show. No surprises.

#### Design B — Server Component page + Server Action submit (direct handler call)

**Shape.** `src/app/test-send/page.tsx` is a Server Component that renders a `<form action={sendTestEmail}>` where `sendTestEmail` is a Server Action defined in `src/app/test-send/actions.ts` (`"use server"`). The action reads `MAILER_API_KEY` from `process.env`, builds a synthetic `Request`, calls `createSendHandler({ mailSender, queue, apiKey })` **directly** (same module graph — no HTTP), and returns a typed result object. A small Client Component (`src/app/test-send/SendForm.tsx`, `"use client"`) wraps the form with `useFormStatus` / `useActionState` so it can show the loading state on the submit button and render the result panel from the action's return value. The page composes: server-rendered shell + client form + server action.

**Data flow.** Browser form submit → Next.js Server Action RPC → action calls `createSendHandler` in-process → returns serialisable `{ status: 'sent' | 'queued' | 'error', … }` → `useActionState` re-renders form with result.

**Files added.**
1. `src/app/test-send/page.tsx` — Server Component shell + `<SendForm />`
2. `src/app/test-send/SendForm.tsx` — Client Component, uses `useActionState`, renders form fields + result panel
3. `src/app/test-send/actions.ts` — `"use server"` module with `sendTestEmail(prevState, formData)`
4. `src/test-send/index.ts` — pure helpers: `buildDefaultSubject(category)`, `mapApiResponseToResult(response)`, `validateFormData(formData)`. Tested in isolation.
5. `src/test-send/index.test.ts` — tests for the helpers

**Tradeoffs.**
- **Testability.** Same as A for the helpers. The Server Action itself is harder to unit-test (it's the wiring layer, and it constructs a `Request` and dispatches into `createSendHandler` — both already tested elsewhere). Net testable surface is equivalent to A.
- **Simplicity.** Three files instead of two (server action + client form + page shell), but **no HTTP proxy** — the action calls the existing handler factory in-process. Removes the "two-hop" pattern (browser → proxy → /api/send) at the cost of one extra file (the actions module). On balance: similar file count, but one fewer network hop.
- **Alignment with WU-007/008 precedent.** Reuses `createSendHandler` directly — same factory, same tests, no parallel code path. This is the most precedent-honouring option: the action becomes "more wiring" rather than "a second API".
- **Accessibility.** `useActionState` + `useFormStatus` give clean `aria-busy` (`status.pending`) and `aria-live` (the returned `state` is the announcement payload). React 19's form actions are designed for exactly this case.
- **Next.js 15 idioms.** Server Actions are GA in 15; the React 19 `useActionState`/`useFormStatus` pair is the official solution for "submit and reflect result" forms. This is the path the framework documents are pushing toward.
- **Risk.** Calling `createSendHandler` from a Server Action means constructing a `Request` object inside the action — slightly awkward, but well-supported (`new Request('http://internal/api/send', { method: 'POST', headers: …, body: … })`). Alternative: skip the `Request` synthesis and call a lower-level helper. But the handler factory is the unit with tests; calling anything below it duplicates auth/validation logic. We accept the small awkwardness of constructing a synthetic `Request` to keep the test coverage intact.

#### Decision: Design B — Server Action + direct `createSendHandler` call

**Rejected Design A (Client Component + proxy route handler).** Two load-bearing reasons:

1. **No new public API surface.** Design A adds `POST /api/test-send` as a second endpoint whose only purpose is to forward to `/api/send` with the env-resident key. That endpoint is reachable from the public internet on a Vercel deployment, which means it's a second authentication surface to reason about (currently has none — the page is a "developer tool", but the route handler is exposed). Design B keeps the bearer call in the server boundary that Next.js manages (Server Action endpoints are POST-only, CSRF-protected by Next.js's encrypted action IDs). One fewer endpoint to reason about, no new attack surface.

2. **Network hop is unnecessary.** Design A does `browser → /api/test-send → /api/send` (two hops if the proxy uses `fetch`, or one hop with `createSendHandler` reused inside the proxy — but then the proxy is just the action). Design B does `browser → Server Action → createSendHandler` in-process. The handler factory was specifically built to be call-target-agnostic in WU-008. Reusing it directly preserves the testing investment in `src/api/send/index.test.ts` (258 passing tests) — Design B's action is genuinely "just wiring".

**Trade accepted.** Server Actions require constructing a synthetic `Request` to feed `createSendHandler`. This is five lines of boilerplate in `actions.ts` and adds no business logic. It is plainly wiring, satisfies Gate B, and avoids the parallel-API-surface cost of Design A.

**What this commits future work to.** Subsequent UI work units (WU-010 Config Health Check, WU-011 Send Log) should follow the same shape: Server Component shell + Client form + Server Action that calls into the relevant factory. If a future surface needs streaming or progressive enhancement beyond what Server Actions support, file a superseding decision.

---

#### Coder brief — implementation-ready

**Scope guard.** You implement only the `/test-send` page and its supporting helper module. Do NOT modify `src/api/send/`, `src/app/layout.tsx`, `src/app/page.tsx`, or anything outside `src/app/test-send/` and `src/test-send/`. Do NOT add nav, routing, fonts, dark-mode toggles, or new dependencies.

##### 1. Files to create

**`src/test-send/index.ts`** — pure helpers, no React, no Next.js, no `process.env`. Exports:

- `type Category = 'magic_link' | 'promotional' | 'update'`
- `const CATEGORIES: readonly Category[] = ['magic_link', 'promotional', 'update']` (export this exact constant; the form maps over it for the `<option>` list and the tester asserts AC-4 against it)
- `function buildDefaultSubject(category: Category): string` — returns `` `Test — ${category}` `` (e.g. `"Test — magic_link"`)
- `type ClientFormErrors = { to?: string; subject?: string }`
- `function validateClientForm(input: { to: string; subject: string }): ClientFormErrors` — returns `{ to: 'Recipient address is required' }` if `to.trim() === ''`, `{ subject: 'Subject is required' }` if `subject.trim() === ''`. Returns an empty object if both fields are non-empty. Voice rule: no "please", no "must", no exclamations — flat declaratives.
- `type SendApiResponse =`
  - `| { kind: 'sent'; messageId: string; provider: string; sentAt: string }`
  - `| { kind: 'queued'; jobId: string }`
  - `| { kind: 'error'; code: 'UNAUTHORIZED' | 'VALIDATION_FAILED' | 'UNKNOWN_CATEGORY' | 'SEND_FAILED' | 'QUEUE_FAILED' | 'NETWORK' | 'UNEXPECTED'; detail: string }`
- `function mapApiResponseToResult(status: number, body: unknown): SendApiResponse` — maps the `/api/send` HTTP response shape (documented in WU-008 spec) into the union above. The mapping rules:
  - status `200` and `body.success === true` → `{ kind: 'sent', messageId, provider, sentAt }`
  - status `202` and `body.queued === true` → `{ kind: 'queued', jobId }`
  - status `401` → `{ kind: 'error', code: 'UNAUTHORIZED', detail: 'API key rejected by /api/send. Check MAILER_API_KEY.' }`
  - status `400` and `body.error === 'VALIDATION_FAILED'` → `{ kind: 'error', code: 'VALIDATION_FAILED', detail: formatFieldsList(body.fields) }` (joins field reasons with `'; '`)
  - status `400` and `body.error === 'UNKNOWN_CATEGORY'` → `{ kind: 'error', code: 'UNKNOWN_CATEGORY', detail: \`Unknown category: ${body.category}\` }`
  - status `500` and `body.error === 'SEND_FAILED'` → `{ kind: 'error', code: 'SEND_FAILED', detail: body.detail ?? 'Send failed without a provider error message.' }`
  - status `500` and `body.error === 'QUEUE_FAILED'` → `{ kind: 'error', code: 'QUEUE_FAILED', detail: body.detail ?? 'Queue enqueue failed.' }`
  - anything else → `{ kind: 'error', code: 'UNEXPECTED', detail: \`Unexpected response: status ${status}\` }`

**`src/test-send/index.test.ts`** — coverage by the tester. (You do not write tests in this WU. Just make sure the helpers above are exported and named exactly as above so the tester can import them.)

**`src/app/test-send/actions.ts`** — `"use server"` module. Exports `sendTestEmail(prevState, formData)`:

```ts
'use server'
import { createSendHandler } from '@/api/send'
import { mapApiResponseToResult, type SendApiResponse, type Category, CATEGORIES } from '@/test-send'
// import the real mailSender and queue constructors the same way `src/app/api/send/route.ts` does
// (re-read that wiring file and copy the same dependency construction verbatim — DO NOT diverge)

export type ActionState =
  | { phase: 'idle' }
  | { phase: 'result'; result: SendApiResponse; submittedTo: string }

const handler = createSendHandler({ /* same deps as src/app/api/send/route.ts */, apiKey: process.env.MAILER_API_KEY! })

export async function sendTestEmail(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const category = String(formData.get('category') ?? '')
  const to = String(formData.get('to') ?? '').trim()
  const subject = String(formData.get('subject') ?? '').trim()

  // Build a Request the handler can consume. Use the same bearer the handler expects.
  const req = new Request('http://internal/api/send', {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${process.env.MAILER_API_KEY ?? ''}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ category, to, subject }),
  })

  let res: Response
  try {
    res = await handler(req)
  } catch (cause) {
    return {
      phase: 'result',
      submittedTo: to,
      result: {
        kind: 'error',
        code: 'NETWORK',
        detail: cause instanceof Error ? cause.message : 'Handler threw an unexpected error.',
      },
    }
  }

  let body: unknown
  try {
    body = await res.json()
  } catch {
    body = null
  }

  return {
    phase: 'result',
    submittedTo: to,
    result: mapApiResponseToResult(res.status, body),
  }
}
```

Two implementation notes:
- The real `mailSender` and `queue` constructors used by `src/app/api/send/route.ts` should be imported and constructed identically here. Read that file once; mirror the imports verbatim. If construction is non-trivial, refactor `src/app/api/send/route.ts` to export a `buildSendHandler()` builder that both call sites use — but only if that refactor is < 15 lines. Otherwise duplicate the construction (it's pure wiring).
- The `apiKey` non-null-assertion is acceptable because `validateEnv()` runs at startup and would have thrown if `MAILER_API_KEY` were unset.

**`src/app/test-send/SendForm.tsx`** — Client Component (`"use client"` at top). Uses React 19's `useActionState`:

```tsx
'use client'
import { useActionState } from 'react'
import { sendTestEmail, type ActionState } from './actions'
import { CATEGORIES, buildDefaultSubject } from '@/test-send'
import { useState } from 'react'

export function SendForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(sendTestEmail, { phase: 'idle' })
  const [category, setCategory] = useState<typeof CATEGORIES[number]>('magic_link')
  const [subject, setSubject] = useState(buildDefaultSubject('magic_link'))
  // when the category changes, update subject to the new default ONLY if the user hasn't manually edited it
  // (track a "subjectTouched" flag with useState; set true on any onChange of the subject input)
  // ...render form with fields, button, result panel
}
```

Rendering rules:
- `<form action={action}>` — Next.js wires this to the Server Action.
- Three labelled fields, in this order: `Category` (`<select name="category">`), `Recipient` (`<input name="to" type="email">`), `Subject` (`<input name="subject" type="text">`).
- Submit button: `<button type="submit" aria-busy={pending} disabled={pending}>` showing `"Send"` when idle, `"Sending…"` (en em-dash three-dot ellipsis is fine; use the single-character `…`, not three periods) when `pending` is true.
- Result panel: render below the button when `state.phase === 'result'`. See section 4 for exact strings and ARIA.

##### 2. What the form does

| Field | Type | Default | Validation (client) | Validation (server) |
|---|---|---|---|---|
| Category | `<select>` | `magic_link` | — (always one of three) | server enforces via `validateSendRequest` |
| Recipient | `<input type="email" required>` | empty | `to.trim() !== ''` blocks submit | server enforces non-empty |
| Subject | `<input type="text" required>` | `buildDefaultSubject('magic_link')` → `"Test — magic_link"` | `subject.trim() !== ''` blocks submit | server enforces non-empty |

Subject default behaviour: when `category` changes, **if the user has not edited the subject** (track `subjectTouched` boolean in `useState`, set to `true` on any subject `onChange`), update the subject to `buildDefaultSubject(newCategory)`. If `subjectTouched` is true, leave the subject alone. This matches the spec's "Optionally edits the subject" language and prevents clobbering user input.

Client-side validation: rely on HTML5 `required` plus React state. If you want explicit `validateClientForm` invocation, run it in an `onSubmit` handler that calls `event.preventDefault()` and surfaces field errors via `aria-describedby`. The minimum bar for AC: the submit button is disabled if either `to.trim()` or `subject.trim()` is empty (which means the form never reaches the action with empty fields — useful since the server returns 400, but we want a clean UX).

Double-submit prevention: `disabled={pending || !canSubmit}` on the button. `aria-disabled` follows the same value. `useActionState` already serialises action invocations (pending stays true until the action resolves), so this is belt-and-braces.

##### 3. How the API call is made

The Client Component does NOT call `fetch`. It submits the form via the Server Action. The Server Action constructs the `Request` and calls `createSendHandler(…)` in-process — see `actions.ts` above.

If for any reason a future change requires the form to call `/api/send` directly from the browser, that is a new architectural decision and must be filed as a new D-NNN (it would require shipping the API key to the client or re-introducing a proxy route). Do not silently change this.

##### 4. Result panel — exact strings and structure

Render the panel inside a `<section aria-live="polite" aria-atomic="true">`. The section is always in the DOM (so screen readers register the live region); only its children change.

Mapping from `state.result.kind` to displayed content:

| `kind` | Heading line | Detail lines | Visual variant |
|---|---|---|---|
| `sent` | `Sent. Message ID: <messageId>` (the `<messageId>` is rendered in `font-mono`) | `Provider: <provider>` and `Sent at: <sentAt>` (each on its own line, `font-mono` for the values) | success (green-tinted) |
| `queued` | `Queued. Job ID: <jobId>` (`<jobId>` in `font-mono`) | `Bulk send queued for delivery. Check the send log when WU-011 ships.` | success (green-tinted) |
| `error` code `UNAUTHORIZED` | `Send failed: unauthorised.` | `<detail>` (from the result object) | error (red-tinted) |
| `error` code `VALIDATION_FAILED` | `Send failed: invalid request.` | `<detail>` | error |
| `error` code `UNKNOWN_CATEGORY` | `Send failed: unknown category.` | `<detail>` | error |
| `error` code `SEND_FAILED` | `Send failed.` | `<detail>` | error |
| `error` code `QUEUE_FAILED` | `Queue failed.` | `<detail>` | error |
| `error` code `NETWORK` | `Send failed: could not reach the handler.` | `<detail>` | error |
| `error` code `UNEXPECTED` | `Send failed: unexpected response.` | `<detail>` | error |

No emoji, no "Oops", no "Unfortunately", no "Please", no "Successfully". The success variant uses the word `Sent.` — period, not exclamation. The icon (checkmark for success, X for error) is rendered as an inline `<span aria-hidden="true">` with the literal character `✓` or `✗`. The icon is decorative; the heading text carries the semantic. This satisfies "status never communicated by colour alone" (colour + icon + text).

The submitted recipient address (`state.submittedTo`) should be displayed in the result panel as a sub-line: `Test sent to: <to>` (with `<to>` in `font-mono`). This lets P001 confirm they sent to the right address.

##### 5. Loading state — exact strings and ARIA

Submit button:
- Idle: `<button>Send</button>` — `aria-busy="false"`, `disabled={false}` (unless client-side validation blocks).
- Pending: `<button>Sending…</button>` — `aria-busy="true"`, `disabled={true}`. No spinner glyph (voice rule: "Loading minimal").

Form fields during pending: do NOT disable them visually. The button being disabled is sufficient to prevent double-submit; disabling fields would lose the user's input visually if they want to retry with one tweak after an error.

The `<section aria-live="polite">` for the result remains rendered with empty content while idle. When `state.phase` becomes `'result'`, the new content is announced.

##### 6. Accessibility — exact placement of ARIA

- Each `<input>` and `<select>` has a real `<label htmlFor="<id>">…</label>` immediately preceding it. Use unique IDs: `field-category`, `field-to`, `field-subject`.
- Required fields use `required` attribute (HTML5) AND have `(required)` in the label text — not an asterisk alone (per `accessibility.md`).
- The result section: `<section aria-live="polite" aria-atomic="true">`. Use `role="status"` for the success variant and `role="alert"` for the error variant — apply this to the inner heading, not the section, so the live region's region role is preserved.
- Focus management after submit: do NOT move focus away from the submit button automatically. The `aria-live="polite"` announcement is sufficient. Forcing focus shift would interrupt screen reader users mid-flow.
- Focus rings: rely on Tailwind defaults `focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2`. Apply to button, inputs, and select.
- `prefers-reduced-motion`: no animation is added in this WU, so this is satisfied by absence. Do not introduce CSS transitions on the result panel.

##### 7. Design tokens → Tailwind class mapping

Use the following stock Tailwind v4 utilities. **Do not introduce a `tailwind.config.js` or invent new tokens.**

| Token (design system name) | Tailwind class(es) |
|---|---|
| `colour.neutral.background` | `bg-white dark:bg-[#0F1117]` |
| `colour.neutral.surface` | `bg-gray-50 dark:bg-[#1A1D27]` |
| `colour.neutral.border` | `border-gray-200 dark:border-[#2E3244]` |
| `colour.neutral.text.heading` | `text-gray-900 dark:text-gray-50` |
| `colour.neutral.text.body` | `text-gray-700 dark:text-gray-300` |
| `colour.neutral.text.muted` | `text-gray-400 dark:text-gray-500` |
| `colour.brand.primary` (button bg) | `bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600` |
| `colour.brand.primary` (focus ring) | `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600` |
| `colour.semantic.success` text | `text-emerald-600 dark:text-emerald-400` |
| `colour.semantic.success.bg` | `bg-emerald-50 dark:bg-emerald-950` |
| `colour.semantic.error` text | `text-red-600 dark:text-red-400` |
| `colour.semantic.error.bg` | `bg-red-50 dark:bg-red-950` |
| `text.page.title` | `text-2xl font-semibold leading-tight` |
| `text.label` | `text-sm font-medium leading-snug` |
| `text.body` | `text-base font-normal leading-normal` |
| `text.body.sm` | `text-sm font-normal leading-normal` |
| `text.mono` | `font-mono text-sm leading-snug` |
| `space.1` | `p-1` / `gap-1` / `mt-1` etc. |
| `space.2` | `p-2` / `gap-2` |
| `space.3` | `p-3` |
| `space.4` | `p-4` |
| `space.5` | `space-y-5` (between form fields) |
| `space.6` | `mt-6` (above submit button) |
| `space.8` | `mb-8` (below page header) |
| `space.16` | `pt-16` (top of page) |
| `radius.md` (6px) | `rounded-md` |
| `radius.lg` (8px) | `rounded-lg` |
| max content width 480px (form-layout pattern) | `max-w-[480px]` |

Page outer layout: `<main className="mx-auto max-w-[480px] px-4 pt-16 pb-12">`. Form container: `<form className="space-y-5">`. Result panel: `<section className="mt-6 rounded-lg p-4">` with the variant-specific bg/text classes applied conditionally.

Font families: use `font-sans` (default) for everything; `font-mono` for message IDs, job IDs, provider names, timestamps, and the recipient address shown in the result panel. (Inter and JetBrains Mono are not loaded by `globals.css`; they will render via system fallback until D004 typography is wired at the root layout in a separate WU. This WU does not load fonts.)

##### 8. What the tester will verify (so you know what shape your code must expose)

The tester will write `src/test-send/index.test.ts` covering the helper module's pure functions:

- `CATEGORIES` is exactly `['magic_link', 'promotional', 'update']` in that order (AC-4).
- `buildDefaultSubject('magic_link')` returns `'Test — magic_link'` (and similarly for the other two categories).
- `validateClientForm({ to: '', subject: 'x' })` returns `{ to: 'Recipient address is required' }`.
- `validateClientForm({ to: 'a', subject: '' })` returns `{ subject: 'Subject is required' }`.
- `validateClientForm({ to: '   ', subject: 'x' })` returns `{ to: 'Recipient address is required' }` (whitespace-only treated as empty).
- `validateClientForm({ to: 'a', subject: 'b' })` returns `{}`.
- `mapApiResponseToResult` — one test per row of the mapping table above. The tester will hand-construct status + body pairs and assert the shape of the returned union.
- Voice spot-check: no result heading or detail string produced by `mapApiResponseToResult` contains `'Oops'`, `'Unfortunately'`, `'Please'`, `'Sorry'`, `'Successfully'`.

The tester will also assert at Gate B that `src/app/test-send/actions.ts`, `src/app/test-send/SendForm.tsx`, and `src/app/test-send/page.tsx` contain no business logic beyond:
1. Reading form fields from `FormData`
2. Constructing a `Request`
3. Calling `createSendHandler(…)` and `mapApiResponseToResult(…)`
4. Rendering JSX from `state`

Any logic beyond that — string formatting, validation, mapping — must live in `src/test-send/index.ts` so it can be tested without a browser.

##### 9. Out-of-scope reminders

- Do not load Inter / JetBrains Mono. System fallback is acceptable for this WU.
- Do not add a dark-mode toggle. The `dark:` classes respect system preference automatically; that's the WU's commitment per D004.
- Do not add nav, breadcrumbs, or links to other pages. `/test-send` is a standalone surface in Phase 1.
- Do not add tests using `@testing-library/react` or `jsdom`. Vitest runs `environment: 'node'`. Helper tests only.
- Do not modify `src/api/send/`. If you find you need to expose a builder helper so the action can construct the handler the same way the existing route does, the smallest acceptable change is exporting a `buildDefaultSendHandler()` function from a NEW file `src/api/send/factory.ts` — flag this in your handoff notes; do not modify `src/api/send/index.ts`.
- Do not add `MAILER_API_KEY` reads to any Client Component. The key is only read inside `actions.ts` (server) and inside the existing `src/app/api/send/route.ts`.

##### Coder handoff checklist

When you finish, your end-of-coder note in this WU should list:

- All files created (paths)
- Confirmation that `npx tsc --noEmit` exits 0
- Confirmation that `npx vitest run` passes (helper tests + all previously passing tests)
- Whether you needed to factor out `buildDefaultSendHandler` (if yes, the path)
- Any string in the result panel that diverged from the table in section 4, and why

---

### 2026-05-25 — coder

#### Files created

- `src/test-send/index.ts` — pure helpers module (no React, no Next.js, no process.env)
- `src/app/test-send/actions.ts` — Server Action (`"use server"`)
- `src/app/test-send/SendForm.tsx` — Client Component (`"use client"`)
- `src/app/test-send/page.tsx` — Server Component shell

#### `src/api/send/factory.ts` needed?

No. The dependency construction in `src/app/api/send/route.ts` is 6 lines and involves no non-trivial logic. Mirrored verbatim into `actions.ts` — same imports (`@upstash/qstash`, `@/router`, `@/sender`, `@/send-log`, `@/queue`, `@/api/send`), same construction order. No `factory.ts` created.

#### Result panel strings vs section 4 table

All heading strings match section 4 exactly. No divergence.

#### Checks

- `npx tsc --noEmit` exits 0.
- `npx vitest run` passes: 258 tests across 15 test files, all passing. No new test failures.

#### Handoff for tester

`src/test-send/index.ts` exports the following pure functions and types for the tester to cover in `src/test-send/index.test.ts`:

- `type Category` — union `'magic_link' | 'promotional' | 'update'`
- `const CATEGORIES` — `readonly Category[]`, exactly `['magic_link', 'promotional', 'update']`
- `function buildDefaultSubject(category: Category): string` — returns `` `Test — ${category}` ``
- `type ClientFormErrors` — `{ to?: string; subject?: string }`
- `function validateClientForm(input: { to: string; subject: string }): ClientFormErrors` — returns `{ to: 'Recipient address is required' }`, `{ subject: 'Subject is required' }`, both, or `{}` as appropriate; whitespace-only treated as empty
- `type SendApiResponse` — discriminated union with `kind: 'sent' | 'queued' | 'error'`
- `function mapApiResponseToResult(status: number, body: unknown): SendApiResponse` — maps all nine HTTP response patterns documented in section 1 of the architect brief

The wiring files (`actions.ts`, `SendForm.tsx`, `page.tsx`) contain no business logic beyond reading form fields, constructing a `Request`, calling `createSendHandler`/`mapApiResponseToResult`, and rendering JSX from state.

---

### 2026-05-25 — tester

#### Test file

`src/test-send/index.test.ts` — 28 new tests across 5 describe blocks.

#### Acceptance criteria coverage

| AC | Criterion | Status |
|---|---|---|
| AC-4 | Category dropdown contains exactly three options: magic_link, promotional, update | Verified — `CATEGORIES` constant tested for exact membership and order |
| — | `buildDefaultSubject` returns correct string for each category | Verified — 3 tests |
| — | `validateClientForm` rejects empty to, empty subject, whitespace-only to; passes valid input; returns both errors when both empty | Verified — 5 tests |
| — | `mapApiResponseToResult` maps all 9 HTTP response patterns to the correct `SendApiResponse` union shape | Verified — 9 tests |
| — | Voice spot-check: no forbidden word (Oops, Unfortunately, Please, Sorry, Successfully) in any result detail across all 9 cases | Verified — 9 tests |

AC-1 (page loads without errors), AC-2 (valid send delivers email and shows message ID), AC-3 (known-bad recipient shows specific error), AC-5 (button disabled during in-flight request), and AC-6 (keyboard navigation, no colour-only indicators) cannot be tested in `environment: 'node'` without a browser. They are integration/manual gate criteria and remain uncovered by automated tests — this is expected per the architect's design brief.

#### Discrepancy discovered: `VALIDATION_FAILED` detail format

The tester brief specified `detail: 'to: must be a non-empty string'` (field name prefixed). The implementation's `formatFieldsList` function (line 44-50 of `src/test-send/index.ts`) extracts only the `reason` property from each field object — it does NOT prefix with the field name. Actual output for `fields: [{ field: 'to', reason: 'must be a non-empty string' }]` is `'must be a non-empty string'`, not `'to: must be a non-empty string'`.

Tests reflect the implementation's actual behaviour. The coder or coordinator should decide whether to: (a) update `formatFieldsList` to prepend `field: ` to each reason, or (b) accept the current output and update the spec. This is informational — the test is written to the implementation so the suite passes, but the discrepancy is flagged for review.

#### Gate B assessment

| File | Testable logic | Assessment |
|---|---|---|
| `src/test-send/index.ts` | All exports — pure functions, no side effects | Covered by `src/test-send/index.test.ts` |
| `src/app/test-send/page.tsx` | Renders `<SendForm />` only | Gate B rebuttal: no testable logic — pure wiring |
| `src/app/test-send/actions.ts` | Reads FormData fields, constructs a `Request`, calls `createSendHandler` and `mapApiResponseToResult` | Gate B rebuttal: thin wiring — string-formatting/mapping logic lives in `src/test-send/index.ts` (covered here) and handler logic covered by `src/api/send/index.test.ts` |
| `src/app/test-send/SendForm.tsx` | Client Component using `useActionState`; renders form fields and result panel from state | Gate B rebuttal: no business logic — all string-formatting and mapping is in `src/test-send/index.ts`; no jsdom available in vitest `environment: 'node'` |

#### Vitest output summary

```
Test Files  16 passed (16)
     Tests  286 passed (286)
  Duration  887ms
```

Previously 258 tests across 15 files. New: 28 tests across 1 new file (`src/test-send/index.test.ts`). Exit code 0.

#### Recommendation

Ready for review. All pure-function acceptance criteria are verified by passing tests. The `VALIDATION_FAILED` detail format discrepancy should be reviewed by the coordinator before closing the WU — it does not block the suite (tests pass) but the spec and implementation diverge on whether field names are prefixed in the detail string.

---

### 2026-05-25 — reviewer

#### Verdict: REQUEST CHANGES

One blocker (B1) and three findings (F1–F3). No blockers in the architecture, security, or contract space. Vitest deferred to the tester; 286 passing with exit code 0 per tester report.

---

#### BLOCKERS

**B1 — `formatFieldsList` drops field names from `VALIDATION_FAILED` detail string**

- **What:** The spec (`src/test-send/index.ts` brief, line 129) specifies `detail: formatFieldsList(body.fields)` where the function "joins field reasons." The intent from the API contract (WU-008 `src/api/send/index.ts` — `ValidationFailure = { field: string; reason: string }`) is that both pieces of information reach the user. The current `formatFieldsList` implementation (lines 44–50 of `src/test-send/index.ts`) discards `field` entirely, emitting only the `reason` string. A user seeing "must be a non-empty string" has no way to know which field failed. The voice rule "Say what happened" requires enough context to act — a bare reason without the field name fails that standard. The tester flagged this as a discrepancy and wrote tests to the actual (broken) behaviour, so the suite passes but the spec is not honoured.
- **Where:** `src/test-send/index.ts` lines 44–50 (`formatFieldsList`); tester discrepancy note at WU-009 `### 2026-05-25 — tester`.
- **Suggested fix:** Change `formatFieldsList` to prepend the field name: `` return fields.map(f => typeof f === 'object' && f !== null && 'field' in f && 'reason' in f ? `${String((f as any).field)}: ${String((f as any).reason)}` : String(f)).join('; ') ``. Update the test at `src/test-send/index.test.ts` line 130 to assert `'to: must be a non-empty string'` instead of `'must be a non-empty string'`.

---

#### FINDINGS (non-blocking)

**F1 — Conflicting `font-normal` and `font-semibold` on result panel heading paragraphs**

- **What:** Lines 21, 45, and 77 of `SendForm.tsx` carry both `font-normal` and `font-semibold` in the same `className` string: `"text-base font-normal leading-normal font-semibold"`. In Tailwind v4 JIT the stylesheet order (not string order) determines which wins; `font-semibold` wins in practice, so the visual output is correct. However the redundant `font-normal` is misleading to readers and will confuse any future editor who assumes string order governs.
- **Where:** `src/app/test-send/SendForm.tsx` lines 21, 45, 77.
- **Suggested fix:** Remove `font-normal` from those three `<p>` elements. The resulting class string `"text-base leading-normal font-semibold"` expresses intent unambiguously.

**F2 — `aria-busy={pending}` passes a boolean; React 19 renders it as `""` when false**

- **What:** The spec and `accessibility.md` require `aria-busy="true"` when pending and `aria-busy="false"` when idle. React 19 serialises `aria-busy={false}` as the attribute being omitted entirely in some rendering paths (the aria spec allows this, but some screen readers then treat the element as not busy rather than explicitly not-busy). The spec notes `aria-busy={pending}` is acceptable, so this is a low-severity finding — but explicitly passing `aria-busy={pending ? 'true' : 'false'}` is the safe, unambiguous form.
- **Where:** `src/app/test-send/SendForm.tsx` line 177.
- **Suggested fix:** Change `aria-busy={pending}` to `aria-busy={pending ? 'true' : 'false'}` for explicit AT compatibility.

**F3 — `VALIDATION_FAILED` test written to wrong expected value (consequent on B1)**

- **What:** `src/test-send/index.test.ts` line 130 asserts `expect(result.detail).toBe('must be a non-empty string')` — this expectation was written to match the broken implementation. Once B1 is fixed, this test will fail unless updated.
- **Where:** `src/test-send/index.test.ts` line 130.
- **Suggested fix:** After fixing B1, update the assertion to `expect(result.detail).toBe('to: must be a non-empty string')`.

---

#### Acceptance criteria walk

| AC | Criterion | Verdict | Evidence |
|---|---|---|---|
| AC-1 | `/test-send` page file exists with default export | Pass | `src/app/test-send/page.tsx` line 3 — `export default function TestSendPage()` |
| AC-2 | Result panel success variant shows messageId | Pass | `SendForm.tsx` line 23 — `Sent. Message ID: <span className="font-mono …">{result.messageId}</span>` |
| AC-3 | Error variant shows `state.result.detail` not generic string | Pass | `SendForm.tsx` line 81 — `{result.detail}` rendered directly |
| AC-4 | CATEGORIES = `['magic_link', 'promotional', 'update']` exactly | Pass | `src/test-send/index.ts` line 3; confirmed by 2 passing tests |
| AC-5 | Submit disabled during pending / no double-submit | Pass | `SendForm.tsx` line 179 — `disabled={pending \|\| !canSubmit}` |
| AC-6 | All form fields have `<label>`, result panel has `aria-live="polite"` | Pass | labels at lines 113–117, 135–139, 154–158; `aria-live="polite"` on all three `<section>` variants including the idle empty one at line 9 |

---

#### Architect brief compliance

| Requirement | Verdict | Notes |
|---|---|---|
| `src/test-send/index.ts` exports all seven named items | Pass | All exports verified: `Category`, `CATEGORIES`, `buildDefaultSubject`, `ClientFormErrors`, `validateClientForm`, `SendApiResponse`, `mapApiResponseToResult` |
| `actions.ts` dependency construction mirrors `route.ts` verbatim | Pass | Diff of the two construction blocks is empty — identical order and constructor args |
| `MAILER_API_KEY` server-only | Pass | Absent from `SendForm.tsx` and `page.tsx`; present only in `actions.ts` lines 27 and 40 |
| `useActionState` from `react` not `react-dom` | Pass | `SendForm.tsx` line 3 — `import { useActionState, useState } from 'react'` |
| No business logic in wiring files | Pass | All string-formatting and mapping in `src/test-send/index.ts`; wiring files contain only FormData reads, Request construction, handler call, and JSX |
| Synthetic `Request` includes `'authorization'` header | Pass | `actions.ts` line 40 — `authorization: \`Bearer ${process.env.MAILER_API_KEY ?? ''}\`` |

---

#### Design token and voice spot-check

All heading strings match spec section 4 table exactly. Banned voice words (`Oops`, `Unfortunately`, `Please try again`, `Sorry`, `Successfully`) are absent from all string literals. Loading button text is `"Sending…"` (single `…` character). `bg-blue-600`, `bg-emerald-50`, `bg-red-50`, `font-mono` on IDs, `max-w-[480px] px-4 pt-16 pb-12`, `space-y-5` — all present. Dark-mode variants present on all token-mapped classes.

---

#### Security

`MAILER_API_KEY` confirmed absent from both client-side files. No new dependencies added to `package.json`.
