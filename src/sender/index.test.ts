/**
 * Covers src/sender/index.ts
 *
 * AC-1: send({ category: 'magic_link', to, subject, props }) returns SendResult { success: true, messageId, provider, sentAt }
 * AC-2: A send log entry is written for every send attempt (success AND failure)
 * AC-3: A failed provider send returns SendResult { success: false } and writes a failure log entry — does NOT throw
 * AC-4: List-Unsubscribe header added for 'promotional' and 'update'; NOT added for 'magic_link'
 * AC-5: If renderTemplate throws TemplateError, it is rethrown as-is and NO log entry is written
 * AC-6: If writeSendAttempt throws, the error is NOT propagated — send returns the result anyway
 * AC-7: If MAILER_FROM env var is absent, send() throws a plain Error before the adapter is called
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

vi.mock('../renderer', () => ({
  renderTemplate: vi.fn(),
  TemplateError: class TemplateError extends Error {
    readonly code: string
    readonly category: string
    readonly _tag = 'TemplateError' as const
    constructor(args: { code: string; category: string; message: string; cause?: unknown }) {
      super(args.message)
      this.name = 'TemplateError'
      this.code = args.code
      this.category = args.category
    }
  },
}))

import { createMailSender, isMailSenderError, MailSenderError } from './index'
import { renderTemplate } from '../renderer'
import { TemplateError } from '../renderer'
import type { EmailProvider, SendResult, ProviderSendRequest } from '../providers/interface'
import type { EmailCategory } from '../router'
import type { SendLogWriter } from './index'

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeSuccessResult(override: Partial<SendResult> = {}): SendResult {
  return {
    success: true,
    messageId: 'msg-abc-123',
    provider: 'ses',
    sentAt: new Date().toISOString(),
    ...override,
  }
}

function makeAdapter(result: SendResult): EmailProvider & { send: ReturnType<typeof vi.fn> } {
  return {
    name: 'ses',
    validate: vi.fn(),
    send: vi.fn().mockResolvedValue(result),
  }
}

function makeRouter(adapter: EmailProvider): { resolve: ReturnType<typeof vi.fn> } {
  return { resolve: vi.fn().mockReturnValue(adapter) }
}

function makeLogWriter(): SendLogWriter & { writeSendAttempt: ReturnType<typeof vi.fn> } {
  return { writeSendAttempt: vi.fn().mockResolvedValue(undefined) }
}

const MOCK_RENDERED = { html: '<p>Hello</p>', text: 'Hello' }

let savedEnv: NodeJS.ProcessEnv

beforeEach(() => {
  savedEnv = { ...process.env }
  process.env.MAILER_FROM = 'sender@example.com'
  vi.mocked(renderTemplate).mockResolvedValue(MOCK_RENDERED)
})

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in savedEnv)) {
      delete process.env[key]
    }
  }
  Object.assign(process.env, savedEnv)
  vi.clearAllMocks()
})

// ─── AC-1: happy path returns SendResult { success: true, ... } ─────────────

describe('send() happy path — AC-1', () => {
  it('returns success: true', async () => {
    const result = makeSuccessResult()
    const adapter = makeAdapter(result)
    const router = makeRouter(adapter)
    const logWriter = makeLogWriter()
    const { send } = createMailSender(router as never, logWriter)

    const outcome = await send({ category: 'magic_link', to: 'user@example.com', subject: 'Login' })

    expect(outcome.success).toBe(true)
  })

  it('returns messageId from the adapter result', async () => {
    const result = makeSuccessResult({ messageId: 'test-message-id' })
    const { send } = createMailSender(makeRouter(makeAdapter(result)) as never, makeLogWriter())

    const outcome = await send({ category: 'magic_link', to: 'user@example.com', subject: 'Login' })

    expect(outcome.messageId).toBe('test-message-id')
  })

  it('returns provider from the adapter result', async () => {
    const result = makeSuccessResult({ provider: 'ses' })
    const { send } = createMailSender(makeRouter(makeAdapter(result)) as never, makeLogWriter())

    const outcome = await send({ category: 'magic_link', to: 'user@example.com', subject: 'Login' })

    expect(outcome.provider).toBe('ses')
  })

  it('returns sentAt as an ISO-8601 string', async () => {
    const sentAt = new Date().toISOString()
    const result = makeSuccessResult({ sentAt })
    const { send } = createMailSender(makeRouter(makeAdapter(result)) as never, makeLogWriter())

    const outcome = await send({ category: 'magic_link', to: 'user@example.com', subject: 'Login' })

    expect(new Date(outcome.sentAt).toISOString()).toBe(outcome.sentAt)
  })

  it('calls renderTemplate with the correct category and props', async () => {
    const result = makeSuccessResult()
    const { send } = createMailSender(makeRouter(makeAdapter(result)) as never, makeLogWriter())

    await send({ category: 'magic_link', to: 'user@example.com', subject: 'Login', props: { url: 'https://example.com/magic' } })

    expect(vi.mocked(renderTemplate)).toHaveBeenCalledWith('magic_link', { url: 'https://example.com/magic' })
  })

  it('calls router.resolve with the correct category', async () => {
    const result = makeSuccessResult()
    const adapter = makeAdapter(result)
    const router = makeRouter(adapter)
    const { send } = createMailSender(router as never, makeLogWriter())

    await send({ category: 'magic_link', to: 'user@example.com', subject: 'Login' })

    expect(router.resolve).toHaveBeenCalledWith('magic_link')
  })
})

// ─── AC-2: log entry written for every attempt (success and failure) ─────────

describe('send log entry written on every attempt — AC-2', () => {
  it('calls writeSendAttempt once on a successful send', async () => {
    const logWriter = makeLogWriter()
    const { send } = createMailSender(makeRouter(makeAdapter(makeSuccessResult())) as never, logWriter)

    await send({ category: 'magic_link', to: 'user@example.com', subject: 'Login' })

    expect(logWriter.writeSendAttempt).toHaveBeenCalledOnce()
  })

  it('writeSendAttempt receives correct category and to on success', async () => {
    const logWriter = makeLogWriter()
    const { send } = createMailSender(makeRouter(makeAdapter(makeSuccessResult())) as never, logWriter)

    await send({ category: 'magic_link', to: 'user@example.com', subject: 'Login' })

    expect(logWriter.writeSendAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'magic_link', to: 'user@example.com', success: true }),
    )
  })

  it('calls writeSendAttempt once on a failed provider send', async () => {
    const failResult: SendResult = { success: false, provider: 'ses', sentAt: new Date().toISOString(), error: 'bad credentials' }
    const logWriter = makeLogWriter()
    const { send } = createMailSender(makeRouter(makeAdapter(failResult)) as never, logWriter)

    await send({ category: 'magic_link', to: 'user@example.com', subject: 'Login' })

    expect(logWriter.writeSendAttempt).toHaveBeenCalledOnce()
  })

  it('writeSendAttempt receives success: false on a failed provider send', async () => {
    const failResult: SendResult = { success: false, provider: 'ses', sentAt: new Date().toISOString(), error: 'bad credentials' }
    const logWriter = makeLogWriter()
    const { send } = createMailSender(makeRouter(makeAdapter(failResult)) as never, logWriter)

    await send({ category: 'magic_link', to: 'user@example.com', subject: 'Login' })

    expect(logWriter.writeSendAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    )
  })
})

// ─── AC-3: failed provider send returns success: false, does NOT throw ───────

describe('failed provider send — AC-3', () => {
  it('returns { success: false } when adapter returns a failure result', async () => {
    const failResult: SendResult = { success: false, provider: 'ses', sentAt: new Date().toISOString(), error: 'bounce' }
    const { send } = createMailSender(makeRouter(makeAdapter(failResult)) as never, makeLogWriter())

    const outcome = await send({ category: 'magic_link', to: 'user@example.com', subject: 'Login' })

    expect(outcome.success).toBe(false)
  })

  it('does not throw when adapter returns a failure result', async () => {
    const failResult: SendResult = { success: false, provider: 'ses', sentAt: new Date().toISOString(), error: 'bounce' }
    const { send } = createMailSender(makeRouter(makeAdapter(failResult)) as never, makeLogWriter())

    await expect(send({ category: 'magic_link', to: 'user@example.com', subject: 'Login' })).resolves.not.toThrow()
  })

  it('writes a failure log entry when adapter returns success: false', async () => {
    const failResult: SendResult = { success: false, provider: 'ses', sentAt: new Date().toISOString(), error: 'bounce' }
    const logWriter = makeLogWriter()
    const { send } = createMailSender(makeRouter(makeAdapter(failResult)) as never, logWriter)

    await send({ category: 'magic_link', to: 'user@example.com', subject: 'Login' })

    expect(logWriter.writeSendAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'bounce' }),
    )
  })
})

// ─── AC-4: List-Unsubscribe header — promotional and update get it, magic_link does not ──

describe('List-Unsubscribe header — AC-4', () => {
  it('adds List-Unsubscribe header for promotional category', async () => {
    const adapter = makeAdapter(makeSuccessResult())
    const { send } = createMailSender(makeRouter(adapter) as never, makeLogWriter())

    await send({ category: 'promotional', to: 'user@example.com', subject: 'Newsletter', props: { unsubscribeUrl: 'https://example.com/unsub' } })

    const callArg: ProviderSendRequest = adapter.send.mock.calls[0][0]
    expect(callArg.headers?.['List-Unsubscribe']).toBe('<https://example.com/unsub>')
  })

  it('adds List-Unsubscribe header for update category', async () => {
    const adapter = makeAdapter(makeSuccessResult())
    const { send } = createMailSender(makeRouter(adapter) as never, makeLogWriter())

    await send({ category: 'update', to: 'user@example.com', subject: 'Product update', props: { unsubscribeUrl: 'https://example.com/unsub' } })

    const callArg: ProviderSendRequest = adapter.send.mock.calls[0][0]
    expect(callArg.headers?.['List-Unsubscribe']).toBe('<https://example.com/unsub>')
  })

  it('does NOT add List-Unsubscribe header for magic_link category', async () => {
    const adapter = makeAdapter(makeSuccessResult())
    const { send } = createMailSender(makeRouter(adapter) as never, makeLogWriter())

    await send({ category: 'magic_link', to: 'user@example.com', subject: 'Login' })

    const callArg: ProviderSendRequest = adapter.send.mock.calls[0][0]
    expect(callArg.headers?.['List-Unsubscribe']).toBeUndefined()
  })

  it('omits List-Unsubscribe and warns when props.unsubscribeUrl is absent for promotional', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const adapter = makeAdapter(makeSuccessResult())
    const { send } = createMailSender(makeRouter(adapter) as never, makeLogWriter())

    await send({ category: 'promotional', to: 'user@example.com', subject: 'Newsletter' })

    const callArg: ProviderSendRequest = adapter.send.mock.calls[0][0]
    expect(callArg.headers?.['List-Unsubscribe']).toBeUndefined()
    expect(warnSpy).toHaveBeenCalledWith(
      '[MailSender] List-Unsubscribe omitted — props.unsubscribeUrl missing for category:',
      'promotional',
    )
    warnSpy.mockRestore()
  })
})

// ─── AC-5: TemplateError is rethrown as-is, no log entry written ─────────────

describe('TemplateError propagation — AC-5', () => {
  it('rethrows TemplateError when renderTemplate throws', async () => {
    const templateErr = new TemplateError({ code: 'RENDER_FAILED', category: 'magic_link', message: 'render failed' })
    vi.mocked(renderTemplate).mockRejectedValue(templateErr)
    const logWriter = makeLogWriter()
    const { send } = createMailSender(makeRouter(makeAdapter(makeSuccessResult())) as never, logWriter)

    await expect(send({ category: 'magic_link', to: 'user@example.com', subject: 'Login' })).rejects.toThrow(templateErr)
  })

  it('rethrows the exact same TemplateError instance', async () => {
    const templateErr = new TemplateError({ code: 'RENDER_FAILED', category: 'magic_link', message: 'render failed' })
    vi.mocked(renderTemplate).mockRejectedValue(templateErr)
    const { send } = createMailSender(makeRouter(makeAdapter(makeSuccessResult())) as never, makeLogWriter())

    let caught: unknown
    try {
      await send({ category: 'magic_link', to: 'user@example.com', subject: 'Login' })
    } catch (e) {
      caught = e
    }
    expect(caught).toBe(templateErr)
  })

  it('does NOT write a log entry when renderTemplate throws TemplateError', async () => {
    const templateErr = new TemplateError({ code: 'RENDER_FAILED', category: 'magic_link', message: 'render failed' })
    vi.mocked(renderTemplate).mockRejectedValue(templateErr)
    const logWriter = makeLogWriter()
    const { send } = createMailSender(makeRouter(makeAdapter(makeSuccessResult())) as never, logWriter)

    try {
      await send({ category: 'magic_link', to: 'user@example.com', subject: 'Login' })
    } catch {
      // expected
    }

    expect(logWriter.writeSendAttempt).not.toHaveBeenCalled()
  })
})

// ─── AC-6: writeSendAttempt throws — error is NOT propagated ─────────────────

describe('writeSendAttempt throws — AC-6', () => {
  it('returns the SendResult even when writeSendAttempt throws', async () => {
    const successResult = makeSuccessResult({ messageId: 'msg-xyz' })
    const logWriter: SendLogWriter & { writeSendAttempt: ReturnType<typeof vi.fn> } = {
      writeSendAttempt: vi.fn().mockRejectedValue(new Error('DB unavailable')),
    }
    const { send } = createMailSender(makeRouter(makeAdapter(successResult)) as never, logWriter)

    const outcome = await send({ category: 'magic_link', to: 'user@example.com', subject: 'Login' })

    expect(outcome.success).toBe(true)
    expect(outcome.messageId).toBe('msg-xyz')
  })

  it('does not throw when writeSendAttempt rejects', async () => {
    const logWriter: SendLogWriter & { writeSendAttempt: ReturnType<typeof vi.fn> } = {
      writeSendAttempt: vi.fn().mockRejectedValue(new Error('DB unavailable')),
    }
    const { send } = createMailSender(makeRouter(makeAdapter(makeSuccessResult())) as never, logWriter)

    await expect(send({ category: 'magic_link', to: 'user@example.com', subject: 'Login' })).resolves.not.toThrow()
  })
})

// ─── AC-7: missing MAILER_FROM throws before adapter is called ───────────────

describe('missing MAILER_FROM env var — AC-7', () => {
  it('throws a MailSenderError with code MISSING_CONFIG when MAILER_FROM is not set', async () => {
    delete process.env.MAILER_FROM
    const adapter = makeAdapter(makeSuccessResult())
    const { send } = createMailSender(makeRouter(adapter) as never, makeLogWriter())

    let caught: unknown
    try {
      await send({ category: 'magic_link', to: 'user@example.com', subject: 'Login' })
    } catch (e) {
      caught = e
    }
    expect(isMailSenderError(caught)).toBe(true)
    expect((caught as MailSenderError).code).toBe('MISSING_CONFIG')
  })

  it('error message mentions MAILER_FROM when the env var is absent', async () => {
    delete process.env.MAILER_FROM
    const { send } = createMailSender(makeRouter(makeAdapter(makeSuccessResult())) as never, makeLogWriter())

    await expect(send({ category: 'magic_link', to: 'user@example.com', subject: 'Login' })).rejects.toThrow('MAILER_FROM')
  })

  it('does NOT call adapter.send when MAILER_FROM is missing', async () => {
    delete process.env.MAILER_FROM
    const adapter = makeAdapter(makeSuccessResult())
    const { send } = createMailSender(makeRouter(adapter) as never, makeLogWriter())

    try {
      await send({ category: 'magic_link', to: 'user@example.com', subject: 'Login' })
    } catch {
      // expected
    }

    expect(adapter.send).not.toHaveBeenCalled()
  })

  it('throws a MailSenderError (isMailSenderError returns true) for missing MAILER_FROM', async () => {
    delete process.env.MAILER_FROM
    const { send } = createMailSender(makeRouter(makeAdapter(makeSuccessResult())) as never, makeLogWriter())

    let caught: unknown
    try {
      await send({ category: 'magic_link', to: 'user@example.com', subject: 'Login' })
    } catch (e) {
      caught = e
    }
    expect(isMailSenderError(caught)).toBe(true)
  })
})
