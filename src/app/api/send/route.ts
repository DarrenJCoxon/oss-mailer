import { Client } from '@upstash/qstash'
import { createRouter } from '@/router'
import { createMailSender } from '@/sender'
import { createLogWriter } from '@/send-log'
import { createQueue } from '@/queue'
import { createSendHandler } from '@/api/send'

const router = createRouter()
const logWriter = createLogWriter()
const mailSender = createMailSender(router, logWriter)
const queue = createQueue({
  publisher: new Client({ token: process.env.QSTASH_TOKEN! }),
  deliverUrl: process.env.DELIVER_URL!,
})

export const POST = createSendHandler({
  mailSender,
  queue,
  apiKey: process.env.MAILER_API_KEY!,
})
