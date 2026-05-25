import { vi, describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

vi.mock('@/settings', () => ({
  buildSettingsReport: () => ({
    vars: [],
    totalCount: 13,
    setCount: 13,
    missingCount: 0,
  }),
}))

import { metadata } from './page'
import SettingsPage from './page'

describe('Settings page metadata', () => {
  it('exports a metadata object', () => {
    expect(metadata).toBeDefined()
    expect(typeof metadata).toBe('object')
  })

  it('has title "Settings — oss-mailer"', () => {
    expect(metadata.title).toBe('Settings — oss-mailer')
  })

  // AC-1 / Gate B: page exports a default function (Server Component, not a client module)
  it('exports a default function component', () => {
    expect(typeof SettingsPage).toBe('function')
  })
})

// AC-7: Server Component — no 'use client' directive present
describe('Settings page is a Server Component', () => {
  it('does not contain a "use client" directive', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, 'page.tsx'),
      'utf8'
    )
    expect(source).not.toMatch(/['"]use client['"]/)
  })
})

// AC-6: "How to set these" section includes Vercel-specific and .env.local instructions
describe('Settings page "How to set these" section', () => {
  it('contains Vercel-specific instructions', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, 'page.tsx'),
      'utf8'
    )
    expect(source).toContain('Vercel')
  })

  it('contains .env.local instructions', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, 'page.tsx'),
      'utf8'
    )
    expect(source).toContain('.env.local')
  })
})
