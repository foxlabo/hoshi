import { Search, Sparkles, Star } from 'lucide-react'
import Link from 'next/link'
import { ScanButton } from '@/components/photos/scan-button'
import { Timeline } from '@/components/photos/timeline'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ensureDbReady } from '@/lib/db/init'
import { countPhotos, listPhotos } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

export default function HomePage() {
  ensureDbReady()
  const photos = listPhotos(500)
  const total = countPhotos()
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-zinc-200 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
            <Star className="size-4 text-amber-500" /> Hoshi
          </Link>
          <form action="/search" className="hidden max-w-md flex-1 items-center gap-2 sm:flex">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <Input
                type="search"
                name="q"
                placeholder="ファイル名で検索…"
                className="pl-8"
                aria-label="Search photos"
              />
            </div>
          </form>
          <nav className="flex items-center gap-1">
            <Button asChild size="sm" variant="ghost">
              <Link href="/albums">アルバム</Link>
            </Button>
            <ScanButton />
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-6">
        <div className="mb-4 flex items-baseline justify-between">
          <h1 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
            <Sparkles className="size-4 text-zinc-500" /> タイムライン
          </h1>
          <span className="text-xs text-zinc-500">{total} 枚</span>
        </div>
        <Timeline photos={photos} />
      </main>
    </div>
  )
}
