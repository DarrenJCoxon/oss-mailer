/**
 * Covers src/providers/ses.ts  (and satisfies Gate B for ses.ts)
 *
 * AC-2: createSesAdapter returns { name: 'ses', validate, send }
 * AC-3: send() with List-Unsubscribe header calls SendRawEmailCommand
 * AC-4: send() standard path calls SendEmailCommand and returns success result
 * AC-5: send() catches SDK errors and returns { success: false } (never throws)
 * AC-6: validate() throws ProviderError(MISSING_ENV) when config is incomplete
 */
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest'
import { SESClient, SendEmailCommand, SendRawEmailCommand } from '@aws-sdk/client-ses'

vi.mock('@aws-sdk/client-ses', () => ({
  SESClient: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({ MessageId: 'msg-123' }),
  })),
  SendEmailCommand: vi.fn().mockImplementation((input) => ({ input, _type: 'SendEmailCommand' })),
  SendRawEmailCommand: vi.fn().mockImplementation((input) => ({ input, _type: 'SendRawEmailCommand' })),
}))

// Import AFTER vi.mock so the mock is in place
import { createSesAdapter } from './ses'
import { ProviderError } from './errors'

const VALID_CONFIG = {
  accessKeyId: 'test-access-key',
  secretAccessKey: 'test-secret-key',
  region: 'us-east-1',
}

const BASE_REQUEST = {
  from: 'sender@example.com',
  to: 'recipient@example.com',
  subject: 'Test subject',
  html: '<p>Hello</p>',
  text: 'Hello',
}

beforeEach(() => {
  vi.clearAllMocks()
  // Re-prime the SESClient mock after clearAllMocks resets call records
  ;(SESClient as unknown as Mock).mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({ MessageId: 'msg-123' }),
  }))
})

/** Must be called AFTER adapter.send() so the lazy SESClient has been constructed. */
function getMockSend(): Mock {
  return (SESClient as unknown as Mock).mock.results.at(-1)?.value?.send as Mock
}

// ─── AC-2 ────────────────────────────────────────────────────────────────────

describe('createSesAdapter — shape (AC-2)', () => {
  it('returns an object with name === "ses"', () => {
    const adapter = createSesAdapter(VALID_CONFIG)
    expect(adapter.name).toBe('ses')
  })

  it('returns a callable validate function', () => {
    const adapter = createSesAdapter(VALID_CONFIG)
    expect(typeof adapter.validate).toBe('function')
  })

  it('returns a callable send function', () => {
    const adapter = createSesAdapter(VALID_CONFIG)
    expect(typeof adapter.send).toBe('function')
  })
})

// ─── AC-3 ────────────────────────────────────────────────────────────────────

describe('send() with List-Unsubscribe header (AC-3)', () => {
  it('calls SESClient.send with a SendRawEmailCommand when List-Unsubscribe is present', async () => {
    const adapter = createSesAdapter(VALID_CONFIG)

    await adapter.send({
      ...BASE_REQUEST,
      headers: { 'List-Unsubscribe': '<https://example.com/unsub>' },
    })

    // getMockSend() must be called after send() so the lazy SESClient is constructed
    const mockSend = getMockSend()
    expect(mockSend).toHaveBeenCalledOnce()
    // The first argument to mockSend should be the result of SendRawEmailCommand
    const commandArg = mockSend.mock.calls[0][0]
    expect(commandArg._type).toBe('SendRawEmailCommand')

    // text/plain must precede text/html (RFC 2046 — clients pick the last understood part)
    const mimeBody = new TextDecoder().decode(commandArg.input.RawMessage.Data as Uint8Array)
    expect(mimeBody.indexOf('text/plain')).toBeLessThan(mimeBody.indexOf('text/html'))
  })

  it('does NOT call SendEmailCommand when List-Unsubscribe is present', async () => {
    const adapter = createSesAdapter(VALID_CONFIG)

    await adapter.send({
      ...BASE_REQUEST,
      headers: { 'List-Unsubscribe': '<https://example.com/unsub>' },
    })

    expect(SendEmailCommand).not.toHaveBeenCalled()
  })
})

// ─── AC-4 ────────────────────────────────────────────────────────────────────

