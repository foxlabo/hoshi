/**
 * EXIF date helpers. Pure functions — no I/O.
 *
 * EXIF expresses DateTimeOriginal as `YYYY:MM:DD HH:MM:SS` in the
 * camera's local time, with no timezone tag. Several modern cameras
 * include `OffsetTimeOriginal` ("+09:00") which we honor when present;
 * otherwise we treat the timestamp as UTC for stable cross-machine
 * ordering. This is a deliberate, documented choice — different from
 * "interpret in the user's timezone" which would shift photos when
 * viewed from another locale.
 */

/** Parse an EXIF date string into UTC ms, or `null` if unrecognized. */
export function parseExifDate(value: unknown, offsetTime?: string | null): number | null {
  if (value instanceof Date) {
    const t = value.getTime()
    return Number.isFinite(t) ? t : null
  }
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null

  // EXIF native form: "YYYY:MM:DD HH:MM:SS" or "YYYY:MM:DD HH:MM:SS.SS".
  const exifMatch = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?$/.exec(trimmed)
  if (exifMatch) {
    const [, y, mo, d, h, mi, s, frac] = exifMatch
    const ms = frac ? Math.floor(Number(`0.${frac}`) * 1000) : 0
    let utc = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s), ms)
    if (offsetTime) {
      const off = parseOffsetMinutes(offsetTime)
      if (off !== null) utc -= off * 60_000
    }
    return Number.isFinite(utc) ? utc : null
  }

  // ISO 8601 fallback (`2024-12-25T09:30:00+09:00` etc.).
  const t = Date.parse(trimmed)
  return Number.isFinite(t) ? t : null
}

/** Parse "+HH:MM" / "-HHMM" / "Z" into minutes east of UTC. */
export function parseOffsetMinutes(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === 'Z' || trimmed === 'z') return 0
  const m = /^([+-])(\d{2}):?(\d{2})$/.exec(trimmed)
  if (!m) return null
  const sign = m[1] === '+' ? 1 : -1
  const h = Number(m[2])
  const mi = Number(m[3])
  if (h > 14 || mi > 59) return null
  return sign * (h * 60 + mi)
}

interface ExifLike {
  DateTimeOriginal?: unknown
  CreateDate?: unknown
  ModifyDate?: unknown
  OffsetTimeOriginal?: unknown
  OffsetTime?: unknown
}

/** Best-effort "when was this photo taken" with mtime fallback. */
export function extractTakenAt(exif: ExifLike | undefined | null, mtimeMs: number): number {
  if (exif) {
    const offset =
      typeof exif.OffsetTimeOriginal === 'string'
        ? exif.OffsetTimeOriginal
        : typeof exif.OffsetTime === 'string'
          ? exif.OffsetTime
          : null
    const candidates = [exif.DateTimeOriginal, exif.CreateDate, exif.ModifyDate]
    for (const c of candidates) {
      const t = parseExifDate(c, offset)
      if (t !== null) return t
    }
  }
  return mtimeMs
}

/** Reduce a raw exifr blob to a JSON-safe subset that's cheap to render. */
export function compactExif(raw: Record<string, unknown> | null | undefined): Record<string, string> {
  if (!raw) return {}
  const out: Record<string, string> = {}
  const keys = [
    'Make',
    'Model',
    'LensModel',
    'FNumber',
    'ExposureTime',
    'ISO',
    'FocalLength',
    'FocalLengthIn35mmFormat',
    'OffsetTimeOriginal',
    'Orientation',
  ] as const
  for (const k of keys) {
    const v = raw[k]
    if (v === undefined || v === null || v === '') continue
    if (typeof v === 'string') {
      // Cap individual values to keep the JSON column reasonable.
      out[k] = v.slice(0, 200)
    } else if (typeof v === 'number') {
      out[k] = String(v)
    }
  }
  return out
}
