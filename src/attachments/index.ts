/**
 * File attachments for transactional mail (for example an invoice PDF).
 *
 * Attachments travel as base64 in the JSON body of /api/send, are validated
 * here, and are written into a multipart/mixed MIME message by the provider.
 * They are allowed only for categories sent synchronously, so large payloads
 * never pass through the queue.
 */

export type MailAttachment = {
  filename: string
  contentType: string
  /** Base64-encoded file content. */
  content: string
}

export const ATTACHMENT_LIMITS = {
  maxCount: 5,
  /** Total decoded size across all attachments (SES raw messages are capped at 10 MB after encoding). */
  maxTotalBytes: 5 * 1024 * 1024,
  maxFilenameLength: 100,
} as const

export const ALLOWED_ATTACHMENT_TYPES: ReadonlySet<string> = new Set([
  'application/pdf',
  'text/csv',
  'image/png',
  'image/jpeg',
])

const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/

export type AttachmentFailure = { field: string; reason: string }

/** Decoded byte length of a base64 string (no allocation). */
export function base64ByteLength(value: string): number {
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0
  return (value.length / 4) * 3 - padding
}

function isSafeFilename(value: unknown): value is string {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= ATTACHMENT_LIMITS.maxFilenameLength
    && !/[\r\n"\\/<>:|?*\u0000-\u001f]/.test(value)
    && value.trim() === value
}

/** Validates the raw `attachments` field of a send request. */
export function validateAttachments(raw: unknown): { ok: true; data: MailAttachment[] } | { ok: false; fields: AttachmentFailure[] } {
  if (!Array.isArray(raw)) return { ok: false, fields: [{ field: 'attachments', reason: 'must be an array if provided' }] }
  if (raw.length === 0 || raw.length > ATTACHMENT_LIMITS.maxCount) {
    return { ok: false, fields: [{ field: 'attachments', reason: `must hold 1-${ATTACHMENT_LIMITS.maxCount} files` }] }
  }
  const fields: AttachmentFailure[] = []
  let totalBytes = 0
  raw.forEach((item, index) => {
    const at = `attachments[${index}]`
    const a = (typeof item === 'object' && item !== null ? item : {}) as Record<string, unknown>
    if (!isSafeFilename(a.filename)) fields.push({ field: `${at}.filename`, reason: 'must be a plain file name of 1-100 characters' })
    if (typeof a.contentType !== 'string' || !ALLOWED_ATTACHMENT_TYPES.has(a.contentType)) {
      fields.push({ field: `${at}.contentType`, reason: `must be one of ${[...ALLOWED_ATTACHMENT_TYPES].join(', ')}` })
    }
    if (typeof a.content !== 'string' || a.content.length === 0 || a.content.length % 4 !== 0 || !BASE64.test(a.content)) {
      fields.push({ field: `${at}.content`, reason: 'must be non-empty base64' })
    } else {
      totalBytes += base64ByteLength(a.content)
    }
  })
  if (totalBytes > ATTACHMENT_LIMITS.maxTotalBytes) {
    fields.push({ field: 'attachments', reason: `must total at most ${ATTACHMENT_LIMITS.maxTotalBytes} bytes` })
  }
  if (fields.length > 0) return { ok: false, fields }
  return {
    ok: true,
    data: (raw as Record<string, string>[]).map((a) => ({ filename: a.filename, contentType: a.contentType, content: a.content })),
  }
}

/** MIME body parts for the attachments, base64 wrapped at 76 characters (RFC 2045). */
export function attachmentMimeParts(attachments: readonly MailAttachment[], boundary: string): string[] {
  return attachments.flatMap((attachment) => [
    `--${boundary}`,
    `Content-Type: ${attachment.contentType}; name="${attachment.filename}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${attachment.filename}"`,
    '',
    ...(attachment.content.match(/.{1,76}/g) ?? []),
    '',
  ])
}
