import type { Photo } from '@/lib/db/schema'

/** Detect Hiragana, Katakana, CJK, and full-width chars. */
const CJK_REGEX = /[぀-ヿ㐀-鿿＀-￯]/

interface SearchOptions {
  limit?: number
}

/** Expand a CJK token into overlapping bigrams so whitespace-less Japanese
 *  filenames / album names still match. ASCII passes through unchanged. */
function tokenize(query: string): string[] {
  const base = Array.from(new Set(query.split(/\s+/).filter(Boolean)))
  if (!CJK_REGEX.test(query)) return base
  const out = new Set(base)
  for (const tok of base) {
    if (tok.length <= 2) continue
    for (let i = 0; i < tok.length - 1; i++) {
      out.add(tok.slice(i, i + 2))
    }
  }
  return [...out]
}

/**
 * Filter photos by case-insensitive substring of `relativePath`. CJK
 * queries also pick up bigrams. Zero-score photos are dropped; ties broken
 * by most recent `takenAtMs`.
 */
export function searchPhotos(photos: Photo[], query: string, options?: SearchOptions): Photo[] {
  const q = query.trim().toLowerCase()
  if (!q) {
    const limit = options?.limit
    return typeof limit === 'number' ? photos.slice(0, limit) : photos
  }
  const tokens = tokenize(q)
  if (tokens.length === 0) {
    const limit = options?.limit
    return typeof limit === 'number' ? photos.slice(0, limit) : photos
  }
  const scored = photos
    .map((p) => {
      const hay = p.relativePath.toLowerCase()
      let score = 0
      for (const t of tokens) {
        if (hay.includes(t)) score++
      }
      return { p, score }
    })
    .filter((s) => s.score > 0)
  scored.sort((a, b) => b.score - a.score || b.p.takenAtMs - a.p.takenAtMs)
  const limit = options?.limit
  const sliced = typeof limit === 'number' ? scored.slice(0, limit) : scored
  return sliced.map((s) => s.p)
}
