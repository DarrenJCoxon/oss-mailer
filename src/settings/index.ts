import { REQUIRED_ENV_VARS } from '@/lib/env'

export type SettingsGroup = 'provider' | 'security' | 'queue'

export type SettingsVar = {
  key: string
  group: SettingsGroup
  description: string
  example?: string
  required: boolean
}

const SETTINGS_VARS: SettingsVar[] = [
  // Provider configuration
  { key: 'MAGIC_LINK_PROVIDER', group: 'provider', description: 'Which provider handles magic link / transactional emails', example: 'ses', required: true },
  { key: 'TRANSACTIONAL_PROVIDER', group: 'provider', description: 'Optional provider for transactional sends; falls back to MAGIC_LINK_PROVIDER', example: 'ses', required: false },
  { key: 'PROMOTIONAL_PROVIDER', group: 'provider', description: 'Which provider handles promotional sends', example: 'ses', required: true },
  { key: 'UPDATE_PROVIDER', group: 'provider', description: 'Which provider handles update / notification sends', example: 'ses', required: true },
  { key: 'MAILER_FROM', group: 'provider', description: 'The "from" address for all outgoing mail', example: 'noreply@yourapp.com', required: true },
  { key: 'SES_ACCESS_KEY_ID', group: 'provider', description: 'AWS Access Key ID for SES', example: 'AKIA...', required: true },
  { key: 'SES_SECRET_ACCESS_KEY', group: 'provider', description: 'AWS Secret Access Key for SES', required: true },
  { key: 'SES_REGION', group: 'provider', description: 'AWS region where SES is configured', example: 'us-east-1', required: true },
  { key: 'SES_SANDBOX_MODE', group: 'provider', description: 'Set to true if your SES account is in sandbox (limits sending to verified addresses)', example: 'true', required: false },
  { key: 'DATABASE_URL', group: 'provider', description: 'PostgreSQL connection string (set automatically by Neon/Vercel integration)', example: 'postgres://...', required: true },
  // Security
  { key: 'MAILER_API_KEY', group: 'security', description: 'The secret key callers must send as Authorization: Bearer <key>', required: true },
  // Queue
  { key: 'QSTASH_TOKEN', group: 'queue', description: 'Upstash QStash auth token', required: true },
  { key: 'QSTASH_CURRENT_SIGNING_KEY', group: 'queue', description: 'QStash request verification key', required: true },
  { key: 'QSTASH_NEXT_SIGNING_KEY', group: 'queue', description: 'QStash request verification key (rotation)', required: true },
  { key: 'DELIVER_URL', group: 'queue', description: "The public URL of this mailer's queue webhook", example: 'https://your-mailer.vercel.app/api/queue/deliver', required: true },
]

export type SettingsReport = {
  vars: Array<SettingsVar & { set: boolean }>
  totalCount: number
  setCount: number
  missingCount: number
}

export function buildSettingsReport(env: Record<string, string | undefined>): SettingsReport {
  const vars = SETTINGS_VARS.map((v) => ({ ...v, set: Boolean(env[v.key]) }))
  const requiredVars = vars.filter((v) => v.required)
  const setCount = requiredVars.filter((v) => v.set).length
  return {
    vars,
    totalCount: requiredVars.length,
    setCount,
    missingCount: requiredVars.length - setCount,
  }
}

// Re-export so callers can check REQUIRED_ENV_VARS if needed
export { REQUIRED_ENV_VARS }
