/**
 * Covers src/app/templates/[category]/page.tsx and src/app/templates/[category]/TemplateEditor.tsx
 *
 * AC: GET /templates/:category renders edit form for valid categories
 * AC: Invalid category returns 404 (notFound() called)
 * AC: generateMetadata returns correct title per category
 * AC: Page is a Server Component (no "use client")
 * AC: TemplateEditor has subject input and html textarea (source check, no jsdom needed)
 * AC: Preview panel uses <iframe> with srcdoc (AC-7)
 */
import { vi, describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// Must mock before importing page module
vi.mock('@/db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn().mockReturnValue({}),
}))

vi.mock('./TemplateEditor', () => ({
  TemplateEditor: vi.fn().mockReturnValue(null),
}))

vi.mock('next/link', () => ({
  default: vi.fn().mockReturnValue(null),
}))

let notFoundCalled = false
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    notFoundCalled = true
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

import { generateMetadata } from './page'
import TemplatePage from './page'

// ─── generateMetadata ────────────────────────────────────────────────────────

describe('generateMetadata — [category] page', () => {
  it('returns correct title for magic_link', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ category: 'magic_link' }) })
    expect(meta.title).toBe('Magic link template — oss-mailer')
  })

  it('returns correct title for promotional', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ category: 'promotional' }) })
    expect(meta.title).toBe('Promotional template — oss-mailer')
  })

  it('returns correct title for update', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ category: 'update' }) })
    expect(meta.title).toBe('Update template — oss-mailer')
  })

  it('falls back to raw category string for unknown category', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ category: 'unknown_cat' }) })
    expect(meta.title).toBe('unknown_cat template — oss-mailer')
  })
})

// ─── TemplatePage component ──────────────────────────────────────────────────

describe('TemplatePage component — [category] page', () => {
  it('exports a default async function component', () => {
    expect(typeof TemplatePage).toBe('function')
  })

  it('renders without throwing for magic_link', async () => {
    await expect(
      TemplatePage({ params: Promise.resolve({ category: 'magic_link' }) })
    ).resolves.not.toThrow()
  })

  it('renders without throwing for promotional', async () => {
    await expect(
      TemplatePage({ params: Promise.resolve({ category: 'promotional' }) })
    ).resolves.not.toThrow()
  })

  it('renders without throwing for update', async () => {
    await expect(
      TemplatePage({ params: Promise.resolve({ category: 'update' }) })
    ).resolves.not.toThrow()
  })

  it('calls notFound() for an invalid category', async () => {
    notFoundCalled = false
    try {
      await TemplatePage({ params: Promise.resolve({ category: 'bad_category' }) })
    } catch {
      // notFound() throws a sentinel error — expected
    }
    expect(notFoundCalled).toBe(true)
  })

  it('does NOT call notFound() for a valid category', async () => {
    notFoundCalled = false
    await TemplatePage({ params: Promise.resolve({ category: 'update' }) })
    expect(notFoundCalled).toBe(false)
  })
})

// ─── Server Component assertion ──────────────────────────────────────────────

describe('[category] page is a Server Component', () => {
  it('does not contain a "use client" directive', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, 'page.tsx'),
      'utf8'
    )
    expect(source).not.toMatch(/['"]use client['"]/)
  })
})

// ─── TemplateEditor source inspection (node env — no jsdom) ─────────────────

describe('TemplateEditor source shape — no jsdom required', () => {
  const editorSource = fs.readFileSync(
    path.resolve(__dirname, 'TemplateEditor.tsx'),
    'utf8'
  )

  it('is a Client Component (has "use client")', () => {
    expect(editorSource).toMatch(/['"]use client['"]/)
  })

  it('has a subject text input (AC-2)', () => {
    // Verifies the form contains a subject field of type text
    expect(editorSource).toMatch(/type="text"/)
    expect(editorSource).toMatch(/id="subject"/)
  })

  it('has an html textarea (AC-2)', () => {
    expect(editorSource).toMatch(/<textarea/)
    expect(editorSource).toMatch(/id="html"/)
  })

  it('renders an iframe with srcdoc for the preview panel (AC-7)', () => {
    expect(editorSource).toMatch(/<iframe/)
    expect(editorSource).toMatch(/srcDoc=/)
  })

  it('calls saveTemplateAction on save', () => {
    expect(editorSource).toContain('saveTemplateAction')
  })

  it('calls resetTemplateAction on reset', () => {
    expect(editorSource).toContain('resetTemplateAction')
  })
})
