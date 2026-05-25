# Work Unit 013 — incontact migration (Postmark → oss-mailer)

**Status:** 🔵 proposed
**For:** [P001 — Indie SaaS Developer](../personas/P001-indie-dev.md)
**Last updated:** 2026-05-25

**Depends on:** [WU-012 — npm package + client SDK](012-npm-package-client.md)

## What's done when this ships

incontact sends zero emails through Postmark. All 6 email types route through the deployed oss-mailer service via the npm client. `POSTMARK_SERVER_TOKEN` is removed from all env files. The NextAuth Postmark provider is replaced with `MailerEmailProvider`. Magic links, invite emails, verification emails, and weekly digests all work end-to-end.

## Walkthrough

1. `npm install oss-mailer` added to incontact.
2. `MAILER_URL` and `MAILER_API_KEY` added to incontact's `.env.local` and Vercel env vars.
3. `lib/postmark-email.ts` deleted; replaced by `lib/mailer.ts` (thin wrapper around `createMailerClient`).
4. `lib/invite-email.ts` — `sendOnboardingInviteEmail` and `sendPostInviteEmail` updated to call `mailer.sendMail(...)` with their existing HTML in `props.html`.
5. `lib/email.ts` — `sendVerificationEmail` and `sendTopicConfirmationEmail` updated.
6. `lib/anon-digest-email.ts` — `sendAnonTopicDigestEmail` updated.
7. `lib/digest-email.ts` — `sendDigestEmail` updated.
8. `auth.ts` — `Postmark(...)` provider replaced with `MailerEmailProvider(...)`.
9. `POSTMARK_SERVER_TOKEN`, `POSTMARK_API_TOKEN`, `POSTMARK_FROM_EMAIL`, `POSTMARK_MESSAGE_STREAM` removed from `.env.example` and Vercel.
10. Sign-in with magic link works. Weekly digest cron fires and emails arrive. Invite emails send.

**What if something goes wrong:**
- Mailer unreachable: `sendMail` throws `MailerError`; existing error handling in each caller surfaces it as before.
- Auth magic link fails: NextAuth shows its standard `/verify` error page — no change from current Postmark failure behaviour.

## How we'll know it's done

1. `grep -r "postmark" /Users/darrencoxon/Documents/Codebases/current-projects/incontact/lib` returns nothing.
2. `grep -r "POSTMARK" /Users/darrencoxon/Documents/Codebases/current-projects/incontact` returns nothing (except possibly a comment in CHANGELOG/docs).
3. `auth.ts` imports `MailerEmailProvider` not `Postmark`.
4. Manual test: sign-in flow sends magic link via oss-mailer (visible in send log dashboard at mailer URL).
5. Manual test: invite email sends and arrives.
6. incontact TypeScript build (`npx tsc --noEmit`) exits 0.

## Notes / log

### 2026-05-25 — initial filing

Filed as WU-013. This is the reference migration — the worked example that shows other developers exactly how to migrate from Postmark. The incontact `lib/` files become the documentation by example.

#### Files to change in incontact

| File | Change |
| --- | --- |
| `lib/postmark-email.ts` | Delete |
| `lib/mailer.ts` | Create — `createMailerClient` instance, exported as `mailer` |
| `lib/invite-email.ts` | Replace `sendEmail(...)` with `mailer.sendMail(...)` |
| `lib/email.ts` | Replace `sendEmail(...)` with `mailer.sendMail(...)` |
| `lib/anon-digest-email.ts` | Replace `sendEmail(...)` with `mailer.sendMail(...)` |
| `lib/digest-email.ts` | Replace `sendEmail(...)` with `mailer.sendMail(...)` |
| `auth.ts` | Replace `Postmark(...)` with `MailerEmailProvider(...)` |
| `.env.example` | Remove POSTMARK_* vars; add MAILER_URL, MAILER_API_KEY |
| `package.json` | Add `oss-mailer`; remove `postmark` if present |

#### HTML passthrough note

incontact's emails use custom hand-written HTML (invite layouts, digest cards with post previews, author avatars). These should **not** be ported into the mailer's template renderer — they are incontact-specific and the mailer's `update` template is generic. Instead, each `sendMail` call passes `props: { html: <existing html string> }` and the mailer's renderer detects the `html` prop and returns it as-is (implemented in WU-012's `props.html` passthrough).

#### Env vars to add to incontact Vercel project

```
MAILER_URL=https://<your-mailer>.vercel.app
MAILER_API_KEY=<same key as in mailer's MAILER_API_KEY>
```

#### Env vars to remove from incontact Vercel project

```
POSTMARK_SERVER_TOKEN
POSTMARK_API_TOKEN      (if set)
POSTMARK_FROM_EMAIL     (if set)
POSTMARK_MESSAGE_STREAM (if set)
```
