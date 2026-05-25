import Link from 'next/link'
import { REQUIRED_ENV_VARS } from '@/lib/env'

export function FirstRunBanner() {
  let missingCount = 0
  let readFailed = false
  try {
    missingCount = REQUIRED_ENV_VARS.filter((k) => !process.env[k]).length
  } catch {
    readFailed = true
  }

  if (!readFailed && missingCount === 0) {
    return null
  }

  const message = readFailed
    ? 'Could not check configuration.'
    : `${missingCount} environment variable${missingCount === 1 ? ' is' : 's are'} not configured.`

  return (
    <div
      role="status"
      className="mx-auto max-w-5xl px-4 pt-4"
    >
      <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-[#78350F] px-4 py-3 text-sm text-amber-800 dark:text-amber-200 flex items-center justify-between gap-3">
        <span>
          <span aria-hidden="true">⚠ </span>
          {message}
        </span>
        <Link
          href="/settings"
          className="font-medium underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 dark:focus-visible:outline-amber-300"
        >
          Go to Settings →
        </Link>
      </div>
    </div>
  )
}
