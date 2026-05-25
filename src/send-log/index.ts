import { and, desc, eq } from 'drizzle-orm'
import { db } from '../db'
import { sendLog } from '../db/schema'
import type { WriteSendAttemptArgs, SendLogWriter } from '../sender'

export type SendLogErrorCode = 'DB_WRITE_FAILED' | 'DB_READ_FAILED'

export class SendLogError extends Error {
  readonly _tag = 'SendLogError' as const
  readonly code: SendLogErrorCode
  readonly cause?: unknown

  constructor(args: { code: SendLogErrorCode; message?: string; cause?: unknown }) {
    super(args.message ?? args.code)
    this.name = 'SendLogError'
    this.code = args.code
    this.cause = args.cause
    Error.captureStackTrace?.(this, SendLogError)
  }
}

export function isSendLogError(e: unknown): e is SendLogError {
  return (
    e instanceof SendLogError ||
    (typeof e === 'object' &&
      e !== null &&
      (e as { _tag?: unknown })._tag === 'SendLogError')
  )
}

export type { WriteSendAttemptArgs, SendLogWriter }

export type GetRecentSendsArgs = {
  limit: number
  category?: string
  status?: 'success' | 'failure'
}

export async function writeSendAttempt(args: WriteSendAttemptArgs): Promise<{ id: string }> {
  try {
    const rows = await db
      .insert(sendLog)
      .values({
        category: args.category,
        to: args.to,
        provider: args.provider,
        success: args.success,
        message_id: args.messageId ?? null,
        error_detail: args.error ?? null,
        sent_at: new Date(),
        duration_ms: args.durationMs,
      })
      .returning({ id: sendLog.id })

    return { id: rows[0].id }
  } catch (cause) {
    throw new SendLogError({ code: 'DB_WRITE_FAILED', cause })
  }
}

export function createLogWriter(): SendLogWriter {
  return {
    writeSendAttempt: async (args) => {
      await writeSendAttempt(args)
    },
  }
}

export async function getRecentSends(
  args: GetRecentSendsArgs,
): Promise<Array<typeof sendLog.$inferSelect>> {
  try {
    const conditions = []

    if (args.category !== undefined) {
      conditions.push(eq(sendLog.category, args.category))
    }

    if (args.status !== undefined) {
      conditions.push(eq(sendLog.success, args.status === 'success'))
    }

    return await db
      .select()
      .from(sendLog)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(sendLog.sent_at))
      .limit(args.limit)
  } catch (cause) {
    throw new SendLogError({ code: 'DB_READ_FAILED', cause })
  }
}
