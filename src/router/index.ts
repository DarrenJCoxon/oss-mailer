import type { EmailProvider } from '../providers/interface'
import { createSesAdapter } from '../providers/ses'

export type EmailCategory = 'magic_link' | 'promotional' | 'update'

export type RouterErrorCode = 'UNKNOWN_CATEGORY' | 'PROVIDER_NOT_CONFIGURED'

export class RouterError extends Error {
  readonly code: RouterErrorCode
  readonly category: string
  readonly cause?: unknown
  readonly _tag = 'RouterError' as const

  constructor(args: {
    code: RouterErrorCode
    category: string
    message: string
    cause?: unknown
  }) {
    super(args.message)
    this.name = 'RouterError'
    this.code = args.code
    this.category = args.category
    this.cause = args.cause
    Error.captureStackTrace?.(this, RouterError)
  }
}

export function isRouterError(e: unknown): e is RouterError {
  return (
    e instanceof RouterError ||
    (typeof e === 'object' &&
      e !== null &&
      (e as { _tag?: unknown })._tag === 'RouterError')
  )
}

const PROVIDERS = {
  ses: () => createSesAdapter(),
} as const satisfies Record<string, () => EmailProvider>

const ENV_VAR_BY_CATEGORY: Record<EmailCategory, string> = {
  magic_link: 'MAGIC_LINK_PROVIDER',
  promotional: 'PROMOTIONAL_PROVIDER',
  update: 'UPDATE_PROVIDER',
}

const KNOWN_CATEGORIES = Object.keys(ENV_VAR_BY_CATEGORY) as EmailCategory[]

export function createRouter(): { resolve: (category: EmailCategory) => EmailProvider } {
  const map = {} as Record<EmailCategory, EmailProvider>

  for (const category of KNOWN_CATEGORIES) {
    const varName = ENV_VAR_BY_CATEGORY[category]
    const providerId = process.env[varName]

    if (!providerId) {
      throw new RouterError({
        code: 'PROVIDER_NOT_CONFIGURED',
        category,
        message: `${varName} is not set`,
      })
    }

    if (!(providerId in PROVIDERS)) {
      throw new RouterError({
        code: 'PROVIDER_NOT_CONFIGURED',
        category,
        message: `Unknown provider "${providerId}" for category "${category}" (${varName}=${providerId})`,
      })
    }

    map[category] = PROVIDERS[providerId as keyof typeof PROVIDERS]()
  }

  const frozen = Object.freeze(map)

  return {
    resolve(category: EmailCategory): EmailProvider {
      if (!(category in frozen)) {
        throw new RouterError({
          code: 'UNKNOWN_CATEGORY',
          category,
          message: `Unknown email category: "${category}"`,
        })
      }
      return frozen[category]
    },
  }
}
