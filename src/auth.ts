import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { createAllowedEmailSet, isAllowedEmail, isPublicPath } from '@/auth-policy'

const allowedEmails = createAllowedEmailSet(process.env.AUTH_ALLOWED_EMAILS)

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  trustHost: true,
  callbacks: {
    authorized({ auth: session, request }) {
      return isPublicPath(request.nextUrl.pathname) || Boolean(session?.user)
    },
    signIn({ profile, user }) {
      const profileEmail = typeof profile?.email === 'string' ? profile.email : undefined
      const email = (profileEmail ?? user.email)?.toLowerCase()

      // Fail closed: an empty allowlist must never turn Google OAuth into open access.
      return isAllowedEmail(email, allowedEmails)
    },
  },
})
