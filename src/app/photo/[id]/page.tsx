import { ArrowLeft, Calendar, Camera, FileImage } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AlbumMembership } from '@/components/photos/album-membership'
import { ensureDbReady } from '@/lib/db/init'
import { getPhoto, listAlbums, listAlbumsForPhoto } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default async function PhotoDetailPage({ params }: PageProps) {
  ensureDbReady()
  const { id } = await params
  const photo = getPhoto(id)
  if (!photo) notFound()
  const allAlbums = listAlbums()
  const memberships = listAlbumsForPhoto(photo.id).map((a) => a.id)
  let exif: Record<string, string> = {}
  try {
    exif = JSON.parse(photo.exifJson) as Record<string, string>
  } catch {
    exif = {}
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900"
      >
        <ArrowLeft className="size-4" /> タイムラインへ戻る
      </Link>

      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-black">
          {/* biome-ignore lint/performance/noImgElement: served via local route; we control the cache */}
          <img
            src={`/api/photo/${photo.id}`}
            alt={photo.relativePath}
            className="mx-auto max-h-[80vh] w-auto object-contain"
          />
        </div>

        <aside className="grid gap-4">
          <section className="rounded-lg border border-zinc-200 bg-white p-4 text-sm">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <FileImage className="size-4" /> 詳細
            </h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
              <dt className="text-zinc-500">パス</dt>
              <dd className="break-all font-mono text-[11px] text-zinc-700">
                {photo.relativePath}
              </dd>
              <dt className="text-zinc-500">サイズ</dt>
              <dd className="text-zinc-700">
                {photo.width}×{photo.height} / {fmtSize(photo.sizeBytes)}
              </dd>
              <dt className="text-zinc-500">タイプ</dt>
              <dd className="text-zinc-700">{photo.mimeType}</dd>
            </dl>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-4 text-sm">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <Calendar className="size-4" /> 撮影日時
            </h2>
            <p className="text-xs text-zinc-700">{fmtDate(photo.takenAtMs)}</p>
          </section>

          {Object.keys(exif).length > 0 && (
            <section className="rounded-lg border border-zinc-200 bg-white p-4 text-sm">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <Camera className="size-4" /> EXIF
              </h2>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                {Object.entries(exif).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-zinc-500">{k}</dt>
                    <dd className="break-all text-zinc-700">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <section className="rounded-lg border border-zinc-200 bg-white p-4 text-sm">
            <h2 className="mb-2 text-sm font-semibold text-zinc-900">アルバム</h2>
            <AlbumMembership photoId={photo.id} allAlbums={allAlbums} initiallyIn={memberships} />
          </section>
        </aside>
      </div>
    </div>
  )
}
