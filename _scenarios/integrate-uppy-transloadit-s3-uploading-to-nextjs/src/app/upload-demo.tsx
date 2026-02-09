'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Uppy from '@uppy/core'
import Dashboard from '@uppy/dashboard'
import Transloadit, { type AssemblyOptions } from '@uppy/transloadit'

export default function UploadDemo() {
  const dashboardEl = useRef<HTMLDivElement | null>(null)
  const [lastAssembly, setLastAssembly] = useState<unknown>(null)
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
        const res = await fetch('/api/transloadit/assembly-options', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        })
        if (!res.ok) {
          throw new Error(`Failed to get assembly options: ${res.status}`)
        }
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
      hideProgressDetails: false,
      height: 350,
    })

    const onAssembly = (assembly: unknown) => setLastAssembly(assembly)
    const onResult = (stepName: string, result: unknown) =>
      setResults((prev: unknown) => {
        const base: Record<string, unknown> =
          typeof prev === 'object' && prev !== null ? { ...(prev as Record<string, unknown>) } : {}
        const existing = base[stepName]
        base[stepName] = Array.isArray(existing) ? existing.concat([result]) : [result]
        return base
      })
    const onUploadProgress = (_file: unknown, progress: { bytesUploaded: number; bytesTotal: number | null }) => {
      if (!progress?.bytesTotal) return
      const pct = Math.round((progress.bytesUploaded / progress.bytesTotal) * 100)
      setUploadPct(pct)
    }
    const onComplete = () => {
      // noop; DOM already has results state
    }

    uppy.on('transloadit:assembly-created', onAssembly)
    uppy.on('transloadit:result', onResult)
    uppy.on('transloadit:complete', onComplete)
    uppy.on('upload-progress', onUploadProgress)

    return () => {
      uppy.off('transloadit:assembly-created', onAssembly)
      uppy.off('transloadit:result', onResult)
      uppy.off('transloadit:complete', onComplete)
      uppy.off('upload-progress', onUploadProgress)
      uppy.getPlugin('Dashboard')?.uninstall()
      uppy.destroy()
    }
  }, [uppy])

  return (
    <section className="grid gap-6 md:grid-cols-2">
      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-neutral-700">Upload</h2>
        <div data-testid="uppy-dashboard" ref={dashboardEl} />
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-neutral-700">Debug</h2>
        <div className="space-y-4">
          <div>
            <div className="text-xs font-medium text-neutral-600">Upload progress</div>
            <div data-testid="upload-pct" className="mt-2 text-sm tabular-nums text-neutral-800">
              {uploadPct}%
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-neutral-600">Assembly</div>
            <pre
              data-testid="assembly-json"
              className="mt-2 max-h-44 overflow-auto rounded-lg bg-neutral-50 p-3 text-xs text-neutral-800"
            >
              {lastAssembly ? JSON.stringify(lastAssembly, null, 2) : '(none yet)'}
            </pre>
          </div>
          <div>
            <div className="text-xs font-medium text-neutral-600">Results</div>
            <pre
              data-testid="results-json"
              className="mt-2 max-h-64 overflow-auto rounded-lg bg-neutral-50 p-3 text-xs text-neutral-800"
            >
              {results ? JSON.stringify(results, null, 2) : '(none yet)'}
            </pre>
          </div>
        </div>
      </div>
    </section>
  )
}
