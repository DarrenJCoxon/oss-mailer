import { auth, signOut } from '@/auth'

export async function AccountMenu() {
  const session = await auth()

  if (!session?.user) return null

  async function signOutAction() {
    'use server'

    await signOut({ redirectTo: '/login' })
  }

  return (
    <div className="flex items-center justify-end gap-3 border-b border-gray-200 px-4 py-2 dark:border-[#2E3244]">
      {session.user.email && (
        <span className="truncate text-sm text-gray-600 dark:text-gray-400">
          {session.user.email}
        </span>
      )}
      <form action={signOutAction}>
        <button
          type="submit"
          className="rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-[#2E3244] dark:text-gray-300 dark:hover:bg-[#21263A]"
        >
          Sign out
        </button>
      </form>
    </div>
  )
}
