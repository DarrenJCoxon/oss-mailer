'use server'

import { Client } from '@upstash/qstash'
import { createRouter } from '@/router'
import { createMailSender } from '@/sender'
import { createLogWriter } from '@/send-log'
import { createQueue } from '@/queue'
import { createSendHandler } from '@/api/send'
import { mapApiResponseToResult, type SendApiResponse } from '@/test-send'

export type ActionState =
  | { phase: 'idle' }
  | { phase: 'result'; result: SendApiResponse; submittedTo: string }

const router = createRouter()
const logWriter = createLogWriter()
const mailSender = createMailSender(router, logWriter)
const queue = createQueue({
  publisher: new Client({ token: process.env.QSTASH_TOKEN! }),
  deliverUrl: process.env.DELIVER_URL!,
})

const handler = createSendHandler({
  mailSender,
  queue,
  apiKey: process.env.MAILER_API_KEY!,
})

export async function sendTestEmail(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const category = String(formData.get('category') ?? '')
  const to = String(formData.get('to') ?? '').trim()
  const subject = String(formData.get('subject') ?? '').trim()

  const req = new Request('http://internal/api/send', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.MAILER_API_KEY ?? ''}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ category, to, subject }),
  })

  let res: Response
  try {
    res = await handler(req)
  } catch (cause) {
    return {
      phase: 'result',
      submittedTo: to,
      result: {
        kind: 'error',
        code: 'NETWORK',
        detail: cause instanceof Error ? cause.message : 'Handler threw an unexpected error.',
      },
    }
  }

  let body: unknown
  try {
    body = await res.json()
  } catch {
    body = null
  }

  return {
    phase: 'result',
    submittedTo: to,
    result: mapApiResponseToResult(res.status, body),
  }
}
