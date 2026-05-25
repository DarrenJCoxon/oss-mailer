import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// Control which vars are "required" by mocking the module.
// This top-level mock is hoisted before any imports.
vi.mock('@/lib/env', () => ({
  REQUIRED_ENV_VARS: ['VAR_A', 'VAR_B', 'VAR_C'],
}))

// next/link is a React component — provide a minimal mock so the
// node environment does not need a full React renderer or jsdom.
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: unknown }) => ({
    type: 'a',
    props: { href, children },
  }),
}))

import { FirstRunBanner } from './FirstRunBanner'

const VARS = ['VAR_A', 'VAR_B', 'VAR_C'] as const

describe('FirstRunBanner', () => {
  beforeEach(() => {
    VARS.forEach((v) => delete process.env[v])
  })

  afterEach(() => {
    VARS.forEach((v) => delete process.env[v])
  })

  // AC-4: returns null when all required vars are present
  it('returns null when all required env vars are present', () => {
    VARS.forEach((v) => { process.env[v] = 'set' })
    const result = FirstRunBanner()
    expect(result).toBeNull()
  })

  // AC-5: returns non-null with a count when vars are missing
  it('returns non-null when at least one required env var is missing', () => {
    process.env.VAR_A = 'set'
    // VAR_B and VAR_C are absent
    const result = FirstRunBanner()
    expect(result).not.toBeNull()
  })

  it('includes the missing-variable count in the message (2 missing)', () => {
    process.env.VAR_A = 'set'
    // VAR_B, VAR_C absent → 2 missing
    const result = FirstRunBanner() as React.ReactElement
    const serialised = JSON.stringify(result)
    expect(serialised).toContain('2 environment variables are not configured.')
  })

  it('uses singular grammar when exactly 1 variable is missing', () => {
    process.env.VAR_A = 'set'
    process.env.VAR_B = 'set'
    // VAR_C absent → 1 missing
    const result = FirstRunBanner() as React.ReactElement
    const serialised = JSON.stringify(result)
    expect(serialised).toContain('1 environment variable is not configured.')
  })

  it('reports the full count when all three vars are absent', () => {
    // No vars set
    const result = FirstRunBanner() as React.ReactElement
    const serialised = JSON.stringify(result)
    expect(serialised).toContain('3 environment variables are not configured.')
  })

  // AC-6: thrown errors from the env check produce a "Could not check" message.
  // We simulate the throw by replacing the mocked REQUIRED_ENV_VARS with a
  // getter that throws, then calling the component directly. Because the
  // component accesses REQUIRED_ENV_VARS inside a try/catch at call time,
  // patching the module export before calling is sufficient.
  it('returns a "Could not check" message when REQUIRED_ENV_VARS access throws', async () => {
    const envModule = await import('@/lib/env')

    // Replace with a getter that throws
    Object.defineProperty(envModule, 'REQUIRED_ENV_VARS', {
      configurable: true,
      get() {
        throw new Error('simulated read failure')
      },
    })

    try {
      const result = FirstRunBanner() as React.ReactElement
      const serialised = JSON.stringify(result)
      expect(serialised).toContain('Could not check configuration.')
    } finally {
      // Restore to a plain array so subsequent tests are unaffected
      Object.defineProperty(envModule, 'REQUIRED_ENV_VARS', {
        configurable: true,
        value: ['VAR_A', 'VAR_B', 'VAR_C'],
        writable: true,
      })
    }
  })
})
