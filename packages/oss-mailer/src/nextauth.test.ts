import { describe, it, expect, vi } from 'vitest'
import { MailerEmailProvider } from './nextauth.js'
import { MailerError, isMailerError } from './index.js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeFetch(status: number, body: unknown): typeof fetch {
  return vi.fn().mockResolvedValue({
    status,
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  } as Response)
}

const SUCCESS_PAYLOAD = { success: true, messageId: 'm1', provider: 'ses', sentAt: '2024-01-01T00:00:00Z' }

const BASE_CONFIG = {
  mailerUrl: 'https://mailer.example.com',
  apiKey: 'test-api-key',
  from: 'noreply@example.com',
}

function makeParams(overrides: Partial<{ identifier: string; url: string }> = {}) {
  return {
    identifier: overrides.identifier ?? 'user@example.com',
    url: overrides.url ?? 'https://app.example.com/auth/verify?token=abc',
    expires: new Date(Date.now() + 86400000),
    provider: { from: BASE_CONFIG.from },
    token: 'abc123',
    request: new Request('https://app.example.com'),
  }
}

// ─── (a) shape of returned provider object ────────────────────────────────────

describe('MailerEmailProvider shape', () => {
  it('(a) returns object with required NextAuth email provider fields', () => {
    const provider = MailerEmailProvider(BASE_CONFIG)
    expect(provider.id).toBe('mailer')
    expect(provider.type).toBe('email')
    expect(provider.name).toBe('Mailer')
    expect(provider.from).toBe(BASE_CONFIG.from)
    expect(provider.maxAge).toBe(86400)
    expect(typeof provider.sendVerificationRequest).toBe('function')
    expect(provider.options).toMatchObject(BASE_CONFIG)
  })
})

// ─── (b) validation ───────────────────────────────────────────────────────────

describe('MailerEmailProvider validation', () => {
  it('(b) throws MailerError with code CONFIG if mailerUrl is missing', () => {
    expect(() =>
      MailerEmailProvider({ ...BASE_CONFIG, mailerUrl: '' })
    ).toThrow(MailerError)
    try {
      MailerEmailProvider({ ...BASE_CONFIG, mailerUrl: '' })
    } catch (e) {
      expect((e as MailerError).code).toBe('CONFIG')
    }
  })

  it('(b) throws MailerError with code CONFIG if apiKey is missing', () => {
    expect(() =>
      MailerEmailProvider({ ...BASE_CONFIG, apiKey: '' })
    ).toThrow(MailerError)
    try {
      MailerEmailProvider({ ...BASE_CONFIG, apiKey: '' })
    } catch (e) {
      expect((e as MailerError).code).toBe('CONFIG')
    }
  })

  it('(b) throws MailerError with code CONFIG if from is missing', () => {
    expect(() =>
      MailerEmailProvider({ ...BASE_CONFIG, from: '' })
    ).toThrow(MailerError)
    try {
      MailerEmailProvider({ ...BASE_CONFIG, from: '' })
    } catch (e) {
      expect((e as MailerError).code).toBe('CONFIG')
    }
  })
})

// ─── (c) sendVerificationRequest POSTs correctly ─────────────────────────────

describe('sendVerificationRequest request shape', () => {
  it('(c) POSTs to ${mailerUrl}/api/send with correct headers and body', async () => {
    const mockFetch = makeFetch(200, SUCCESS_PAYLOAD)
    const provider = MailerEmailProvider({ ...BASE_CONFIG, fetch: mockFetch })
    const params = makeParams()

    await provider.sendVerificationRequest(params)

    const [calledUrl, calledInit] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    expect(calledUrl).toBe(`${BASE_CONFIG.mailerUrl}/api/send`)
    expect((calledInit.headers as Record<string, string>)['authorization']).toBe(`Bearer ${BASE_CONFIG.apiKey}`)

    const body = JSON.parse(calledInit.body as string)
    expect(body).toEqual({
      category: 'magic_link',
      to: params.identifier,
      subject: 'Sign in to your account',
      props: { url: params.url },
    })
  })
})

// ─── (d) default subject uses appName ────────────────────────────────────────

describe('subject line', () => {
  it('(d) default subject uses appName when supplied', async () => {
    const mockFetch = makeFetch(200, SUCCESS_PAYLOAD)
    const provider = MailerEmailProvider({ ...BASE_CONFIG, appName: 'Acme', fetch: mockFetch })
    await provider.sendVerificationRequest(makeParams())

    const calledInit = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit
    const body = JSON.parse(calledInit.body as string)
    expect(body.subject).toBe('Sign in to Acme')
  })

  it('(e) custom subject override is called with params and its return value is used', async () => {
    const mockFetch = makeFetch(200, SUCCESS_PAYLOAD)
    const customSubject = vi.fn().mockReturnValue('Custom magic link')
    const provider = MailerEmailProvider({ ...BASE_CONFIG, subject: customSubject, fetch: mockFetch })
    const params = makeParams()

    await provider.sendVerificationRequest(params)

    expect(customSubject).toHaveBeenCalledWith(params)
    const calledInit = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit
    const body = JSON.parse(calledInit.body as string)
    expect(body.subject).toBe('Custom magic link')
  })
})

// ─── (f) error propagation ────────────────────────────────────────────────────

describe('sendVerificationRequest error propagation', () => {
  it('(f) propagates MailerError when mailer returns 401 — does not swallow', async () => {
    const mockFetch = makeFetch(401, { error: 'UNAUTHORIZED' })
    const provider = MailerEmailProvider({ ...BASE_CONFIG, fetch: mockFetch })

    try {
      await provider.sendVerificationRequest(makeParams())
      expect.fail('expected throw')
    } catch (e) {
      expect(isMailerError(e)).toBe(true)
      expect((e as MailerError).code).toBe('UNAUTHORIZED')
    }
  })
})

// ─── (g) resolves undefined on success ───────────────────────────────────────

describe('sendVerificationRequest return value', () => {
  it('(g) resolves with undefined on success (HTTP 200)', async () => {
    const provider = MailerEmailProvider({ ...BASE_CONFIG, fetch: makeFetch(200, SUCCESS_PAYLOAD) })
    const result = await provider.sendVerificationRequest(makeParams())
    expect(result).toBeUndefined()
  })
})

// ─── (h) no next-auth import in nextauth.ts ──────────────────────────────────

describe('no next-auth import in implementation', () => {
  it("(h) nextauth.ts source does not contain \"from 'next-auth'\"", () => {
    const srcPath = resolve(__dirname, 'nextauth.ts')
    const src = readFileSync(srcPath, 'utf8')
    expect(src).not.toContain("from 'next-auth'")
    expect(src).not.toContain('from "next-auth"')
  })
})
