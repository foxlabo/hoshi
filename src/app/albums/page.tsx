import { ArrowLeft, FolderOpen, ImageIcon } from 'lucide-react'
import Link from 'next/link'
import { NewAlbumForm } from '@/components/photos/new-album-form'
import { ensureDbReady } from '@/lib/db/init'
import { countAlbumPhotos, getAlbumCovers, listAlbums } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

export default function AlbumsPage() {
  ensureDbReady()
  const albums = listAlbums()
  const covers = getAlbumCovers(albums.map((a) => a.id))

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900"
      >
        <ArrowLeft className="size-4" /> タイムラインへ戻る
      </Link>
      <h1 className="flex items-center gap-2 text-xl font-semibold text-zinc-900">
        <FolderOpen className="size-5 text-zinc-700" /> アルバム
      </h1>

      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-4">
        <NewAlbumForm />
      </div>

      {albums.length === 0 ? (
        <p className="mt-6 rounded-md border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-500">
          アルバムがまだありません。
        </p>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {albums.map((a) => {
            const cover = covers.get(a.id)
            const count = countAlbumPhotos(a.id)
            return (
              <li key={a.id}>
                <Link
                  href={`/albums/${a.id}`}
                  className="block overflow-hidden rounded-lg border border-zinc-200 bg-white transition-colors hover:bg-zinc-50"
                >
                  <div className="flex aspect-[3/2] items-center justify-center bg-zinc-100">
                    {cover ? (
                      // biome-ignore lint/performance/noImgElement: local thumb endpoint
                      <img
                        src={`/api/thumb/${cover.id}`}
                        alt={a.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="size-8 text-zinc-400" />
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="truncate text-sm font-medium text-zinc-900">{a.title}</h3>
                    <p className="text-xs text-zinc-500">{count} 枚</p>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
