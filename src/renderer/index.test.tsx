/**
 * Covers src/renderer/index.tsx
 *
 * AC-1: renderTemplate('magic_link', { url }) resolves with { html, text } —
 *       html non-empty and contains the URL, text non-empty.
 * AC-2: renderTemplate('promotional', { subject, body, unsubscribeUrl }) resolves with
 *       { html, text } — html contains unsubscribeUrl as an href attribute.
 * AC-3: renderTemplate('update', { subject, body, unsubscribeUrl }) — same checks as AC-2.
 * AC-4: All three templates include preheader text in the rendered HTML.
 * AC-5: Unknown category throws TemplateError with code 'UNKNOWN_TEMPLATE'.
 * AC-6: No rendered HTML contains <img, <script, or <link rel="stylesheet".
 * AC-7: Implicit — vitest exits 0 if all the above pass.
 *
 * Extra coverage from architect's brief:
 * - isTemplateError returns true for TemplateError instances, false for RouterError
 *   instances and plain Error instances.
 * - Both html and text are non-empty strings for all three categories (text !== html).
 */
import { describe, it, expect } from 'vitest'
import {
  renderTemplate,
  TemplateError,
  isTemplateError,
} from './index'
import { RouterError } from '../router'

// ─── Shared test fixtures ─────────────────────────────────────────────────────

const MAGIC_LINK_PROPS = { url: 'https://example.com' }

const PROMOTIONAL_PROPS = {
  subject: 'Hello',
  body: 'World',
  unsubscribeUrl: 'https://example.com/unsub',
}

const UPDATE_PROPS = {
  subject: 'Hello',
  body: 'World',
  unsubscribeUrl: 'https://example.com/unsub',
}

// ─── AC-1: magic_link renders { html, text } ─────────────────────────────────

describe("renderTemplate('magic_link') — AC-1", () => {
  it('resolves with a non-empty html string', async () => {
    const { html } = await renderTemplate('magic_link', MAGIC_LINK_PROPS)
    expect(typeof html).toBe('string')
    expect(html.length).toBeGreaterThan(0)
  })

  it('html contains the provided URL', async () => {
    const { html } = await renderTemplate('magic_link', MAGIC_LINK_PROPS)
    expect(html).toContain('https://example.com')
  })

  it('resolves with a non-empty text string', async () => {
    const { text } = await renderTemplate('magic_link', MAGIC_LINK_PROPS)
    expect(typeof text).toBe('string')
    expect(text.length).toBeGreaterThan(0)
  })

  it('text and html are different strings', async () => {
    const { html, text } = await renderTemplate('magic_link', MAGIC_LINK_PROPS)
    expect(text).not.toBe(html)
  })
})

// ─── AC-2: promotional renders { html, text } with unsubscribe link ───────────

describe("renderTemplate('promotional') — AC-2", () => {
  it('resolves with a non-empty html string', async () => {
    const { html } = await renderTemplate('promotional', PROMOTIONAL_PROPS)
    expect(typeof html).toBe('string')
    expect(html.length).toBeGreaterThan(0)
  })

  it('html contains unsubscribeUrl as an href attribute', async () => {
    const { html } = await renderTemplate('promotional', PROMOTIONAL_PROPS)
    expect(html).toContain('href="https://example.com/unsub"')
  })

  it('resolves with a non-empty text string', async () => {
    const { text } = await renderTemplate('promotional', PROMOTIONAL_PROPS)
    expect(typeof text).toBe('string')
    expect(text.length).toBeGreaterThan(0)
  })

  it('text and html are different strings', async () => {
    const { html, text } = await renderTemplate('promotional', PROMOTIONAL_PROPS)
    expect(text).not.toBe(html)
  })
})

// ─── AC-3: update renders { html, text } with unsubscribe link ────────────────

describe("renderTemplate('update') — AC-3", () => {
  it('resolves with a non-empty html string', async () => {
    const { html } = await renderTemplate('update', UPDATE_PROPS)
    expect(typeof html).toBe('string')
    expect(html.length).toBeGreaterThan(0)
  })

  it('html contains unsubscribeUrl as an href attribute', async () => {
    const { html } = await renderTemplate('update', UPDATE_PROPS)
    expect(html).toContain('href="https://example.com/unsub"')
  })

  it('resolves with a non-empty text string', async () => {
    const { text } = await renderTemplate('update', UPDATE_PROPS)
    expect(typeof text).toBe('string')
    expect(text.length).toBeGreaterThan(0)
  })

  it('text and html are different strings', async () => {
    const { html, text } = await renderTemplate('update', UPDATE_PROPS)
    expect(text).not.toBe(html)
  })
})

// ─── AC-4: All three templates include preheader text in the HTML ─────────────

