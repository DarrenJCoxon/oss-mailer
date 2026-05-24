/**
 * Gate B: verifies src/providers/index.ts re-exports are accessible.
 * A single import from the barrel file is sufficient for Gate B coverage.
 */
import { vi, describe, it, expect } from 'vitest'

vi.mock('@aws-sdk/client-ses', () => ({
  SESClient: vi.fn().mockImplementation(() => ({ send: vi.fn() })),
  SendEmailCommand: vi.fn(),
  SendRawEmailCommand: vi.fn(),
}))

import {
  ProviderError,
  isProviderError,
  createSesAdapter,
} from './index'

describe('providers/index.ts barrel (Gate B)', () => {
  it('re-exports ProviderError', () => {
    expect(ProviderError).toBeDefined()
    expect(typeof ProviderError).toBe('function')
  })

  it('re-exports isProviderError', () => {
    expect(typeof isProviderError).toBe('function')
  })

  it('re-exports createSesAdapter', () => {
    expect(typeof createSesAdapter).toBe('function')
  })

  it('createSesAdapter is callable via the barrel export', () => {
    const adapter = createSesAdapter({
      accessKeyId: 'k',
      secretAccessKey: 's',
      region: 'us-east-1',
    })
    expect(adapter.name).toBe('ses')
  })
})
