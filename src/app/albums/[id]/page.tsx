import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AlbumControls } from '@/components/photos/album-controls'
import { PhotoTile } from '@/components/photos/photo-tile'
import { ensureDbReady } from '@/lib/db/init'
import { getAlbum, listAlbumPhotos } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AlbumDetailPage({ params }: PageProps) {
  ensureDbReady()
  const { id } = await params
  const album = getAlbum(id)
  if (!album) notFound()
  const photos = listAlbumPhotos(album.id)

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <Link
        href="/albums"
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900"
      >
        <ArrowLeft className="size-4" /> アルバム一覧へ
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">{album.title}</h1>
          <p className="text-xs text-zinc-500">{photos.length} 枚</p>
        </div>
        <AlbumControls album={album} />
      </div>

      {photos.length === 0 ? (
        <p className="mt-6 rounded-md border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-500">
          写真がまだ追加されていません。タイムラインから写真を開いて「アルバム」欄で追加してください。
        </p>
      ) : (
        <div className="mt-6 flex flex-wrap gap-2">
          {photos.map((p) => (
            <PhotoTile key={p.id} photo={p} />
          ))}
        </div>
      )}
    </div>
  )
}
