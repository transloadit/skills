import SmartCdnDemo from './smartcdn-demo'

export default function Home() {
  return (
    <main className="min-h-dvh p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-2xl font-semibold">Smart CDN Signing (Next.js)</h1>
        <p className="text-sm text-neutral-600">
          This scenario generates a signed Smart CDN URL via a Next.js route handler.
        </p>
        <SmartCdnDemo />
      </div>
    </main>
  )
}