describe('send() standard path (AC-4)', () => {
  it('calls SESClient.send with a SendEmailCommand when no List-Unsubscribe header', async () => {
    const adapter = createSesAdapter(VALID_CONFIG)

    await adapter.send(BASE_REQUEST)

    // getMockSend() must be called after send() so the lazy SESClient is constructed
    const mockSend = getMockSend()
    expect(mockSend).toHaveBeenCalledOnce()
    const commandArg = mockSend.mock.calls[0][0]
    expect(commandArg._type).toBe('SendEmailCommand')
  })

  it('returns { success: true, messageId, provider: "ses", sentAt } on success', async () => {
    const adapter = createSesAdapter(VALID_CONFIG)
    const result = await adapter.send(BASE_REQUEST)

    expect(result.success).toBe(true)
    expect(result.messageId).toBe('msg-123')
    expect(result.provider).toBe('ses')
    expect(typeof result.sentAt).toBe('string')
    // sentAt must be a valid ISO-8601 timestamp
    expect(new Date(result.sentAt).toISOString()).toBe(result.sentAt)
  })

  it('passes Reply-To through the standard SES command', async () => {
    const adapter = createSesAdapter(VALID_CONFIG)

    await adapter.send({ ...BASE_REQUEST, replyTo: 'sender@example.com' })

    const commandArg = getMockSend().mock.calls[0][0]
    expect(commandArg.input.ReplyToAddresses).toEqual(['sender@example.com'])
  })
})

// ─── AC-5 ────────────────────────────────────────────────────────────────────

describe('send() error handling — never throws (AC-5)', () => {
  it('returns { success: false } when SES SDK throws a credential error', async () => {
    ;(SESClient as unknown as Mock).mockImplementationOnce(() => ({
      send: vi.fn().mockRejectedValue(
        Object.assign(new Error('InvalidClientTokenId'), { name: 'CredentialsProviderError' })
      ),
    }))

    const adapter = createSesAdapter(VALID_CONFIG)
    const result = await adapter.send(BASE_REQUEST)

    expect(result.success).toBe(false)
    expect(result.provider).toBe('ses')
    expect(typeof result.sentAt).toBe('string')
    expect(result.error).toBeDefined()
  })

  it('returns { success: false } when SES SDK throws an arbitrary error', async () => {
    ;(SESClient as unknown as Mock).mockImplementationOnce(() => ({
      send: vi.fn().mockRejectedValue(new Error('Network timeout')),
    }))

    const adapter = createSesAdapter(VALID_CONFIG)
    const result = await adapter.send(BASE_REQUEST)

    expect(result.success).toBe(false)
  })

  it('does not throw even when SES SDK rejects', async () => {
    ;(SESClient as unknown as Mock).mockImplementationOnce(() => ({
      send: vi.fn().mockRejectedValue(new Error('Some SDK error')),
    }))

    const adapter = createSesAdapter(VALID_CONFIG)
    await expect(adapter.send(BASE_REQUEST)).resolves.not.toThrow()
  })
})

// ─── AC-6 ────────────────────────────────────────────────────────────────────

describe('validate() — MISSING_ENV (AC-6)', () => {
  it('throws ProviderError with code MISSING_ENV when accessKeyId is absent', () => {
    const adapter = createSesAdapter({ secretAccessKey: 'sec', region: 'us-east-1' })
    expect(() => adapter.validate()).toThrow(ProviderError)
  })

  it('ProviderError.code is "MISSING_ENV" when accessKeyId is absent', () => {
    const adapter = createSesAdapter({ secretAccessKey: 'sec', region: 'us-east-1' })
    try {
      adapter.validate()
    } catch (e) {
      expect((e as ProviderError).code).toBe('MISSING_ENV')
    }
  })

  it('throws ProviderError with code MISSING_ENV when secretAccessKey is absent', () => {
    const adapter = createSesAdapter({ accessKeyId: 'key', region: 'us-east-1' })
    expect(() => adapter.validate()).toThrow(ProviderError)
  })

  it('throws ProviderError with code MISSING_ENV when region is absent', () => {
    const adapter = createSesAdapter({ accessKeyId: 'key', secretAccessKey: 'sec' })
    expect(() => adapter.validate()).toThrow(ProviderError)
  })

  it('throws ProviderError with code MISSING_ENV when all config is absent', () => {
    const adapter = createSesAdapter({})
    expect(() => adapter.validate()).toThrow(ProviderError)
  })

  it('does not throw when all three config values are supplied', () => {
    const adapter = createSesAdapter(VALID_CONFIG)
    expect(() => adapter.validate()).not.toThrow()
  })

  it('error message names the missing variable', () => {
    const adapter = createSesAdapter({ secretAccessKey: 'sec', region: 'us-east-1' })
    try {
      adapter.validate()
      expect.fail('Expected validate() to throw')
    } catch (e) {
      expect((e as ProviderError).message).toContain('SES_ACCESS_KEY_ID')
    }
  })
})
