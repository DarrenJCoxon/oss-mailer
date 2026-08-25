const PUBLIC_PATHS = [
  '/login',
  '/health',
  '/api/auth',
  '/api/send',
  '/api/queue/deliver',
] as const

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

export function createAllowedEmailSet(value: string | undefined): ReadonlySet<string> {
  return new Set(
    (value ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  )
}

export function isAllowedEmail(
  email: string | null | undefined,
  allowedEmails: ReadonlySet<string>,
): boolean {
  return Boolean(email && allowedEmails.has(email.toLowerCase()))
}
