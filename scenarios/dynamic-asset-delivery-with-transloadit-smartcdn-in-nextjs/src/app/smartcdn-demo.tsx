'use client'

import { useEffect, useState } from 'react'

export default function SmartCdnDemo() {
  const [payload, setPayload] = useState<unknown>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/smartcdn', { cache: 'no-store' })
      .then(async (res) => {
        const json = await res.json()
        if (!cancelled) setPayload(json)
      })
      .catch((err) => {
        if (!cancelled) setPayload({ error: String(err) })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <pre
      data-testid="smartcdn-json"
      className="overflow-auto rounded-lg bg-neutral-50 p-3 text-xs text-neutral-800"
    >
      {payload ? JSON.stringify(payload, null, 2) : '(loading)'}
    </pre>
  )
}

