export const REQUIRED_ENV_VARS = [
  'MAILER_API_KEY',
  'MAILER_FROM',
  'SES_ACCESS_KEY_ID',
  'SES_SECRET_ACCESS_KEY',
  'SES_REGION',
  'MAGIC_LINK_PROVIDER',
  'PROMOTIONAL_PROVIDER',
  'UPDATE_PROVIDER',
  'DATABASE_URL',
  'QSTASH_TOKEN',
  'QSTASH_CURRENT_SIGNING_KEY',
  'QSTASH_NEXT_SIGNING_KEY',
  'DELIVER_URL',
] as const

export type RequiredEnvKey = (typeof REQUIRED_ENV_VARS)[number]

export function validateEnv(): void {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}.\n` +
      `Copy .env.example to .env.local and fill in the values.`
    )
  }
}