describe('preheader text in rendered HTML — AC-4', () => {
  it("magic_link html contains the preheader string", async () => {
    const { html } = await renderTemplate('magic_link', MAGIC_LINK_PROPS)
    // The <Preview> component renders the preview string into the HTML body.
    expect(html).toContain('Your magic link')
    expect(html).toContain('click to sign in')
  })

  it("promotional html contains a Preview wrapper element", async () => {
    const UNIQUE_PREVIEW = 'Promotional preview unique sentinel'
    const { html } = await renderTemplate('promotional', {
      subject: UNIQUE_PREVIEW,
      body: 'World',
      unsubscribeUrl: 'https://example.com/unsub',
    })
    // React Email's <Preview> renders as a hidden div with max-height:0.
    // Assert both the CSS sentinel and the preview text to prove the Preview element is present,
    // not just that the subject string appears in the body heading.
    expect(html).toContain('max-height:0')
    expect(html).toContain(UNIQUE_PREVIEW)
  })

  it("update html contains a Preview wrapper element", async () => {
    const UNIQUE_PREVIEW = 'Update preview unique sentinel'
    const { html } = await renderTemplate('update', {
      subject: UNIQUE_PREVIEW,
      body: 'World',
      unsubscribeUrl: 'https://example.com/unsub',
    })
    expect(html).toContain('max-height:0')
    expect(html).toContain(UNIQUE_PREVIEW)
  })
})

// ─── AC-5: Unknown category throws TemplateError with code UNKNOWN_TEMPLATE ───

describe('unknown category — AC-5', () => {
  it('rejects with a TemplateError for an unknown category string', async () => {
    await expect(
      renderTemplate('unknown' as never, {})
    ).rejects.toThrow(TemplateError)
  })

  it("TemplateError has code 'UNKNOWN_TEMPLATE'", async () => {
    try {
      await renderTemplate('unknown' as never, {})
      expect.fail('Expected renderTemplate to throw')
    } catch (e) {
      expect(isTemplateError(e)).toBe(true)
      expect((e as TemplateError).code).toBe('UNKNOWN_TEMPLATE')
    }
  })

  it('TemplateError exposes the unknown category value', async () => {
    try {
      await renderTemplate('unknown' as never, {})
      expect.fail('Expected renderTemplate to throw')
    } catch (e) {
      expect((e as TemplateError).category).toBe('unknown')
    }
  })
})

// ─── AC-6: Rendered HTML contains no <img, <script, or external CSS ──────────

describe('rendered HTML is free of images, scripts, and external CSS — AC-6', () => {
  it("magic_link html does not contain <img", async () => {
    const { html } = await renderTemplate('magic_link', MAGIC_LINK_PROPS)
    expect(html).not.toMatch(/<img/i)
  })

  it("magic_link html does not contain <script", async () => {
    const { html } = await renderTemplate('magic_link', MAGIC_LINK_PROPS)
    expect(html).not.toMatch(/<script/i)
  })

  it('magic_link html does not contain link rel="stylesheet"', async () => {
    const { html } = await renderTemplate('magic_link', MAGIC_LINK_PROPS)
    expect(html).not.toMatch(/rel="stylesheet"/i)
  })

  it("promotional html does not contain <img", async () => {
    const { html } = await renderTemplate('promotional', PROMOTIONAL_PROPS)
    expect(html).not.toMatch(/<img/i)
  })

  it("promotional html does not contain <script", async () => {
    const { html } = await renderTemplate('promotional', PROMOTIONAL_PROPS)
    expect(html).not.toMatch(/<script/i)
  })

  it('promotional html does not contain link rel="stylesheet"', async () => {
    const { html } = await renderTemplate('promotional', PROMOTIONAL_PROPS)
    expect(html).not.toMatch(/rel="stylesheet"/i)
  })

  it("update html does not contain <img", async () => {
    const { html } = await renderTemplate('update', UPDATE_PROPS)
    expect(html).not.toMatch(/<img/i)
  })

  it("update html does not contain <script", async () => {
    const { html } = await renderTemplate('update', UPDATE_PROPS)
    expect(html).not.toMatch(/<script/i)
  })

  it('update html does not contain link rel="stylesheet"', async () => {
    const { html } = await renderTemplate('update', UPDATE_PROPS)
    expect(html).not.toMatch(/rel="stylesheet"/i)
  })
})

// ─── Architect extra: isTemplateError type guard ─────────────────────────────

describe('isTemplateError — architect brief', () => {
  it('returns true for a TemplateError instance', () => {
    const err = new TemplateError({ code: 'UNKNOWN_TEMPLATE', category: 'test', message: 'test' })
    expect(isTemplateError(err)).toBe(true)
  })

  it('returns true for a thrown TemplateError caught from renderTemplate()', async () => {
    try {
      await renderTemplate('unknown' as never, {})
      expect.fail('Expected renderTemplate to throw')
    } catch (e) {
      expect(isTemplateError(e)).toBe(true)
    }
  })

  it('returns false for a plain Error', () => {
    expect(isTemplateError(new Error('plain error'))).toBe(false)
  })

  it('returns false for a RouterError', () => {
    const routerErr = new RouterError({ code: 'UNKNOWN_CATEGORY', category: 'magic_link', message: 'test' })
    expect(isTemplateError(routerErr)).toBe(false)
  })

  it('returns false for null', () => {
    expect(isTemplateError(null)).toBe(false)
  })

  it('returns false for a plain object without _tag', () => {
    expect(isTemplateError({ code: 'UNKNOWN_TEMPLATE' })).toBe(false)
  })

  it("returns true for a plain object with _tag === 'TemplateError' (duck-typing path)", () => {
    expect(isTemplateError({ _tag: 'TemplateError' })).toBe(true)
  })
})

