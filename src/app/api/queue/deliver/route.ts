import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { createRouter } from '@/router'
import { createMailSender } from '@/sender'
import { createLogWriter } from '@/send-log'
import { createDeliverHandler } from '@/queue'

const router = createRouter()
const logWriter = createLogWriter()
const mailSender = createMailSender(router, logWriter)

export const POST = verifySignatureAppRouter(createDeliverHandler({ mailSender }))
