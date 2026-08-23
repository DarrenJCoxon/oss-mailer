import { describe, it, expect, vi } from 'vitest'
import {
  createMailerClient,
  MailerError,
  isMailerError,
  type SendMailResult,
} from './index.js'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeFetch(status: number, body: unknown): typeof fetch {
  return vi.fn().mockResolvedValue({
    status,
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  } as Response)
}

const VALID_URL = 'https://mailer.example.com'
const VALID_KEY = 'test-api-key'

const BASIC_INPUT = {
  category: 'update' as const,
  to: 'user@example.com',
  subject: 'Hello',
  props: { html: '<div>hi</div>' },
}

// ─── (a)-(d) createMailerClient construction ──────────────────────────────────

describe('createMailerClient construction', () => {
  it('(a) returns an object with a sendMail function when given valid url and apiKey', () => {
    const client = createMailerClient({ url: VALID_URL, apiKey: VALID_KEY })
    expect(typeof client.sendMail).toBe('function')
  })

  it('(b) throws MailerError with code CONFIG if url is empty', () => {
    expect(() => createMailerClient({ url: '', apiKey: VALID_KEY })).toThrow(MailerError)
    try {
      createMailerClient({ url: '', apiKey: VALID_KEY })
    } catch (e) {
      expect(isMailerError(e)).toBe(true)
      expect((e as MailerError).code).toBe('CONFIG')
    }
  })

  it('(b) throws MailerError with code CONFIG if url is undefined', () => {
    expect(() => createMailerClient({ url: undefined as unknown as string, apiKey: VALID_KEY })).toThrow(MailerError)
    try {
      createMailerClient({ url: undefined as unknown as string, apiKey: VALID_KEY })
    } catch (e) {
      expect((e as MailerError).code).toBe('CONFIG')
    }
  })

  it('(c) throws MailerError with code CONFIG if apiKey is empty', () => {
    expect(() => createMailerClient({ url: VALID_URL, apiKey: '' })).toThrow(MailerError)
    try {
      createMailerClient({ url: VALID_URL, apiKey: '' })
    } catch (e) {
      expect(isMailerError(e)).toBe(true)
      expect((e as MailerError).code).toBe('CONFIG')
    }
  })

  it('(c) throws MailerError with code CONFIG if apiKey is undefined', () => {
    expect(() => createMailerClient({ url: VALID_URL, apiKey: undefined as unknown as string })).toThrow(MailerError)
    try {
      createMailerClient({ url: VALID_URL, apiKey: undefined as unknown as string })
    } catch (e) {
      expect((e as MailerError).code).toBe('CONFIG')
    }
  })

  it('(d) normalises trailing slash: posts to /api/send without double slash', async () => {
    const mockFetch = makeFetch(200, { success: true, messageId: 'm1', provider: 'ses', sentAt: '2024-01-01T00:00:00Z' })
    const client = createMailerClient({ url: 'https://mailer.example.com/', apiKey: VALID_KEY, fetch: mockFetch })
    await client.sendMail(BASIC_INPUT)
    const calledUrl = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(calledUrl).toBe('https://mailer.example.com/api/send')
  })
})

// ─── (e)-(f) sendMail request shape ──────────────────────────────────────────

describe('sendMail request shape', () => {
  it('(e) POSTs to ${url}/api/send with correct content-type and authorization headers', async () => {
    const mockFetch = makeFetch(200, { success: true, messageId: 'm1', provider: 'ses', sentAt: '2024-01-01T00:00:00Z' })
    const client = createMailerClient({ url: VALID_URL, apiKey: VALID_KEY, fetch: mockFetch })
    await client.sendMail(BASIC_INPUT)

    const [calledUrl, calledInit] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    expect(calledUrl).toBe(`${VALID_URL}/api/send`)
    expect(calledInit.method).toBe('POST')
    expect((calledInit.headers as Record<string, string>)['content-type']).toBe('application/json')
    expect((calledInit.headers as Record<string, string>)['authorization']).toBe(`Bearer ${VALID_KEY}`)
  })

  it('(f) body is exactly JSON of { category, to, subject, props } — no extra fields', async () => {
    const mockFetch = makeFetch(200, { success: true, messageId: 'm1', provider: 'ses', sentAt: '2024-01-01T00:00:00Z' })
    const client = createMailerClient({ url: VALID_URL, apiKey: VALID_KEY, fetch: mockFetch })
    await client.sendMail(BASIC_INPUT)

    const calledInit = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit
    const parsedBody = JSON.parse(calledInit.body as string)
    expect(parsedBody).toEqual({
      category: BASIC_INPUT.category,
      to: BASIC_INPUT.to,
      subject: BASIC_INPUT.subject,
      props: BASIC_INPUT.props,
    })
    expect(Object.keys(parsedBody).sort()).toEqual(['category', 'props', 'subject', 'to'])
  })

  it('includes Reply-To for transactional messages', async () => {
    const mockFetch = makeFetch(200, { success: true, messageId: 'm1', provider: 'ses', sentAt: '2024-01-01T00:00:00Z' })
    const client = createMailerClient({ url: VALID_URL, apiKey: VALID_KEY, fetch: mockFetch })

    await client.sendMail({
      ...BASIC_INPUT,
      category: 'transactional',
      replyTo: 'sender@example.com',
    })

    const calledInit = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit
    expect(JSON.parse(calledInit.body as string).replyTo).toBe('sender@example.com')
  })

  it('adds the unsubscribe URL to queued marketing props', async () => {
    const mockFetch = makeFetch(202, { queued: true, jobId: 'job-1' })
    const client = createMailerClient({ url: VALID_URL, apiKey: VALID_KEY, fetch: mockFetch })

    await client.sendMail({
      ...BASIC_INPUT,
      category: 'promotional',
      unsubscribeUrl: 'https://example.com/unsubscribe/token',
    })

    const calledInit = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit
    expect(JSON.parse(calledInit.body as string).props).toEqual({
      ...BASIC_INPUT.props,
      unsubscribeUrl: 'https://example.com/unsubscribe/token',
    })
  })
})

