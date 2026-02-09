'use client'

import { useEffect, useState } from 'react'

export default function SmartCdnDemo() {
  const [payload, setPayload] = useState<unknown>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/smartcdn', { cache: 'no-store' })
      .then(async (res) => res.json())
      .then((json) => {
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
    <pre data-testid="smartcdn-json">
      {payload ? JSON.stringify(payload, null, 2) : '(loading)'}
    </pre>
  )
}

