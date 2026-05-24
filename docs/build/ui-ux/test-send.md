# Test Send

**Type:** page
**Status:** 🔵 proposed
**Last updated:** 2026-05-24

## Who uses this surface

- [P001 — Indie SaaS Developer](../personas/P001-indie-dev.md): used immediately after deploy to verify the setup works end-to-end before wiring oss-mailer into their backend

## When they reach it

The developer has just deployed oss-mailer and set their env vars. They want to fire a real email to confirm the provider connection is live before going further.

## What they see

- **Page header** — "Test Send"
- **Form** — three fields:
  - Category (select: `magic_link` / `promotional` / `update`)
  - Recipient email address (text input)
  - Optional subject override (text input, pre-filled with "oss-mailer test send")
- **Send button** — primary action
- **Result panel** — appears after send: success (green, with message ID) or failure (red, with error detail)

## What they do

- Select category → sets which provider will be used
- Enter recipient address → the email they control for verification
- Click Send → fires real send via Mail Sender
- Read result → confirms success or surfaces error

## What happens next

On success: developer is confident the setup works; they navigate away to wire oss-mailer into their backend. On failure: they read the error, fix their env vars (likely SES credentials or sandbox restriction), and retry.

## Contracts this surface touches

- **Reads:** [router](../contracts/router.md) — to show which provider will be used for the selected category
- **Writes:** [mail-sender](../contracts/mail-sender.md) — triggers a real send

## Design system pieces this surface uses

- **Components:** Button (primary), Input, Select, ResultPanel, PageHeader
- **Patterns:** form-layout
- **Tokens:** colour (success/error semantic), typography, spacing

## Accessibility

- Form is fully keyboard-navigable
- Error messages are associated with their fields via `aria-describedby`
- Result panel announced to screen readers via `aria-live`
- AA contrast minimum throughout

## Open questions about this surface

_none currently_

## Notes

### 2026-05-24 — first filed

Critical onboarding surface — this is how P001 confirms the tool works before trusting it with real traffic. Error messages must be specific (e.g. "SES credentials invalid" not "send failed").
