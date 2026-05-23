import type { Photo } from '@/lib/db/schema'
import { formatDayHeader, groupByDay } from '@/lib/photos/group'
import { PhotoTile } from './photo-tile'

interface TimelineProps {
  photos: Photo[]
}

export function Timeline({ photos }: TimelineProps) {
  if (photos.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-500">
        ライブラリに写真がまだありません。「スキャン」ボタンで取り込んでください。
      </p>
    )
  }
  const groups = groupByDay(photos)
  return (
    <div className="grid gap-8">
      {groups.map((g) => (
        <section key={g.date}>
          <h2 className="mb-2 text-sm font-semibold text-zinc-800">{formatDayHeader(g.date)}</h2>
          <div className="flex flex-wrap gap-2">
            {g.photos.map((p) => (
              <PhotoTile key={p.id} photo={p} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
