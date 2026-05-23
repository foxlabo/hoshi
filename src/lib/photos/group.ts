import type { Photo } from '@/lib/db/schema'

export interface DayGroup {
  /** "YYYY-MM-DD" in the supplied timezone. */
  date: string
  photos: Photo[]
}

/** Format `ms` as "YYYY-MM-DD" in the given IANA timezone. */
function isoDateInTimeZone(ms: number, timeZone: string): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return fmt.format(new Date(ms))
}

/**
 * Group photos by the local date their `takenAtMs` falls on. Input may be
 * unsorted; output groups are newest-first, photos within a group remain
 * in input order. Defaults to the server's local timezone.
 */
export function groupByDay(photos: Photo[], timeZone?: string): DayGroup[] {
  const tz = timeZone ?? (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
  const byDate = new Map<string, Photo[]>()
  for (const p of photos) {
    const date = isoDateInTimeZone(p.takenAtMs, tz)
    const bucket = byDate.get(date)
    if (bucket) bucket.push(p)
    else byDate.set(date, [p])
  }
  const groups: DayGroup[] = []
  for (const [date, ps] of byDate) {
    groups.push({ date, photos: ps })
  }
  // Newest day first.
  groups.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  // Newest photo first within each day.
  for (const g of groups) {
    g.photos.sort((a, b) => b.takenAtMs - a.takenAtMs)
  }
  return groups
}

const JA_WEEKDAY = ['日', '月', '火', '水', '木', '金', '土']

/** Render "2024年12月25日（水）" for a "YYYY-MM-DD" string. */
export function formatDayHeader(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return date
  }
  // Compute weekday from the civil date — UTC arithmetic is exact for
  // weekday-of-civil-date.
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return `${y}年${m}月${d}日（${JA_WEEKDAY[dow]}）`
}
