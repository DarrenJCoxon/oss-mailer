# Work Unit 004 — Template Renderer — React Email → HTML

**Status:** ✅ shipped
**For:** [P001 — Indie SaaS Developer](../../personas/P001-indie-dev.md)
**Last updated:** 2026-05-25

**Depends on:** [WU-001 — Project scaffolding](001-project-scaffolding.md)

## What's done when this ships

The Template Renderer accepts an email category and a props object, renders the corresponding React Email component to both an HTML string and a plain-text string, and returns both. One template exists per category (`magic_link`, `promotional`, `update`) — minimal but correct. Mail Sender calls the renderer to produce the `{ html, text }` body it passes to the provider adapter. All three templates meet D008 deliverability standards: text-first, preheader included, unsubscribe placeholder in bulk templates, no spam-trigger words.

## Walkthrough

1. Mail Sender calls `renderTemplate('magic_link', { url: 'https://...' })`.
2. Renderer imports `MagicLinkEmail` React Email component, renders to `{ html, text }` via `@react-email/render`.
3. Returns `{ html: string, text: string }` — no side effects, no I/O.

P001 customising a template:
1. Opens `src/templates/magic-link.tsx`, edits the React Email component.
2. Calls `renderTemplate` — gets updated `{ html, text }` immediately.

**Template props schemas (D008):**
- `magic_link`: `{ url: string }`
- `promotional`: `{ subject: string, body: string, unsubscribeUrl: string }`
- `update`: `{ subject: string, body: string, unsubscribeUrl: string }`

**What if something goes wrong:**
- Unknown category: throws `TemplateError` with `{ code: 'UNKNOWN_TEMPLATE', category }`.
- Render failure: throws `TemplateError` with `{ code: 'RENDER_FAILED', cause }`.

## How we'll know it's done

1. `renderTemplate('magic_link', { url: 'https://example.com' })` returns `{ html, text }` — both non-empty, html contains the URL, text is non-empty.
2. `renderTemplate('promotional', { subject: 'Hello', body: 'World', unsubscribeUrl: 'https://example.com/unsub' })` returns `{ html, text }` — html contains the unsubscribeUrl as a visible link.
3. `renderTemplate('update', { subject: 'Hello', body: 'World', unsubscribeUrl: 'https://example.com/unsub' })` returns `{ html, text }` — html contains the unsubscribeUrl as a visible link.
4. All three templates include a preheader text element in the HTML.
5. Unknown category throws `TemplateError` with `code: 'UNKNOWN_TEMPLATE'`.
6. No template contains images, JavaScript, or external CSS files.
7. `npx vitest run` exits 0.

## Notes / log

### 2026-05-24 — initial filing

Can run in parallel with WU-002 and WU-003 after WU-001 lands. Templates are minimal for Phase 1 — the goal is a working renderer, not polished email design. P001 will customise templates after the pipeline works end-to-end.

### 2026-05-25 — architect brief

**Design A — Static registry**
All three template modules are imported at the top of `src/renderer/index.ts`. A module-level `TEMPLATES` constant maps each `EmailCategory` to a render-factory closure: `{ magic_link: (props) => <MagicLinkEmail {...props} />, ... }` typed as `satisfies Record<EmailCategory, (props: never) => ReactElement>`. `renderTemplate()` looks the category up synchronously, then awaits two `render()` calls (one for HTML, one with `{ plainText: true }`). Mirrors the existing `createRouter()` pattern in `src/router/index.ts`. Compile-time exhaustiveness check guarantees every category has a template; a missing entry is a TS error, not a runtime error.

**Design B — Dynamic import**
`renderTemplate()` builds a path from the category (`./templates/${category}` with a hyphen swap for `magic_link`) and does `await import(...)` at call time. Templates are not imported at module load. In principle this gives lazy loading; in practice Vercel statically bundles all reachable code into the function regardless, so the cold-start saving is theoretical for three tiny text-only components. The path-string mapping moves the category-to-template guarantee from compile time to runtime — a typo or rename surfaces as `RENDER_FAILED` on first send, not as a TS error during `npm run build`.

**Chosen design: A**
Two reasons: (1) D007 says the category-to-template mapping is known at compile time — Design A makes that constraint structural via TypeScript exhaustiveness, while Design B simulates it via string interpolation and weakens the guarantee. (2) The codebase already uses this exact pattern in `src/router/index.ts` (frozen registry plus `satisfies Record<EmailCategory, ...>`); reusing it keeps the renderer's shape identical to the router's, which lowers cognitive load for the coder, reviewer, and debugger.

