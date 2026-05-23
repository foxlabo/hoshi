import { ArrowLeft, Search } from 'lucide-react'
import Link from 'next/link'
import { PhotoTile } from '@/components/photos/photo-tile'
import { Input } from '@/components/ui/input'
import { ensureDbReady } from '@/lib/db/init'
import { listPhotos } from '@/lib/db/queries'
import { searchPhotos } from '@/lib/photos/search'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function SearchPage({ searchParams }: PageProps) {
  ensureDbReady()
  const { q } = await searchParams
  const query = (q ?? '').slice(0, 200) // bound input length
  const all = listPhotos()
  const results = query.trim() ? searchPhotos(all, query, { limit: 500 }) : []

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900"
      >
        <ArrowLeft className="size-4" /> タイムラインへ戻る
      </Link>
      <h1 className="flex items-center gap-2 text-xl font-semibold text-zinc-900">
        <Search className="size-5 text-zinc-700" /> 検索
      </h1>

      <form action="/search" className="mt-4">
        <Input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="ファイル名で検索…"
          autoFocus
          maxLength={200}
        />
      </form>

      {query.trim() === '' ? (
        <p className="mt-6 text-sm text-zinc-500">クエリを入力してください。</p>
      ) : results.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500">「{query}」に該当する写真はありません。</p>
      ) : (
        <div className="mt-6">
          <p className="mb-3 text-xs text-zinc-500">{results.length} 件</p>
          <div className="flex flex-wrap gap-2">
            {results.map((p) => (
              <PhotoTile key={p.id} photo={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
