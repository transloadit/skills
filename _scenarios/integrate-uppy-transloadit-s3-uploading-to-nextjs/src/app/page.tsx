import UploadDemo from './upload-demo';

export default function Home() {
  return (
    <main className="min-h-dvh p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Uppy + Transloadit (Next.js)</h1>
          <p className="text-sm text-neutral-600">
            Upload a file, create an Assembly, and wait for processing results.
          </p>
        </header>
        <UploadDemo />
      </div>
    </main>
  );
}