**Rejected for Design B specifically:** the lazy-load argument doesn't survive Vercel's bundling behaviour, and the runtime-typo failure mode is exactly the class of error D007 was written to eliminate.

**Implementation brief for the coder:**

- **Packages to install:** `@react-email/render @react-email/components`
  - Do NOT install `react-email` (unscoped) — that's the dev preview tool, not a runtime dep. Researcher and coordinator have verified this.
  - `@react-email/render` exports `render` as an **async** function in v2.x: `await render(<Component/>)` returns the HTML string; `await render(<Component/>, { plainText: true })` returns plain text. Two separate awaits are required for HTML + text.

- **Template files (each ~30–60 lines, no JS, no images, no external CSS):**
  - `src/templates/magic-link.tsx` — `export default function MagicLinkEmail({ url }: { url: string })`. Transactional, no unsubscribe link. Preview text: `"Your magic link — click to sign in"`. Body uses `<Html lang="en">`, `<Head>`, `<Preview>`, `<Body>`, `<Container>`, `<Text>`, and a single `<Link href={url}>`. Subject line copy (used by P001's send call, not by the template itself) must avoid all-caps, exclamation marks, and the D008 spam-trigger word list.
  - `src/templates/promotional.tsx` — `export default function PromotionalEmail({ subject, body, unsubscribeUrl }: { subject: string; body: string; unsubscribeUrl: string })`. Bulk. Must render `unsubscribeUrl` as a visible `<Link>` near the bottom of the email body (D008 + CAN-SPAM). Preview text: a short teaser derived from `subject` or a literal placeholder — keep it under 90 chars. The `subject` prop is shown as the email's H1 / heading inside the body; the SMTP `Subject` header is the caller's responsibility per the contract.
  - `src/templates/update.tsx` — same shape as `promotional.tsx`. Same props, same unsubscribe handling, same preheader pattern. The two are deliberately near-duplicates at this stage — they diverge in copy when P001 customises them, but the v1 structure is identical.

- **Renderer file:** `src/renderer/index.ts`
  - Imports `import { render } from '@react-email/render'`, `import type { EmailCategory } from '../router'`, and the three template default exports.
  - **Exports:** `TemplateError`, `TemplateErrorCode`, `isTemplateError`, `renderTemplate`.
  - **`TemplateErrorCode`:** `'UNKNOWN_TEMPLATE' | 'RENDER_FAILED'`.
  - **`TemplateError` class:** mirrors `RouterError` and `ProviderError` exactly:
    - Fields: `code: TemplateErrorCode`, `category: string`, `cause?: unknown`, `readonly _tag = 'TemplateError' as const`.
    - Constructor takes `{ code, category, message, cause? }`.
    - Sets `this.name = 'TemplateError'` and calls `Error.captureStackTrace?.(this, TemplateError)`.
    - **Must be a distinct class** from `RouterError` and `ProviderError`. Each error type owns its own `_tag` literal so callers can route on type.
  - **`isTemplateError(e: unknown): e is TemplateError`** — duck-typed via `_tag === 'TemplateError'` plus `instanceof` check, matching `isRouterError`.
  - **`renderTemplate` signature (per D007):**
    `export async function renderTemplate(category: EmailCategory, props?: Record<string, unknown>): Promise<{ html: string; text: string }>`
  - **Internal registry (Design A):** module-level constant
    ```ts
    const TEMPLATES = {
      magic_link: (props: { url: string }) => <MagicLinkEmail {...props} />,
      promotional: (props: { subject: string; body: string; unsubscribeUrl: string }) => <PromotionalEmail {...props} />,
      update: (props: { subject: string; body: string; unsubscribeUrl: string }) => <UpdateEmail {...props} />,
    } as const satisfies Record<EmailCategory, (props: never) => React.ReactElement>
    ```
    The `satisfies Record<EmailCategory, ...>` enforces compile-time exhaustiveness — if a new category is added to `EmailCategory` and not added here, TS fails the build. This is the structural guarantee D007 asked for.
  - **Renderer body:**
    1. If `!(category in TEMPLATES)`, throw `new TemplateError({ code: 'UNKNOWN_TEMPLATE', category, message: \`Unknown template for category: "${category}"\` })`.
    2. Build the React element via `TEMPLATES[category](props as never)`. Props validation is the caller's responsibility per the contract — the renderer does not validate prop shapes.
    3. Inside a try/catch, call `const html = await render(element)` and `const text = await render(element, { plainText: true })` (two sequential awaits — they could be `Promise.all`'d, but sequential is fine for v1 and easier to debug).
    4. On any thrown error from `render`, catch and rethrow as `new TemplateError({ code: 'RENDER_FAILED', category, message: 'Template render failed', cause: caught })`.
    5. Return `{ html, text }`.
  - **The renderer module must NOT do async work at module top level.** Only `renderTemplate` is async; all imports are static.

- **`EmailCategory` import:** from `../router` — it's already defined as `'magic_link' | 'promotional' | 'update'` in `src/router/index.ts`. Do not redefine it. Do not move it. If a future WU needs `EmailCategory` in a place that can't import from `router/`, that's a re-home conversation for a separate decision, not for this WU.

- **`tsconfig.json` / JSX:** the renderer file contains JSX (`<MagicLinkEmail {...props} />`), so it must be a `.tsx` file if the project's tsconfig requires that for JSX. Coder: check `tsconfig.json` `jsx` setting and name the file `src/renderer/index.tsx` if needed. The contract surface (`renderTemplate`, `TemplateError`, etc.) is unchanged either way.

- **Tests:** `src/renderer/index.test.ts` (or `.tsx` per above). Cover all 7 acceptance criteria from the WU spec:
  1. `magic_link` returns non-empty `html` containing the URL, non-empty `text`.
  2. `promotional` returns html containing `unsubscribeUrl` as a link (assert on `href="https://example.com/unsub"` in the html).
  3. `update` same as #2.
  4. All three html outputs contain preheader text (the React Email `<Preview>` renders as a hidden `<div>` with the preview string near the top of the body — assert on the preview literal appearing in the html).
  5. Unknown category throws `TemplateError` with `code: 'UNKNOWN_TEMPLATE'` — use `expect(() => ...).rejects.toThrow()` plus a `isTemplateError` type-guard check on the caught value.
  6. Static assertion via grep / source-string check in the test: none of `src/templates/*.tsx` contains `<img`, `<script`, or `<link rel="stylesheet"`. (Or: assert that the rendered html for each category contains none of these strings.)
  7. Implicit — vitest exits 0 if all the above pass.

- **Verification gate for the tester (post-coder hand-off):**
  - `npm run build` exits 0 (catches the exhaustiveness `satisfies` constraint).
  - `npx vitest run src/renderer` exits 0.
  - `grep -RIn -E '<img|<script|<link rel="stylesheet"' src/templates/` returns no matches.
  - `grep -RIn 'cause: caught' src/renderer/` (or equivalent) confirms `RENDER_FAILED` wraps the underlying error rather than swallowing it.

### 2026-05-25 — coder implementation

**What was implemented:**
- Installed `@react-email/render` and `@react-email/components` (npm deprecation warnings on sub-packages are expected; packages function correctly at these pinned versions)
- Created `src/templates/magic-link.tsx` — MagicLinkEmail component with `{ url: string }` props, `<Preview>` with "Your magic link — click to sign in", `<Link href={url}>` Sign in button, no unsubscribe link (transactional)
- Created `src/templates/promotional.tsx` — PromotionalEmail component with `{ subject, body, unsubscribeUrl }` props, subject rendered as heading, visible unsubscribe `<Link>` at the bottom
- Created `src/templates/update.tsx` — UpdateEmail component, identical structure to promotional.tsx (deliberate near-duplicate per architect brief; diverges when P001 customises)
- Created `src/renderer/index.tsx` (`.tsx` required because TEMPLATES registry contains JSX literals; `tsconfig.json` has `"jsx": "preserve"`) — exports `TemplateError`, `TemplateErrorCode`, `isTemplateError`, `renderTemplate`; TEMPLATES uses `as const satisfies Record<EmailCategory, ...>` for compile-time exhaustiveness

**Verification results:**
- `npx tsc --noEmit` — exits 0 (no type errors)
- `grep -RIn -E '<img|<script|<link rel="stylesheet"' src/templates/` — returns no matches (exit 1)

**Unexpected findings:**
- None. The `@react-email/components@1.0.12` sub-package deprecation warnings are cosmetic; the package still resolves and works. The coordinator note to avoid `react-email` (unscoped) was correct.

**Ready for tester:**
- All three templates, the renderer module, and both verification gates pass. Tester should write `src/renderer/index.test.tsx` covering the 7 acceptance criteria listed in the architect brief.

**Not done (out of scope for this WU):**
- Tests — tester agent's responsibility per project conventions

### 2026-05-25 — tester results

40 tests written at `src/renderer/index.test.tsx`. Full suite (`npx vitest run`) exits 0: 110 tests across 11 files, all passing.

**Acceptance criteria coverage:**

| AC | Description | Status |
|----|-------------|--------|
| 1 | `renderTemplate('magic_link', { url })` returns `{ html, text }` — html non-empty and contains the URL, text non-empty | PASS |
| 2 | `renderTemplate('promotional', { subject, body, unsubscribeUrl })` — html contains `href="https://example.com/unsub"` | PASS |
| 3 | `renderTemplate('update', { subject, body, unsubscribeUrl })` — html contains `href="https://example.com/unsub"` | PASS |
| 4 | All three templates include preheader text in the rendered HTML | PASS |
| 5 | Unknown category throws `TemplateError` with `code: 'UNKNOWN_TEMPLATE'` | PASS |
| 6 | No rendered HTML contains `<img`, `<script`, or `rel="stylesheet"` | PASS |
| 7 | `npx vitest run` exits 0 | PASS |

**Architect brief extras (all passing):**
- `isTemplateError` returns true for `TemplateError` instances and false for `RouterError` and plain `Error`
- Both `html` and `text` are non-empty strings for all three categories; `text !== html`
- `TemplateError` class shape: `instanceof Error`, `name === 'TemplateError'`, `_tag === 'TemplateError'`, exposes `code`, `category`, `cause`
- `TemplateError` is distinct from `RouterError` (no cross-instanceof match)

**Testing notes:**
- `@react-email/render` v2.x `render()` is genuinely async and works without any mocking in the vitest node environment — no special setup required
- The `<Preview>` component renders its text inline in the HTML body, so preheader assertions are plain `html.toContain(previewString)` checks
- React Email renders `href` attributes with double quotes, so `href="https://..."` string contains checks work directly
- No `vi.mock` needed for this module — unlike the router tests, the renderer has no external service dependencies at construction time

**Recommendation: ready for review.**

### 2026-05-25 — shipped ✅

Reviewer approved first pass. One WARN resolved by coordinator post-review: the AC-4 preheader tests for `promotional` and `update` were asserting on the subject string (`'Hello'`) which also appears in the body heading — test would have passed even if `<Preview>` were deleted. Fixed by checking for `max-height:0` (the React Email Preview hidden div sentinel) alongside the unique preview string. Full suite still 110/110.

Two NITs not blocking: (1) promotional/update templates have no fallback preview when `subject` is empty — caller's responsibility per contract, but a `|| 'Read our latest update'` default would close the D008 gap; (2) inconsistent React import — renderer imports React explicitly, templates rely on auto-transform. Cosmetic.

**What was attempted:** build the Template Renderer via research-first → full swarm pipeline.

**What worked:** static registry pattern (mirrored from WU-003's PROVIDERS map) was the right choice — `satisfies Record<EmailCategory, ...>` gives compile-time exhaustiveness, matching D007's intent. React Email renders cleanly in vitest's node environment without any mocking — unlike AWS SDK modules, no special setup needed. The `<Preview>` component's `max-height:0` hidden div is the right hook for preheader assertions.

**What didn't work / was corrected:** the researcher initially reported `react-email` (unscoped) as a unified bundle. Coordinator ran `npm info` before spawning the architect and found the unscoped package is a dev preview tool; runtime packages are `@react-email/render` and `@react-email/components`. Corrected before any code was written.

**What was learned:** always verify package names with `npm info` before spawning the architect when the package hasn't been used in this codebase before — scoped vs unscoped variants sharing similar names are a known failure mode for research agents. The `max-height:0` sentinel is the reliable way to assert React Email's `<Preview>` element specifically.

**Next concrete action:** WU-005 (Mail Sender) is now fully unblocked. It will call `renderTemplate()` from this module and `router.resolve()` from WU-003.

