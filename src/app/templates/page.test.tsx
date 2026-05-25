import { vi, describe, it, expect } from 'vitest'

vi.mock('@/db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockResolvedValue([]),
    }),
  },
}))

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    `<a href="${href}" class="${className ?? ''}">${children}</a>`,
}))

import { metadata } from './page'
import TemplatesPage from './page'
import React from 'react'

describe('Templates page metadata', () => {
  it('exports a metadata object', () => {
    expect(metadata).toBeDefined()
    expect(typeof metadata).toBe('object')
  })

  it('has title "Templates — oss-mailer"', () => {
    expect(metadata.title).toBe('Templates — oss-mailer')
  })
})

describe('Templates page component', () => {
  it('exports a default async function component', () => {
    expect(typeof TemplatesPage).toBe('function')
  })
})
