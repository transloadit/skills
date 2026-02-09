'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Uppy from '@uppy/core'
import Dashboard from '@uppy/dashboard'
import Transloadit from '@uppy/transloadit'

type AssemblyOptions = { params?: unknown; signature?: string | null }

export default function UploadDemo() {
  const dashboardEl = useRef<HTMLDivElement | null>(null)
  const [results, setResults] = useState<unknown>(null)
  const [uploadPct, setUploadPct] = useState<number>(0)

  const uppy = useMemo(() => {
    const instance = new Uppy({
      autoProceed: true,
      restrictions: { maxNumberOfFiles: 1 },
    })

    instance.use(Transloadit, {
      waitForEncoding: true,
      alwaysRunAssembly: true,
      assemblyOptions: async (): Promise<AssemblyOptions> => {
        const res = await fetch('/api/transloadit/assembly-options', { method: 'POST' })
        if (!res.ok) throw new Error(`Failed to get assembly options: ${res.status}`)
        return (await res.json()) as AssemblyOptions
      },
    })

    return instance
  }, [])

  useEffect(() => {
    if (!dashboardEl.current) return

    uppy.use(Dashboard, {
      target: dashboardEl.current,
      inline: true,
      proudlyDisplayPoweredByUppy: false,
      hideUploadButton: true,
      showProgressDetails: true,
      height: 350,
    })

    const onResult = (stepName: string, result: unknown) =>
      setResults((prev) => {
        const base: Record<string, unknown> =
          typeof prev === 'object' && prev !== null ? { ...(prev as Record<string, unknown>) } : {}
        const existing = base[stepName]
        base[stepName] = Array.isArray(existing) ? existing.concat([result]) : [result]
        return base
      })

    const onUploadProgress = (_file: unknown, progress: { bytesUploaded: number; bytesTotal: number }) => {
      if (!progress?.bytesTotal) return
      setUploadPct(Math.round((progress.bytesUploaded / progress.bytesTotal) * 100))
    }

    uppy.on('transloadit:result', onResult)
    uppy.on('upload-progress', onUploadProgress)

    return () => {
      uppy.off('transloadit:result', onResult)
      uppy.off('upload-progress', onUploadProgress)
      uppy.getPlugin('Dashboard')?.uninstall()
      uppy.close({ reason: 'unmount' })
    }
  }, [uppy])

  return (
    <section>
      <div ref={dashboardEl} />
      <div style={{ marginTop: 12 }}>{uploadPct}%</div>
      <pre style={{ marginTop: 12 }}>{results ? JSON.stringify(results, null, 2) : '(no results yet)'}</pre>
    </section>
  )
}

