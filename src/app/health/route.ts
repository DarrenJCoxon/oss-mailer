import { createHealthHandler } from '@/health'

export const GET = createHealthHandler({
  env: process.env as Record<string, string | undefined>,
  apiKey: process.env.MAILER_API_KEY ?? '',
})
