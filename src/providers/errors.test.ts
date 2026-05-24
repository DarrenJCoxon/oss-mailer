/**
 * Covers src/providers/errors.ts
 * - ProviderError constructor
 * - isProviderError type guard
 * Also satisfies Gate B for errors.ts.
 */
import { describe, it, expect } from 'vitest'
import { ProviderError, isProviderError } from './errors'

describe('ProviderError (errors.ts)', () => {
  it('is an instance of Error', () => {
    const err = new ProviderError({
      provider: 'ses',
      code: 'MISSING_ENV',
      message: 'Missing SES env var(s): SES_REGION',
    })
    expect(err).toBeInstanceOf(Error)
  })

  it('sets name to "ProviderError"', () => {
    const err = new ProviderError({
      provider: 'ses',
      code: 'MISSING_ENV',
      message: 'test',
    })
    expect(err.name).toBe('ProviderError')
  })

  it('exposes provider, code, and message', () => {
    const err = new ProviderError({
      provider: 'ses',
      code: 'AUTH_FAILED',
      message: 'Bad credentials',
      cause: new Error('original'),
    })
    expect(err.provider).toBe('ses')
    expect(err.code).toBe('AUTH_FAILED')
    expect(err.message).toBe('Bad credentials')
    expect(err.cause).toBeInstanceOf(Error)
  })

  it('exposes _tag === "ProviderError"', () => {
    const err = new ProviderError({ provider: 'ses', code: 'MISSING_ENV', message: 'x' })
    expect(err._tag).toBe('ProviderError')
  })

  it('supports all valid error codes', () => {
    const codes = ['MISSING_ENV', 'AUTH_FAILED', 'RECIPIENT_NOT_VERIFIED'] as const
    for (const code of codes) {
      const err = new ProviderError({ provider: 'ses', code, message: 'test' })
      expect(err.code).toBe(code)
    }
  })
})

describe('isProviderError (errors.ts)', () => {
  it('returns true for a ProviderError instance', () => {
    const err = new ProviderError({ provider: 'ses', code: 'MISSING_ENV', message: 'x' })
    expect(isProviderError(err)).toBe(true)
  })

  it('returns false for a plain Error', () => {
    expect(isProviderError(new Error('plain'))).toBe(false)
  })

  it('returns false for a string', () => {
    expect(isProviderError('not an error')).toBe(false)
  })

  it('returns false for null', () => {
    expect(isProviderError(null)).toBe(false)
  })

  it('returns true for a plain object with _tag === "ProviderError" (duck-typing path)', () => {
    const fakeProviderError = { _tag: 'ProviderError' }
    expect(isProviderError(fakeProviderError)).toBe(true)
  })

  it('returns false for a plain object without the _tag', () => {
    expect(isProviderError({ code: 'MISSING_ENV' })).toBe(false)
  })
})
