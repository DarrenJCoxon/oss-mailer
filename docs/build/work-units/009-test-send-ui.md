# Work Unit 009 — Test Send UI

**Status:** 🔵 proposed
**For:** [P001 — Indie SaaS Developer](../personas/P001-indie-dev.md)
**Last updated:** 2026-05-24

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
