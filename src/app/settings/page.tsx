import type { Metadata } from 'next'
import { buildSettingsReport } from '@/settings'

export const metadata: Metadata = { title: 'Settings — oss-mailer' }

export default function SettingsPage() {
  const report = buildSettingsReport(process.env as Record<string, string | undefined>)
  const { vars, totalCount, setCount, missingCount } = report

  const allRequiredSet = missingCount === 0

  const providerVars = vars.filter((v) => v.group === 'provider')
  const securityVars = vars.filter((v) => v.group === 'security')
  const queueVars = vars.filter((v) => v.group === 'queue')

  return (
    <main className="mx-auto max-w-3xl px-4 pt-10 pb-12">
      <h1 className="text-2xl font-semibold leading-tight text-gray-900 dark:text-gray-50 mb-8">
        Settings
      </h1>

      {allRequiredSet ? (
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200 mb-8">
          <span aria-hidden="true">✅ </span>
          {setCount} of {totalCount} variables configured
        </div>
      ) : (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-[#78350F] px-4 py-3 text-sm text-amber-800 dark:text-amber-200 mb-8">
          <span aria-hidden="true">⚠ </span>
          {setCount} of {totalCount} configured — {missingCount} missing
        </div>
      )}

      <section className="mb-8">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-50 mb-4">
          Provider configuration
        </h2>
        <div className="rounded-lg border border-gray-200 dark:border-[#2E3244] bg-white dark:bg-[#1A1D2E] px-4">
          {providerVars.map((v) => (
            <VarRow key={v.key} {...v} />
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-50 mb-4">
          API security
        </h2>
        <div className="rounded-lg border border-gray-200 dark:border-[#2E3244] bg-white dark:bg-[#1A1D2E] px-4">
          {securityVars.map((v) => (
            <VarRow key={v.key} {...v} />
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-50 mb-4">
          Queue configuration
        </h2>
        <div className="rounded-lg border border-gray-200 dark:border-[#2E3244] bg-white dark:bg-[#1A1D2E] px-4">
          {queueVars.map((v) => (
            <VarRow key={v.key} {...v} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-50 mb-4">
          How to set these
        </h2>
        <div className="space-y-2">
          <details className="rounded-lg border border-gray-200 dark:border-[#2E3244] bg-white dark:bg-[#1A1D2E]">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-50 select-none">
              Vercel
            </summary>
            <p className="px-4 pb-3 text-sm text-gray-600 dark:text-gray-400">
              Go to your project in the Vercel dashboard → Settings → Environment Variables → Add New → Redeploy
            </p>
          </details>
          <details className="rounded-lg border border-gray-200 dark:border-[#2E3244] bg-white dark:bg-[#1A1D2E]">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-50 select-none">
              Railway
            </summary>
            <p className="px-4 pb-3 text-sm text-gray-600 dark:text-gray-400">
              Open your service → Variables tab → Add variable → Redeploy
            </p>
          </details>
          <details className="rounded-lg border border-gray-200 dark:border-[#2E3244] bg-white dark:bg-[#1A1D2E]">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-50 select-none">
              Local development
            </summary>
            <p className="px-4 pb-3 text-sm text-gray-600 dark:text-gray-400">
              Copy <code className="font-mono text-xs">.env.example</code> to{' '}
              <code className="font-mono text-xs">.env.local</code>, fill in the values, restart{' '}
              <code className="font-mono text-xs">npm run dev</code>
            </p>
          </details>
        </div>
      </section>
    </main>
  )
}

type VarRowProps = {
  key: string
  description: string
  example?: string
  set: boolean
  required: boolean
}

function VarRow({ key: varKey, description, example, set, required }: VarRowProps) {
  return (
    <div className="py-3 border-b border-gray-100 dark:border-[#2E3244] last:border-b-0">
      <div className="flex items-center justify-between gap-3">
        <code
          className={`text-sm font-mono ${
            set ? 'text-gray-700 dark:text-gray-300' : 'text-red-600 dark:text-red-400'
          }`}
        >
          {varKey}
          {!required && (
            <span className="ml-1 text-xs font-sans font-normal text-gray-400 dark:text-gray-500">
              (optional)
            </span>
          )}
        </code>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            set
              ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
              : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
          }`}
        >
          <span aria-hidden="true">{set ? '✅' : '❌'}</span>{set ? ' Set' : ' Missing'}
        </span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {description}
        {example ? ` Example: ${example}` : ''}
      </p>
    </div>
  )
}
