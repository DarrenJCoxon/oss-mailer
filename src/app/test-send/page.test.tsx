import { vi, describe, it, expect } from 'vitest'

vi.mock('./SendForm', () => ({ SendForm: () => null }))

describe('TestSendPage metadata', () => {
  it('exports metadata with correct title', async () => {
    const { metadata } = await import('./page')
    expect(metadata.title).toBe('Test send — oss-mailer')
  })

  it('exports a default page component', async () => {
    const { default: TestSendPage } = await import('./page')
    expect(typeof TestSendPage).toBe('function')
  })
})
