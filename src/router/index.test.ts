/**
 * Covers src/router/index.ts
 *
 * AC-1: router.resolve('magic_link') returns the SES adapter when MAGIC_LINK_PROVIDER=ses
 * AC-2: router.resolve('promotional') returns the SES adapter when PROMOTIONAL_PROVIDER=ses
 * AC-3: router.resolve('update') returns the SES adapter when UPDATE_PROVIDER=ses
 * AC-4: Passing an unknown category throws RouterError with code 'UNKNOWN_CATEGORY'
 * AC-5: Missing provider env var throws RouterError with code 'PROVIDER_NOT_CONFIGURED'
 *
 * Extra coverage from architect's brief:
 * - Unknown provider id throws RouterError with code 'PROVIDER_NOT_CONFIGURED' at createRouter() time
 * - isRouterError returns true for RouterError instances and false for ProviderError / plain Error
 * - Repeated resolve() calls return the same EmailProvider instance (memoisation)
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// Mock the AWS SDK so createSesAdapter() does not require real credentials at
// construction time and does not attempt any network calls.
vi.mock('@aws-sdk/client-ses', () => ({
  SESClient: vi.fn().mockImplementation(() => ({ send: vi.fn() })),
  SendEmailCommand: vi.fn(),
  SendRawEmailCommand: vi.fn(),
}))

// Import after vi.mock so the mock is in place when the module initialises.
import { createRouter, RouterError, isRouterError } from './index'
import { ProviderError } from '../providers/errors'

// ─── Env helpers ─────────────────────────────────────────────────────────────

const SES_ENV = {
  SES_ACCESS_KEY_ID: 'test-key-id',
  SES_SECRET_ACCESS_KEY: 'test-secret',
  SES_REGION: 'us-east-1',
}

const ALL_SES_ENV = {
  ...SES_ENV,
  MAGIC_LINK_PROVIDER: 'ses',
  PROMOTIONAL_PROVIDER: 'ses',
  UPDATE_PROVIDER: 'ses',
}

let savedEnv: NodeJS.ProcessEnv

beforeEach(() => {
  savedEnv = { ...process.env }
})

afterEach(() => {
  // Restore env exactly — delete keys added by tests and restore originals.
  for (const key of Object.keys(process.env)) {
    if (!(key in savedEnv)) {
      delete process.env[key]
    }
  }
  Object.assign(process.env, savedEnv)
})

function setEnv(vars: Record<string, string>): void {
  for (const [k, v] of Object.entries(vars)) {
    process.env[k] = v
  }
}

// ─── AC-1: magic_link resolves to SES adapter ─────────────────────────────

describe("router.resolve('magic_link') — AC-1", () => {
  it("returns the SES adapter when MAGIC_LINK_PROVIDER=ses", () => {
    setEnv(ALL_SES_ENV)
    const router = createRouter()
    const provider = router.resolve('magic_link')
    expect(provider.name).toBe('ses')
  })
})

// ─── AC-2: promotional resolves to SES adapter ────────────────────────────

describe("router.resolve('promotional') — AC-2", () => {
  it("returns the SES adapter when PROMOTIONAL_PROVIDER=ses", () => {
    setEnv(ALL_SES_ENV)
    const router = createRouter()
    const provider = router.resolve('promotional')
    expect(provider.name).toBe('ses')
  })
})

// ─── AC-3: update resolves to SES adapter ────────────────────────────────

describe("router.resolve('update') — AC-3", () => {
  it("returns the SES adapter when UPDATE_PROVIDER=ses", () => {
    setEnv(ALL_SES_ENV)
    const router = createRouter()
    const provider = router.resolve('update')
    expect(provider.name).toBe('ses')
  })
})

describe("router.resolve('transactional')", () => {
  it('falls back to the magic-link provider for backwards-compatible deployments', () => {
    setEnv(ALL_SES_ENV)
    delete process.env.TRANSACTIONAL_PROVIDER

    const router = createRouter()

    expect(router.resolve('transactional').name).toBe('ses')
  })

  it('uses TRANSACTIONAL_PROVIDER when configured', () => {
    setEnv({ ...ALL_SES_ENV, TRANSACTIONAL_PROVIDER: 'ses' })

    expect(createRouter().resolve('transactional').name).toBe('ses')
  })
})

// ─── AC-4: unknown category throws UNKNOWN_CATEGORY ──────────────────────

describe("unknown category — AC-4", () => {
  it("throws RouterError when an unknown category string is passed to resolve()", () => {
    setEnv(ALL_SES_ENV)
    const router = createRouter()
    // TypeScript types prevent unknown categories; cast for test purposes.
    expect(() => router.resolve('not_a_category' as never)).toThrow(RouterError)
  })

  it("thrown RouterError has code 'UNKNOWN_CATEGORY'", () => {
    setEnv(ALL_SES_ENV)
    const router = createRouter()
    try {
      router.resolve('not_a_category' as never)
      expect.fail('Expected resolve() to throw')
    } catch (e) {
      expect((e as RouterError).code).toBe('UNKNOWN_CATEGORY')
    }
  })

  it("thrown RouterError exposes the unknown category value", () => {
    setEnv(ALL_SES_ENV)
    const router = createRouter()
    try {
      router.resolve('not_a_category' as never)
      expect.fail('Expected resolve() to throw')
    } catch (e) {
      expect((e as RouterError).category).toBe('not_a_category')
    }
  })
})

// ─── AC-5: missing env var throws PROVIDER_NOT_CONFIGURED ─────────────────

describe("missing provider env var — AC-5", () => {
  it("throws RouterError when MAGIC_LINK_PROVIDER is not set", () => {
    setEnv({
      ...SES_ENV,
      PROMOTIONAL_PROVIDER: 'ses',
      UPDATE_PROVIDER: 'ses',
      // MAGIC_LINK_PROVIDER intentionally absent
    })
    // Ensure it's not inherited from the outer env
    delete process.env['MAGIC_LINK_PROVIDER']
    expect(() => createRouter()).toThrow(RouterError)
  })

  it("RouterError code is 'PROVIDER_NOT_CONFIGURED' when env var is missing", () => {
    setEnv({ ...SES_ENV, PROMOTIONAL_PROVIDER: 'ses', UPDATE_PROVIDER: 'ses' })
    delete process.env['MAGIC_LINK_PROVIDER']
    try {
      createRouter()
      expect.fail('Expected createRouter() to throw')
    } catch (e) {
      expect((e as RouterError).code).toBe('PROVIDER_NOT_CONFIGURED')
    }
  })

  it("throws at createRouter() time, not at resolve() time", () => {
    // The throw must happen before resolve() is ever called.
    setEnv({ ...SES_ENV, PROMOTIONAL_PROVIDER: 'ses', UPDATE_PROVIDER: 'ses' })
    delete process.env['MAGIC_LINK_PROVIDER']
    // If createRouter() does not throw, the test fails via expect.fail above;
    // we also verify that the error reaches us without calling resolve().
    let threw = false
    try {
      createRouter()
    } catch (e) {
      threw = true
      expect(e).toBeInstanceOf(RouterError)
    }
    expect(threw).toBe(true)
  })
})

// ─── Architect extra: unknown provider id throws at createRouter() time ───

describe("unknown provider id — architect brief", () => {
  it("throws RouterError when MAGIC_LINK_PROVIDER is set to an unknown value", () => {
    setEnv({ ...SES_ENV, MAGIC_LINK_PROVIDER: 'fakeprovider', PROMOTIONAL_PROVIDER: 'ses', UPDATE_PROVIDER: 'ses' })
    expect(() => createRouter()).toThrow(RouterError)
  })

  it("RouterError code is 'PROVIDER_NOT_CONFIGURED' for unknown provider id", () => {
    setEnv({ ...SES_ENV, MAGIC_LINK_PROVIDER: 'fakeprovider', PROMOTIONAL_PROVIDER: 'ses', UPDATE_PROVIDER: 'ses' })
    try {
      createRouter()
      expect.fail('Expected createRouter() to throw')
    } catch (e) {
      expect((e as RouterError).code).toBe('PROVIDER_NOT_CONFIGURED')
    }
  })

  it("throws at createRouter() time, not at resolve() time, for unknown provider id", () => {
    setEnv({ ...SES_ENV, MAGIC_LINK_PROVIDER: 'fakeprovider', PROMOTIONAL_PROVIDER: 'ses', UPDATE_PROVIDER: 'ses' })
    let threw = false
    try {
      createRouter()
    } catch (e) {
      threw = true
    }
    expect(threw).toBe(true)
  })
})

// ─── Architect extra: isRouterError type guard ────────────────────────────

describe("isRouterError — architect brief", () => {
  it("returns true for a RouterError instance", () => {
    const err = new RouterError({ code: 'UNKNOWN_CATEGORY', category: 'test', message: 'test' })
    expect(isRouterError(err)).toBe(true)
  })

  it("returns true for a thrown RouterError caught from createRouter()", () => {
    setEnv({ ...SES_ENV, PROMOTIONAL_PROVIDER: 'ses', UPDATE_PROVIDER: 'ses' })
    delete process.env['MAGIC_LINK_PROVIDER']
    try {
      createRouter()
      expect.fail('Expected createRouter() to throw')
    } catch (e) {
      expect(isRouterError(e)).toBe(true)
    }
  })

  it("returns false for a plain Error", () => {
    expect(isRouterError(new Error('plain error'))).toBe(false)
  })

  it("returns false for a ProviderError", () => {
    const providerErr = new ProviderError({ provider: 'ses', code: 'MISSING_ENV', message: 'test' })
    expect(isRouterError(providerErr)).toBe(false)
  })

  it("returns false for null", () => {
    expect(isRouterError(null)).toBe(false)
  })

  it("returns false for a plain object without _tag", () => {
    expect(isRouterError({ code: 'UNKNOWN_CATEGORY' })).toBe(false)
  })

  it("returns true for a plain object with _tag === 'RouterError' (duck-typing path)", () => {
    expect(isRouterError({ _tag: 'RouterError' })).toBe(true)
  })
})

// ─── Architect extra: memoisation — same instance on repeated resolve() ───

describe("memoisation — architect brief", () => {
  it("repeated resolve('magic_link') calls return the same EmailProvider instance", () => {
    setEnv(ALL_SES_ENV)
    const router = createRouter()
    const first = router.resolve('magic_link')
    const second = router.resolve('magic_link')
    expect(first).toBe(second)
  })

  it("repeated resolve('promotional') calls return the same EmailProvider instance", () => {
    setEnv(ALL_SES_ENV)
    const router = createRouter()
    const first = router.resolve('promotional')
    const second = router.resolve('promotional')
    expect(first).toBe(second)
  })

  it("repeated resolve('update') calls return the same EmailProvider instance", () => {
    setEnv(ALL_SES_ENV)
    const router = createRouter()
    const first = router.resolve('update')
    const second = router.resolve('update')
    expect(first).toBe(second)
  })
})

// ─── RouterError shape ───────────────────────────────────────────────────

describe("RouterError class", () => {
  it("is an instance of Error", () => {
    const err = new RouterError({ code: 'UNKNOWN_CATEGORY', category: 'x', message: 'msg' })
    expect(err).toBeInstanceOf(Error)
  })

  it("sets name to 'RouterError'", () => {
    const err = new RouterError({ code: 'UNKNOWN_CATEGORY', category: 'x', message: 'msg' })
    expect(err.name).toBe('RouterError')
  })

  it("exposes _tag === 'RouterError'", () => {
    const err = new RouterError({ code: 'UNKNOWN_CATEGORY', category: 'x', message: 'msg' })
    expect(err._tag).toBe('RouterError')
  })

  it("exposes readonly code and category", () => {
    const err = new RouterError({ code: 'PROVIDER_NOT_CONFIGURED', category: 'magic_link', message: 'test' })
    expect(err.code).toBe('PROVIDER_NOT_CONFIGURED')
    expect(err.category).toBe('magic_link')
  })

  it("stores optional cause", () => {
    const cause = new Error('original')
    const err = new RouterError({ code: 'UNKNOWN_CATEGORY', category: 'x', message: 'msg', cause })
    expect(err.cause).toBe(cause)
  })
})
