import { SendForm } from './SendForm'

export default function TestSendPage() {
  return (
    <main className="mx-auto max-w-[480px] px-4 pt-16 pb-12">
      <h1 className="text-2xl font-semibold leading-tight text-gray-900 dark:text-gray-50 mb-8">
        Test Send
      </h1>
      <SendForm />
    </main>
  )
}
