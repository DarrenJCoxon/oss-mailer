# Voice and Tone

**Status:** 🔵 proposed
**Last updated:** 2026-05-24

## How oss-mailer sounds

Direct, honest, and technical — no fluff. oss-mailer speaks to developers the way a good tool speaks: it tells you what happened, why it happened, and what to do next. It doesn't apologise for working correctly, doesn't over-explain things a developer already knows, and doesn't pad error messages with reassurances. When something breaks, it says so plainly and tells you how to fix it.

## Five rules of voice

1. **Say what happened.** "Send failed — SES credentials invalid" beats "There was a problem with your request."
2. **Use second person.** "Your API key" not "the API key" or "the user's API key."
3. **No filler words.** Cut "please", "simply", "just", "easily". If it's simple, the UI shows it; saying "just click here" is condescending.
4. **Technical terms are fine.** This is a developer tool. "Provider", "queue", "message ID", "category" are all fine. Don't soften them into consumer language.
5. **Own failures, not users.** If a send fails due to misconfiguration, don't blame the user — tell them what's wrong and how to fix it.

## Tone by context

| Context | Tone | Example |
| --- | --- | --- |
| Success | Brief, factual | "Sent. Message ID: abc123" |
| Failure | Direct, actionable | "Send failed — SES returned: credentials invalid. Check `SES_ACCESS_KEY_ID` and `SES_SECRET_ACCESS_KEY`." |
| Empty state | Matter-of-fact, helpful | "No sends yet. Use the Test Send page to fire your first email." |
| Config missing | Clear, specific | "`SES_REGION` is not set. Add it to your environment variables and redeploy." |
| Loading | Minimal | "Loading…" — no spinner text essays |
| Confirmation | Direct | "Test email sent to you@example.com via SES." |

## Words we use

| Use | Not |
| --- | --- |
| send | dispatch, transmit, deliver (as a verb) |
| failed | errored, encountered an issue, had a problem |
| provider | mail service, vendor |
| configure | set up, onboard |
| env var / environment variable | secret, config key (inconsistently) |
| message ID | delivery receipt, send token |

## Words we never use

- "Oops!" — this is a developer tool, not a children's app
- "Unfortunately" — just say what happened
- "Please try again" alone — always say what to try
- "Our team is looking into it" — this is self-hosted; there is no team
- "Successfully" redundantly — "Sent" is enough; "Successfully sent" adds nothing
