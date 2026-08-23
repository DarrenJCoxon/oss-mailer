import { REQUIRED_ENV_VARS, type RequiredEnvKey } from '../lib/env'

export type EnvSnapshot = Record<string, string | undefined>

export type EnvVarStatus = {
  key: RequiredEnvKey
  present: boolean
}

export type RoutingRow = {
  category: 'magic_link' | 'transactional' | 'promotional' | 'update'
  envVar: 'MAGIC_LINK_PROVIDER' | 'TRANSACTIONAL_PROVIDER' | 'PROMOTIONAL_PROVIDER' | 'UPDATE_PROVIDER'
  provider: string | null
}

export type HealthReport = {
  envVars: EnvVarStatus[]
  routing: RoutingRow[]
  sandboxMode: boolean
}

export type HealthHandlerDeps = {
  env: EnvSnapshot
  apiKey: string
}

const ROUTING_ROWS = [
  { category: 'magic_link',  envVar: 'MAGIC_LINK_PROVIDER' },
  { category: 'transactional', envVar: 'TRANSACTIONAL_PROVIDER' },
  { category: 'promotional', envVar: 'PROMOTIONAL_PROVIDER' },
  { category: 'update',      envVar: 'UPDATE_PROVIDER' },
] as const

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function buildHealthReport(env: EnvSnapshot): HealthReport {
  const envVars: EnvVarStatus[] = REQUIRED_ENV_VARS.map((key: RequiredEnvKey) => ({
    key,
    present: typeof env[key] === 'string' && env[key]!.trim().length > 0,
  }))

  const routing: RoutingRow[] = ROUTING_ROWS.map((row) => ({
    category: row.category,
    envVar: row.envVar,
    provider: env[row.envVar]?.trim()
      || (row.category === 'transactional' ? env.MAGIC_LINK_PROVIDER?.trim() : undefined)
      || null,
  }))

  const sandboxMode = env.SES_SANDBOX_MODE === 'true'

  return { envVars, routing, sandboxMode }
}

export function renderHealthHtml(report: HealthReport): string {
  const sandboxBanner = report.sandboxMode
    ? `
      <section role="status" aria-labelledby="sandbox-heading" style="background:#fffbeb;color:#d97706;border-radius:0.5rem;padding:1rem;margin-bottom:2rem;">
        <p id="sandbox-heading"><span aria-hidden="true">&#9888; </span>SES is in sandbox mode &#8212; sends are restricted to verified addresses.</p>
      </section>`
    : ''

  const envVarItems = report.envVars
    .map((v) => {
      const glyph = v.present ? '&#x2705;' : '&#x274C;'
      const srText = v.present ? ' set' : ' missing'
      return `          <li>${glyph} <code>${escapeHtml(v.key)}</code><span class="sr-only">${srText}</span></li>`
    })
    .join('\n')

  const routingRows = report.routing
    .map((row) => {
      const providerCell =
        row.provider !== null
          ? `<code>${escapeHtml(row.provider)}</code>`
          : `<span style="color:#dc2626;">not set</span>`
      return `            <tr>
              <td style="padding:0.25rem 0.5rem 0.25rem 0;">${escapeHtml(row.category)}</td>
              <td style="padding:0.25rem 0.5rem;"><code>${escapeHtml(row.envVar)}</code></td>
              <td style="padding:0.25rem 0 0.25rem 0.5rem;">${providerCell}</td>
            </tr>`
    })
    .join('\n')

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>oss-mailer &#8212; config health</title>
    <style>
      *, *::before, *::after { box-sizing: border-box; }
      body { margin: 0; font-family: system-ui, sans-serif; font-size: 1rem; line-height: 1.5; background: #fff; color: #111827; }
      @media (prefers-color-scheme: dark) { body { background: #111827; color: #f9fafb; } }
      main { max-width: 640px; margin: 0 auto; padding: 4rem 1rem 3rem; }
      h1 { font-size: 1.5rem; font-weight: 600; margin: 0 0 2rem; }
      h2 { font-size: 1.125rem; font-weight: 600; margin: 0 0 0.75rem; }
      section { margin-top: 2rem; }
      ul { list-style: none; margin: 0; padding: 0; }
      li { margin: 0.25rem 0; }
      code { font-family: ui-monospace, monospace; font-size: 0.875rem; }
      table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
      th { text-align: left; padding: 0.25rem 0.5rem 0.25rem 0; color: #374151; }
      @media (prefers-color-scheme: dark) { th { color: #d1d5db; } }
      .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
    </style>
  </head>
  <body>
    <main>
      <h1>Config health</h1>
${sandboxBanner}
      <section aria-labelledby="env-heading">
        <h2 id="env-heading">Environment variables</h2>
        <ul>
${envVarItems}
        </ul>
      </section>

      <section aria-labelledby="routing-heading">
        <h2 id="routing-heading">Routing</h2>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Env var</th>
              <th>Provider</th>
            </tr>
          </thead>
          <tbody>
${routingRows}
          </tbody>
        </table>
      </section>
    </main>
  </body>
</html>`
}

export function createHealthHandler(
  deps: HealthHandlerDeps,
): (req: Request) => Promise<Response> {
  return async function healthHandler(req: Request): Promise<Response> {
    const auth = req.headers.get('authorization') ?? ''
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : ''
    if (token.length === 0 || token !== deps.apiKey) {
      return new Response('Unauthorized', {
        status: 401,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      })
    }

    const report = buildHealthReport(deps.env)
    const html = renderHealthHtml(report)

    return new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      },
    })
  }
}
