import { vi, describe, it, expect, beforeAll } from 'vitest'

vi.mock('@neondatabase/serverless', () => ({ neon: vi.fn(() => vi.fn()) }))
vi.mock('drizzle-orm/neon-http', () => ({ drizzle: vi.fn(() => ({ _tag: 'db' })) }))

describe('db', () => {
  beforeAll(() => {
    process.env.DATABASE_URL = 'postgresql://test'
  })

  it('exports a db instance', async () => {
    const { db } = await import('./index')
    expect(db).toBeDefined()
  })
})