// ─── (g)-(h) happy paths ─────────────────────────────────────────────────────

describe('sendMail happy paths', () => {
  it('(g) HTTP 200 with success payload resolves to { success: true, messageId, provider, sentAt }', async () => {
    const payload = { success: true, messageId: 'msg-abc', provider: 'ses', sentAt: '2024-01-01T00:00:00Z' }
    const client = createMailerClient({ url: VALID_URL, apiKey: VALID_KEY, fetch: makeFetch(200, payload) })
    const result = await client.sendMail(BASIC_INPUT)
    expect(result).toEqual(payload)
  })

  it('(h) HTTP 202 with queued payload resolves to { queued: true, jobId }', async () => {
    const payload = { queued: true, jobId: 'job-xyz' }
    const client = createMailerClient({ url: VALID_URL, apiKey: VALID_KEY, fetch: makeFetch(202, payload) })
    const result = await client.sendMail({ ...BASIC_INPUT, category: 'promotional' })
    expect(result).toEqual(payload)
  })
})

// ─── (i)-(p) error paths ──────────────────────────────────────────────────────

describe('sendMail error paths', () => {
  it('(i) HTTP 400 VALIDATION_FAILED throws MailerError with fields', async () => {
    const fields = [{ field: 'to', reason: 'must be a non-empty string' }]
    const client = createMailerClient({
      url: VALID_URL,
      apiKey: VALID_KEY,
      fetch: makeFetch(400, { error: 'VALIDATION_FAILED', fields }),
    })
    try {
      await client.sendMail(BASIC_INPUT)
      expect.fail('expected throw')
    } catch (e) {
      expect(isMailerError(e)).toBe(true)
      expect((e as MailerError).code).toBe('VALIDATION_FAILED')
      expect((e as MailerError).status).toBe(400)
      expect((e as MailerError).fields).toEqual(fields)
    }
  })

  it('(j) HTTP 400 UNKNOWN_CATEGORY throws MailerError with detail set to the category', async () => {
    const client = createMailerClient({
      url: VALID_URL,
      apiKey: VALID_KEY,
      fetch: makeFetch(400, { error: 'UNKNOWN_CATEGORY', category: 'foo' }),
    })
    try {
      await client.sendMail(BASIC_INPUT)
      expect.fail('expected throw')
    } catch (e) {
      expect((e as MailerError).code).toBe('UNKNOWN_CATEGORY')
      expect((e as MailerError).detail).toBe('foo')
    }
  })

  it('(k) HTTP 401 throws MailerError with code UNAUTHORIZED', async () => {
    const client = createMailerClient({
      url: VALID_URL,
      apiKey: VALID_KEY,
      fetch: makeFetch(401, { error: 'UNAUTHORIZED' }),
    })
    try {
      await client.sendMail(BASIC_INPUT)
      expect.fail('expected throw')
    } catch (e) {
      expect((e as MailerError).code).toBe('UNAUTHORIZED')
      expect((e as MailerError).status).toBe(401)
    }
  })

  it('(k2) HTTP 401 with non-JSON body (e.g. proxy) still throws UNAUTHORIZED', async () => {
    const client = createMailerClient({
      url: VALID_URL,
      apiKey: VALID_KEY,
      fetch: makeFetch(401, 'Unauthorized'),
    })
    try {
      await client.sendMail(BASIC_INPUT)
      expect.fail('expected throw')
    } catch (e) {
      expect((e as MailerError).code).toBe('UNAUTHORIZED')
      expect((e as MailerError).status).toBe(401)
    }
  })

  it('(l) HTTP 500 SEND_FAILED throws with code SEND_FAILED', async () => {
    const client = createMailerClient({
      url: VALID_URL,
      apiKey: VALID_KEY,
      fetch: makeFetch(500, { error: 'SEND_FAILED', detail: 'SES rejected' }),
    })
    try {
      await client.sendMail(BASIC_INPUT)
      expect.fail('expected throw')
    } catch (e) {
      expect((e as MailerError).code).toBe('SEND_FAILED')
      expect((e as MailerError).status).toBe(500)
    }
  })

  it('(m) HTTP 500 QUEUE_FAILED throws with code QUEUE_FAILED', async () => {
    const client = createMailerClient({
      url: VALID_URL,
      apiKey: VALID_KEY,
      fetch: makeFetch(500, { error: 'QUEUE_FAILED', detail: 'queue full' }),
    })
    try {
      await client.sendMail(BASIC_INPUT)
      expect.fail('expected throw')
    } catch (e) {
      expect((e as MailerError).code).toBe('QUEUE_FAILED')
      expect((e as MailerError).status).toBe(500)
    }
  })

  it('(n) HTTP 418 throws with code UNEXPECTED_RESPONSE and status 418', async () => {
    const client = createMailerClient({
      url: VALID_URL,
      apiKey: VALID_KEY,
      fetch: makeFetch(418, { message: "I'm a teapot" }),
    })
    try {
      await client.sendMail(BASIC_INPUT)
      expect.fail('expected throw')
    } catch (e) {
      expect((e as MailerError).code).toBe('UNEXPECTED_RESPONSE')
      expect((e as MailerError).status).toBe(418)
    }
  })

  it('(o) HTTP 200 with non-JSON body throws with code UNEXPECTED_RESPONSE', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      text: () => Promise.resolve('not json at all'),
    } as Response)
    const client = createMailerClient({ url: VALID_URL, apiKey: VALID_KEY, fetch: mockFetch })
    try {
      await client.sendMail(BASIC_INPUT)
      expect.fail('expected throw')
    } catch (e) {
      expect((e as MailerError).code).toBe('UNEXPECTED_RESPONSE')
    }
  })

  it('(p) HTTP 200 with JSON that matches no known shape throws UNEXPECTED_RESPONSE', async () => {
    const client = createMailerClient({
      url: VALID_URL,
      apiKey: VALID_KEY,
      fetch: makeFetch(200, { weird: 'response' }),
    })
    try {
      await client.sendMail(BASIC_INPUT)
      expect.fail('expected throw')
    } catch (e) {
      expect((e as MailerError).code).toBe('UNEXPECTED_RESPONSE')
    }
  })
})

