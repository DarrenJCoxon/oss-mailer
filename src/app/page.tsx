import type { Metadata } from 'next'
import { getRecentSends } from '@/send-log'
import { DEFAULT_LOG_LIMIT, toSendLogRow, DB_ERROR_COPY } from '@/log'
import { LogTable } from './(dashboard)/LogTable'

export const metadata: Metadata = {
  title: 'Send log — oss-mailer',
}

export default async function Home() {
  let rows
  try {
    const dbRows = await getRecentSends({ limit: DEFAULT_LOG_LIMIT })
    rows = dbRows.map(toSendLogRow)
  } catch (cause) {
    console.error('[Dashboard] failed to load send log:', cause)
    return (
      <main className="mx-auto max-w-5xl px-4 pt-10 pb-12">
        <h1 className="text-2xl font-semibold leading-tight text-gray-900 dark:text-gray-50 mb-8">
          Send log
        </h1>
        <div
          role="alert"
          className="rounded-lg p-4 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-sm"
        >
          {DB_ERROR_COPY.body}
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pt-10 pb-12">
      <h1 className="text-2xl font-semibold leading-tight text-gray-900 dark:text-gray-50 mb-8">
        Send log
      </h1>
      <LogTable rows={rows} />
    </main>
  )
}
