import React from 'react'
import { render } from '@react-email/render'
import type { EmailCategory } from '../router'
import MagicLinkEmail from '../templates/magic-link'
import PromotionalEmail from '../templates/promotional'
import UpdateEmail from '../templates/update'
import TransactionalEmail from '../templates/transactional'

export type TemplateErrorCode = 'UNKNOWN_TEMPLATE' | 'RENDER_FAILED'

export class TemplateError extends Error {
  readonly code: TemplateErrorCode
  readonly category: string
  readonly cause?: unknown
  readonly _tag = 'TemplateError' as const

  constructor(args: {
    code: TemplateErrorCode
    category: string
    message: string
    cause?: unknown
  }) {
    super(args.message)
    this.name = 'TemplateError'
    this.code = args.code
    this.category = args.category
    this.cause = args.cause
    Error.captureStackTrace?.(this, TemplateError)
  }
}

export function isTemplateError(e: unknown): e is TemplateError {
  return (
    e instanceof TemplateError ||
    (typeof e === 'object' &&
      e !== null &&
      (e as { _tag?: unknown })._tag === 'TemplateError')
  )
}

const TEMPLATES = {
  magic_link: (props: { url: string }) => <MagicLinkEmail {...props} />,
  transactional: (props: { subject: string; body: string }) => (
    <TransactionalEmail {...props} />
  ),
  promotional: (props: { subject: string; body: string; unsubscribeUrl: string }) => (
    <PromotionalEmail {...props} />
  ),
  update: (props: { subject: string; body: string; unsubscribeUrl: string }) => (
    <UpdateEmail {...props} />
  ),
} as const satisfies Record<EmailCategory, (props: never) => React.ReactElement>

export async function renderTemplate(
  category: EmailCategory,
  props?: Record<string, unknown>,
  override?: { subject?: string; html?: string },
): Promise<{ html: string; text: string }> {
  if (!(category in TEMPLATES)) {
    throw new TemplateError({
      code: 'UNKNOWN_TEMPLATE',
      category,
      message: `Unknown template for category: "${category}"`,
    })
  }

  if (
    props !== undefined &&
    typeof props === 'object' &&
    props !== null &&
    typeof (props as { html?: unknown }).html === 'string' &&
    (props as { html: string }).html.length > 0
  ) {
    return { html: (props as { html: string }).html, text: '' }
  }

  if (override?.html && override.html.length > 0) {
    return { html: override.html, text: '' }
  }

  const element = TEMPLATES[category](props as never)

  try {
    const html = await render(element)
    const text = await render(element, { plainText: true })
    return { html, text }
  } catch (caught) {
    throw new TemplateError({
      code: 'RENDER_FAILED',
      category,
      message: 'Template render failed',
      cause: caught,
    })
  }
}
