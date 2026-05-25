import { vi, describe, it, expect } from 'vitest'

vi.mock('@neondatabase/serverless', () => ({ neon: vi.fn(() => vi.fn()) }))
vi.mock('drizzle-orm/neon-http', () => ({ drizzle: vi.fn(() => ({})) }))
vi.mock('@/send-log', () => ({ getRecentSends: vi.fn(async () => []) }))

describe('Home', () => {
  it('exports a default function', async () => {
    const { default: Home } = await import('./page')
    expect(typeof Home).toBe('function')
  })
})