// ─── TemplateError class shape ────────────────────────────────────────────────

describe('TemplateError class', () => {
  it('is an instance of Error', () => {
    const err = new TemplateError({ code: 'UNKNOWN_TEMPLATE', category: 'x', message: 'msg' })
    expect(err).toBeInstanceOf(Error)
  })

  it("sets name to 'TemplateError'", () => {
    const err = new TemplateError({ code: 'UNKNOWN_TEMPLATE', category: 'x', message: 'msg' })
    expect(err.name).toBe('TemplateError')
  })

  it("exposes _tag === 'TemplateError'", () => {
    const err = new TemplateError({ code: 'UNKNOWN_TEMPLATE', category: 'x', message: 'msg' })
    expect(err._tag).toBe('TemplateError')
  })

  it('exposes readonly code and category', () => {
    const err = new TemplateError({ code: 'RENDER_FAILED', category: 'magic_link', message: 'test' })
    expect(err.code).toBe('RENDER_FAILED')
    expect(err.category).toBe('magic_link')
  })

  it('stores optional cause', () => {
    const cause = new Error('original')
    const err = new TemplateError({ code: 'RENDER_FAILED', category: 'x', message: 'msg', cause })
    expect(err.cause).toBe(cause)
  })

  it('is a distinct class from RouterError', () => {
    const err = new TemplateError({ code: 'UNKNOWN_TEMPLATE', category: 'x', message: 'msg' })
    expect(err).not.toBeInstanceOf(RouterError)
  })
})

// ─── override parameter — WU-016 ─────────────────────────────────────────────

describe('renderTemplate override parameter — WU-016', () => {
  it('returns override.html when provided and non-empty', async () => {
    const result = await renderTemplate('magic_link', undefined, { html: '<p>Override</p>' })
    expect(result).toEqual({ html: '<p>Override</p>', text: '' })
  })

  it('override.html takes precedence over built-in template', async () => {
    const result = await renderTemplate('promotional', { subject: 'S', body: 'B', unsubscribeUrl: 'https://x.com' }, { html: '<p>Custom</p>' })
    expect(result.html).toBe('<p>Custom</p>')
    expect(result.text).toBe('')
  })

  it('props.html takes precedence over override.html', async () => {
    const result = await renderTemplate('update', { html: '<p>Props</p>' }, { html: '<p>Override</p>' })
    expect(result).toEqual({ html: '<p>Props</p>', text: '' })
  })

  it('falls through to built-in template when override has no html', async () => {
    const result = await renderTemplate('magic_link', { url: 'https://example.com' }, { subject: 'Sub only' })
    expect(result.html.length).toBeGreaterThan(0)
    expect(result.html).toContain('https://example.com')
  })

  it('empty override.html falls through to built-in template', async () => {
    const result = await renderTemplate('magic_link', { url: 'https://example.com' }, { html: '' })
    expect(result.html).toContain('https://example.com')
  })

  it('undefined override has no effect', async () => {
    const result = await renderTemplate('magic_link', { url: 'https://example.com' }, undefined)
    expect(result.html).toContain('https://example.com')
  })
})

// ─── props.html passthrough — D013 ───────────────────────────────────────────

describe('renderTemplate props.html passthrough — D013', () => {
  it('(a) update with props.html returns { html: <as-provided>, text: "" }', async () => {
    const result = await renderTemplate('update', { html: '<div>hi</div>' })
    expect(result).toEqual({ html: '<div>hi</div>', text: '' })
  })

  it('(b) promotional with props.html returns the HTML as-is (no react-email wrapper)', async () => {
    const result = await renderTemplate('promotional', { html: '<p>x</p>' })
    expect(result).toEqual({ html: '<p>x</p>', text: '' })
  })

  it('(c) magic_link with props.html returns the HTML as-is', async () => {
    const result = await renderTemplate('magic_link', { html: '<a>signin</a>' })
    expect(result).toEqual({ html: '<a>signin</a>', text: '' })
  })

  it('(d) empty string html falls back to template rendering and throws RENDER_FAILED', async () => {
    await expect(
      renderTemplate('update', { html: '' })
    ).rejects.toMatchObject({ code: 'RENDER_FAILED' })
  })

  it('(e) non-string html falls back to template rendering and throws RENDER_FAILED', async () => {
    await expect(
      renderTemplate('update', { html: 123 as unknown as string })
    ).rejects.toMatchObject({ code: 'RENDER_FAILED' })
  })

  it('(f) unknown category with props.html still throws UNKNOWN_TEMPLATE', async () => {
    await expect(
      renderTemplate('unknown' as never, { html: '<div>x</div>' })
    ).rejects.toMatchObject({ code: 'UNKNOWN_TEMPLATE' })
  })
})
