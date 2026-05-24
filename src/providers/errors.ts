export type ProviderErrorCode =
  | 'MISSING_ENV'
  | 'AUTH_FAILED'
  | 'RECIPIENT_NOT_VERIFIED'

export class ProviderError extends Error {
  readonly provider: string
  readonly code: ProviderErrorCode
  readonly cause?: unknown
  readonly _tag = 'ProviderError' as const

  constructor(args: {
    provider: string
    code: ProviderErrorCode
    message: string
    cause?: unknown
  }) {
    super(args.message)
    this.name = 'ProviderError'
    this.provider = args.provider
    this.code = args.code
    this.cause = args.cause
    Error.captureStackTrace?.(this, ProviderError)
  }
}

export function isProviderError(e: unknown): e is ProviderError {
  return (
    e instanceof ProviderError ||
    (typeof e === 'object' &&
      e !== null &&
      (e as { _tag?: unknown })._tag === 'ProviderError')
  )
}
