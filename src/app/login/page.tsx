import { signIn } from '@/auth'

export const metadata = {
  title: 'Sign in — oss-mailer',
}

export default function LoginPage() {
  async function signInWithGoogle() {
    'use server'

    await signIn('google', { redirectTo: '/' })
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-[#2E3244] dark:bg-[#1A1D27]">
        <h1 className="text-2xl font-semibold leading-tight text-gray-900 dark:text-gray-50">
          Sign in to oss-mailer
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Dashboard access is restricted to approved Google accounts.
        </p>
        <form action={signInWithGoogle} className="mt-8">
          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-base font-medium text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Continue with Google
          </button>
        </form>
      </div>
    </main>
  )
}
