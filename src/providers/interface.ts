/**
 * Describes the shape of a single email send request passed to a provider.
 */
export type ProviderSendRequest = {
  from: string
  to: string
  subject: string
  html: string
  text: string
  /** Optional address used when the recipient replies. */
  replyTo?: string
  /** Optional headers forwarded verbatim to the provider (e.g. List-Unsubscribe). */
  headers?: Record<string, string>
}

/**
 * The result returned by every provider's send() call.
 * send() NEVER throws — failures are represented here as success=false.
 */
export type SendResult = {
  success: boolean
  /** The provider-assigned message identifier, present on success. */
  messageId?: string
  /** Human-readable error description, present on failure. */
  error?: string
  /** Which provider produced this result (e.g. 'ses'). */
  provider: string
  /** ISO-8601 timestamp of the send attempt. */
  sentAt: string
}

/** Contract every email-provider adapter must satisfy. */
export interface EmailProvider {
  /** Provider identifier — used in Send Log and Config Health (e.g. 'ses'). */
  name: string

  /**
   * Verifies that all required environment variables or config values are
   * present and non-empty.  Does NOT make any network call.
   * @throws {ProviderError} with code 'MISSING_ENV' if anything is absent.
   */
  validate(): void

  /**
   * Executes the email send.  NEVER throws under any circumstances —
   * all provider errors are returned as SendResult with success=false.
   */
  send(req: ProviderSendRequest): Promise<SendResult>
}
