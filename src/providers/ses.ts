import {
  SESClient,
  SendEmailCommand,
  SendRawEmailCommand,
} from '@aws-sdk/client-ses'
import type { EmailProvider, ProviderSendRequest, SendResult } from './interface'
import { ProviderError } from './errors'

export function createSesAdapter(config?: {
  accessKeyId?: string
  secretAccessKey?: string
  region?: string
}): EmailProvider {
  const resolved = {
    accessKeyId: config?.accessKeyId ?? process.env.SES_ACCESS_KEY_ID,
    secretAccessKey: config?.secretAccessKey ?? process.env.SES_SECRET_ACCESS_KEY,
    region: config?.region ?? process.env.SES_REGION,
  }

  let client: SESClient | null = null

  const getClient = (): SESClient => {
    if (!client) {
      client = new SESClient({
        region: resolved.region!,
        credentials: {
          accessKeyId: resolved.accessKeyId!,
          secretAccessKey: resolved.secretAccessKey!,
        },
      })
    }
    return client
  }

  function validate(): void {
    const missing: string[] = []
    if (!resolved.accessKeyId) missing.push('SES_ACCESS_KEY_ID')
    if (!resolved.secretAccessKey) missing.push('SES_SECRET_ACCESS_KEY')
    if (!resolved.region) missing.push('SES_REGION')
    if (missing.length > 0) {
      throw new ProviderError({
        provider: 'ses',
        code: 'MISSING_ENV',
        message: `Missing SES env var(s): ${missing.join(', ')}`,
      })
    }
  }

  async function send(req: ProviderSendRequest): Promise<SendResult> {
    try {
      const sentAt = new Date().toISOString()
      const listUnsubscribe = req.headers?.['List-Unsubscribe']

      if (listUnsubscribe) {
        const mime = [
          `From: ${req.from}`,
          `To: ${req.to}`,
          `Subject: ${req.subject}`,
          'MIME-Version: 1.0',
          `List-Unsubscribe: ${listUnsubscribe}`,
          'List-Unsubscribe-Post: List-Unsubscribe=One-Click',
          'Content-Type: multipart/alternative; boundary="b1"',
          '',
          '--b1',
          'Content-Type: text/plain; charset=UTF-8',
          '',
          req.text,
          '',
          '--b1',
          'Content-Type: text/html; charset=UTF-8',
          '',
          req.html,
          '',
          '--b1--',
        ].join('\r\n')

        const encoded = new TextEncoder().encode(mime)
        const response = await getClient().send(
          new SendRawEmailCommand({ RawMessage: { Data: encoded } })
        )
        return {
          success: true,
          messageId: response.MessageId ?? '',
          provider: 'ses',
          sentAt,
        }
      }

      const response = await getClient().send(
        new SendEmailCommand({
          Destination: { ToAddresses: [req.to] },
          Message: {
            Subject: { Data: req.subject },
            Body: {
              Html: { Data: req.html },
              Text: { Data: req.text },
            },
          },
          Source: req.from,
        })
      )
      return {
        success: true,
        messageId: response.MessageId ?? '',
        provider: 'ses',
        sentAt,
      }
    } catch (unknown_err) {
      const sentAt = new Date().toISOString()
      const e = unknown_err as Record<string, unknown>
      let error: string

      if (
        e?.name === 'CredentialsProviderError' ||
        String(e?.message).includes('InvalidClientTokenId') ||
        String(e?.message).includes('SignatureDoesNotMatch')
      ) {
        error = `SES auth failure: ${String(e?.message ?? unknown_err)}`
      } else if (
        e?.name === 'MessageRejected' &&
        String(e?.message).includes('not verified')
      ) {
        error = String(e.message)
      } else {
        error = String(unknown_err)
      }

      return { success: false, error, provider: 'ses', sentAt }
    }
  }

  return { name: 'ses', validate, send }
}