// ─── (q) network failure ──────────────────────────────────────────────────────

describe('sendMail network failure', () => {
  it('(q) fetch rejection throws MailerError with code NETWORK and original cause', async () => {
    const originalError = new Error('DNS lookup failed')
    const mockFetch = vi.fn().mockRejectedValue(originalError)
    const client = createMailerClient({ url: VALID_URL, apiKey: VALID_KEY, fetch: mockFetch })
    try {
      await client.sendMail(BASIC_INPUT)
      expect.fail('expected throw')
    } catch (e) {
      expect(isMailerError(e)).toBe(true)
      expect((e as MailerError).code).toBe('NETWORK')
      expect((e as MailerError).cause).toBe(originalError)
    }
  })
})

// ─── (r)-(s) MailerError class ───────────────────────────────────────────────

describe('MailerError class', () => {
  it('(r) isMailerError returns true for MailerError instance', () => {
    const err = new MailerError({ code: 'CONFIG', message: 'test' })
    expect(isMailerError(err)).toBe(true)
  })

  it('(r) isMailerError returns true for plain object with _tag === MailerError', () => {
    expect(isMailerError({ _tag: 'MailerError' })).toBe(true)
  })

  it('(r) isMailerError returns false for plain Error', () => {
    expect(isMailerError(new Error('plain'))).toBe(false)
  })

  it('(r) isMailerError returns false for null', () => {
    expect(isMailerError(null)).toBe(false)
  })

  it('(s) _tag is the literal "MailerError"', () => {
    const err = new MailerError({ code: 'CONFIG', message: 'test' })
    expect(err._tag).toBe('MailerError')
  })

  it('(s) name is "MailerError"', () => {
    const err = new MailerError({ code: 'CONFIG', message: 'test' })
    expect(err.name).toBe('MailerError')
  })

  it('(s) is an instance of Error', () => {
    const err = new MailerError({ code: 'CONFIG', message: 'test' })
    expect(err).toBeInstanceOf(Error)
  })
})

// ─── (t) contract parity with the real handler ───────────────────────────────

describe('contract parity with validateSendRequest', () => {
  it('(t) a typical SendMailInput passes validateSendRequest with ok: true', async () => {
    const { validateSendRequest } = await import('../../../src/api/send/index.js')
    const input = {
      category: 'update',
      to: 'user@example.com',
      subject: 'Test subject',
      props: {
        html: '<div>hello</div>',
        unsubscribeUrl: 'https://example.com/unsubscribe/token',
      },
    }
    const result = validateSendRequest(input)
    expect(result.ok).toBe(true)
  })

  it('(t) SendMailInput without props also passes validateSendRequest', async () => {
    const { validateSendRequest } = await import('../../../src/api/send/index.js')
    const input = {
      category: 'magic_link',
      to: 'user@example.com',
      subject: 'Sign in',
    }
    const result = validateSendRequest(input)
    expect(result.ok).toBe(true)
  })
})
