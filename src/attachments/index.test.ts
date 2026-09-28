/**
 * Covers src/attachments/index.ts — attachment validation and MIME parts.
 */
import { describe, it, expect } from 'vitest'
import { ATTACHMENT_LIMITS, attachmentMimeParts, base64ByteLength, validateAttachments } from './index'

const PDF = Buffer.from('%PDF-1.7 invoice').toString('base64')
const invoice = { filename: 'INV-0042.pdf', contentType: 'application/pdf', content: PDF }

describe('validateAttachments', () => {
  it('accepts a PDF with a plain file name', () => {
    expect(validateAttachments([invoice])).toEqual({ ok: true, data: [invoice] })
  })

  it.each([
    ['not an array', { file: 1 }, 'attachments'],
    ['an empty list', [], 'attachments'],
    ['too many files', Array.from({ length: ATTACHMENT_LIMITS.maxCount + 1 }, () => invoice), 'attachments'],
    ['a file name with a path', [{ ...invoice, filename: '../etc/passwd' }], 'attachments[0].filename'],
    ['a file name with a header break', [{ ...invoice, filename: 'a.pdf\r\nBcc: x@y.z' }], 'attachments[0].filename'],
    ['a file name with a quote', [{ ...invoice, filename: 'a".pdf' }], 'attachments[0].filename'],
    ['an unlisted type', [{ ...invoice, contentType: 'application/x-msdownload' }], 'attachments[0].contentType'],
    ['content that is not base64', [{ ...invoice, content: 'not base64!' }], 'attachments[0].content'],
    ['empty content', [{ ...invoice, content: '' }], 'attachments[0].content'],
  ])('refuses %s', (_name, raw, field) => {
    const result = validateAttachments(raw)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.fields.map((f) => f.field)).toContain(field)
  })

  it('refuses attachments larger than the total limit', () => {
    const big = Buffer.alloc(ATTACHMENT_LIMITS.maxTotalBytes / 2 + 1).toString('base64')
    const result = validateAttachments([{ ...invoice, content: big }, { ...invoice, content: big }])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.fields).toContainEqual(expect.objectContaining({ field: 'attachments' }))
  })
})

describe('base64ByteLength', () => {
  it('matches the decoded length', () => {
    for (const text of ['a', 'ab', 'abc', 'abcd', '%PDF-1.7']) {
      expect(base64ByteLength(Buffer.from(text).toString('base64'))).toBe(text.length)
    }
  })
})

describe('attachmentMimeParts', () => {
  it('writes a base64 attachment part wrapped at 76 characters', () => {
    const long = { ...invoice, content: Buffer.alloc(300).toString('base64') }
    const parts = attachmentMimeParts([long], 'm1')
    expect(parts.slice(0, 5)).toEqual([
      '--m1',
      'Content-Type: application/pdf; name="INV-0042.pdf"',
      'Content-Transfer-Encoding: base64',
      'Content-Disposition: attachment; filename="INV-0042.pdf"',
      '',
    ])
    const body = parts.slice(5).filter(Boolean)
    expect(body.every((line) => line.length <= 76)).toBe(true)
    expect(body.join('')).toBe(long.content)
  })
})
