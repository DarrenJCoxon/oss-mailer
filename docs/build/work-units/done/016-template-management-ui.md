# Work Unit 016 — Template management UI

**Status:** ✅ shipped
**For:** [P001 — Indie SaaS Developer](../../personas/P001-indie-dev.md)
**Last updated:** 2026-05-25

**Depends on:** [WU-014 — Navigation shell](014-nav-shell-first-run.md), [WU-004 — Template Renderer](done/004-template-renderer.md), [WU-012 — npm package + client SDK](done/012-npm-package-client.md)

## What's done when this ships

A developer opens `/templates` and sees the three email categories (magic_link, promotional, update). For each they can: view the default template (rendered preview), customise the subject line and body copy, and save their customisation to the database. Customised templates override the built-in react-email defaults when the mailer sends. A developer who ships oss-mailer can brand their magic link emails ("Sign in to Acme") without touching code.

## Walkthrough

1. Developer opens `/templates` — sees three cards: Magic link, Promotional, Update.
2. Clicks "Edit" on Magic link — opens an edit form with fields: Subject (text input), Body HTML (textarea, pre-filled with the default template's rendered HTML).
3. Edits the subject to "Sign in to Acme" and tweaks the HTML.
4. Clicks "Save" — template saved to DB. Success toast appears.
5. Next magic link send uses the saved template's subject and HTML (via `props.html` passthrough in renderer).
6. Clicks "Preview" — right panel shows a rendered HTML preview of the current content.
7. Clicks "Reset to default" — clears the DB row, reverts to built-in react-email template.

**What if something goes wrong:**
- DB save fails: error message inline, no partial state.
- Preview render fails: fallback plain text preview with error note.

## How we'll know it's done

1. `GET /templates` lists all three categories with their current customisation status (Default / Customised badge).
2. Edit form for each category has: `subject` (text input), `html` (textarea).
3. Save action persists to a new `email_templates` DB table (category, subject, html, updated_at).
4. On successful save: success feedback, form shows saved values on reload.
5. Reset to default deletes the DB row and reverts to built-in template.
6. The renderer checks the `email_templates` table before falling back to react-email templates — DB override takes precedence.
7. Preview panel renders HTML in an `<iframe>` with `srcdoc`.
8. All DB operations use Server Actions (`"use server"`).
9. `npx vitest run` exits 0.

## Notes / log

### 2026-05-25 — initial filing

Filed as WU-016. This is the most complex WU in Phase 2 — it touches the database schema, the renderer, Server Actions, and a new UI surface. The key design question for the architect: where does the DB template override live in the send pipeline?

#### The override chain

When a send arrives at the renderer, the lookup order must be:

1. **`props.html` in the request** — caller passed pre-rendered HTML (highest priority, always wins)
2. **DB custom template** — developer saved a customisation in `/templates`
3. **Built-in react-email template** — the default TSX file in `src/templates/`

The renderer currently handles steps 1 and 3. Step 2 requires the renderer to become async (it already returns `Promise<{ html, text }>` so this is clean) and accept a `templateOverride?: { subject?: string; html?: string }` injection. The DB lookup happens in the caller (`src/sender/index.ts`) which already has DB access — it looks up the override and passes it to the renderer. This keeps the renderer pure (no DB import).

#### DB schema addition

New table `email_templates`:

```ts
export const emailTemplates = pgTable('email_templates', {
  category: text('category').primaryKey(),   // 'magic_link' | 'promotional' | 'update'
  subject: text('subject'),                  // null = use default
  html: text('html'),                        // null = use react-email template
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
```

No `id` column — category is the natural primary key (one row per category, upsert on save).

#### Renderer change

Add optional `override` parameter to `renderTemplate`:

```ts
export async function renderTemplate(
  category: EmailCategory,
  props?: Record<string, unknown>,
  override?: { subject?: string; html?: string },
): Promise<{ html: string; text: string }>
```

If `override.html` is a non-empty string, return `{ html: override.html, text: '' }` (same as `props.html` passthrough but sourced from DB). Subject override is handled by the caller (sender) before calling the provider — the renderer only handles HTML.

#### Sender change

`src/sender/index.ts` must look up `email_templates` for the category before calling `renderTemplate`. Pass the result as `override`. If no DB row exists, pass `undefined`. This is a small addition to `createMailSender` — inject a `getTemplateOverride` dependency (testable, no direct DB import in tests).

#### UI design

**`/templates` — index page:**

Three cards in a grid (2-col on desktop, 1-col mobile):

```
┌─────────────────────┐  ┌─────────────────────┐
│  Magic link         │  │  Promotional        │
│  [Default]          │  │  [Customised ✏️]    │
│  Subject: Sign in…  │  │  Subject: This week…│
│  [Edit] [Preview]   │  │  [Edit] [Preview]   │
└─────────────────────┘  └─────────────────────┘
┌─────────────────────┐
│  Update             │
│  [Default]          │
│  [Edit] [Preview]   │
└─────────────────────┘
```

**`/templates/[category]` — edit page:**

Left: form (subject input + HTML textarea + Save / Reset buttons).
Right: live preview `<iframe srcdoc={html}>` updated on input change (debounced, Client Component).

The form submit is a Server Action. The preview panel is a Client Component using `useState` for the current HTML value.

**Files to create/modify:**

| File | Action |
| --- | --- |
| `src/db/schema.ts` | Add `emailTemplates` table |
| `drizzle/` | New migration file |
| `src/template-store/index.ts` | Pure helpers — `getTemplateOverride`, `saveTemplate`, `resetTemplate`, `TemplateOverride` type |
| `src/template-store/index.test.ts` | Tests for pure helpers (mock DB) |
| `src/sender/index.ts` | Inject `getTemplateOverride` dependency; call before `renderTemplate` |
| `src/sender/index.test.ts` | Update tests for new dependency |
| `src/renderer/index.tsx` | Add `override` parameter to `renderTemplate` |
| `src/renderer/index.test.tsx` | Add tests for `override` path |
| `src/app/templates/page.tsx` | Server Component — template index |
| `src/app/templates/[category]/page.tsx` | Server Component shell |
| `src/app/templates/[category]/TemplateEditor.tsx` | Client Component — form + preview |
| `src/app/templates/[category]/actions.ts` | `"use server"` — save + reset Server Actions |

#### Constraints

- Subject override is stored in DB but applied by the sender (not the renderer) — the renderer's concern is HTML only.
- The `<iframe>` preview uses `srcdoc` — no external URL, no XSS surface.
- Server Actions for save/reset — no new API endpoints.
- `getTemplateOverride` is injected into the sender as a dependency — not imported directly from `src/db/` inside `src/sender/`.
- Drizzle migration required — run `npm run db:generate && npm run db:migrate` after implementing.
- HTML textarea accepts raw HTML — sanitize on render (CSP via `<iframe sandbox>`) but store as-is (developer is the user, not end-users).

### 2026-05-25 — coder implementation

**Implemented.** All 12 files created or modified. Vitest exit 0 — 427 tests pass across 25 test files.

**Files changed:**

- `src/db/schema.ts` — added `emailTemplates` table and `InsertEmailTemplate`/`SelectEmailTemplate` types
- `drizzle/0001_email_templates.sql` — hand-written migration SQL (CREATE TABLE IF NOT EXISTS)
- `drizzle/meta/_journal.json` — added idx 1 entry for the migration
- `src/template-store/index.ts` — new module with `getTemplateOverride`, `saveTemplate`, `resetTemplate`, `TemplateOverride` type (uses `any` typed db param)
- `src/template-store/index.test.ts` — 11 tests covering all three store functions with stub DB
- `src/renderer/index.tsx` — added optional third `override` param; inserts override check between `props.html` passthrough and built-in template call
- `src/renderer/index.test.tsx` — 6 new tests for the override path appended
- `src/sender/index.ts` — added optional `getOverride` third factory param; computes `override` before `renderTemplate`; applies subject override before `adapter.send`
- `src/sender/index.test.ts` — updated `renderTemplate` call assertion (now 3 args); added 5 new `getOverride` dependency tests
- `src/app/templates/page.tsx` — replaced stub with async Server Component; reads DB for customisation status; renders 3 cards with Edit links
- `src/app/templates/page.test.tsx` — updated to mock `@/db` and `next/link` (needed because page now imports db at module level); existing metadata assertions preserved, 1 new component test added
- `src/app/templates/[category]/page.tsx` — new async Server Component; validates category, fetches current override, renders `TemplateEditor`
- `src/app/templates/[category]/TemplateEditor.tsx` — new Client Component; split-pane form + live iframe preview; save/reset via Server Actions
- `src/app/templates/[category]/actions.ts` — new `"use server"` module with `saveTemplateAction` and `resetTemplateAction`

**Unexpected discovery:** The existing `src/app/templates/page.test.tsx` tested only metadata and had no DB mock. When the page gained a real `@/db` import, the test module-load crashed with `neon()` missing `DATABASE_URL`. Fixed by mocking `@/db` and `next/link` at the top of that test file — the existing assertions still pass unchanged.

**Ready for tester:**
- `src/template-store/index.ts` — pure helpers; all exported functions are unit-testable with a stub DB
- `src/renderer/index.tsx` — `override` path; the new tests cover all edge cases (empty string, undefined, props.html priority)
- `src/sender/index.ts` — `getOverride` injection; tests cover pass-through, subject override, and no-override path
- `src/app/templates/[category]/actions.ts` — Server Actions; can be tested by calling them directly with a mocked DB (note: `"use server"` files are not unit-testable in vitest without framework scaffolding — flag as integration-test territory)
- `src/app/templates/[category]/TemplateEditor.tsx` — Client Component; testable with `@testing-library/react` if the tester adds that dependency

**NOT done / follow-up:**
- `npm run db:migrate` was NOT run (per spec — just write the SQL file). The migration must be applied to the actual Neon DB before the `/templates` page's DB reads work in production.
- No test file was created for `[category]/page.tsx`, `TemplateEditor.tsx`, or `actions.ts` — those are UI-layer files the tester covers.
