import { describe, expect, it } from 'vitest'
import {
  compactExif,
  extractTakenAt,
  parseExifDate,
  parseOffsetMinutes,
} from '@/lib/photos/exif'

describe('parseExifDate', () => {
  it('parses the canonical "YYYY:MM:DD HH:MM:SS" form as UTC', () => {
    const ms = parseExifDate('2024:12:25 09:30:15')
    expect(new Date(ms as number).toISOString()).toBe('2024-12-25T09:30:15.000Z')
  })

  it('honors a positive OffsetTimeOriginal', () => {
    const ms = parseExifDate('2024:12:25 09:30:00', '+09:00')
    // 09:30 JST = 00:30 UTC.
    expect(new Date(ms as number).toISOString()).toBe('2024-12-25T00:30:00.000Z')
  })

  it('honors a negative OffsetTimeOriginal without colon', () => {
    const ms = parseExifDate('2024:12:25 09:30:00', '-0500')
    expect(new Date(ms as number).toISOString()).toBe('2024-12-25T14:30:00.000Z')
  })

  it('accepts a Date instance unchanged', () => {
    const d = new Date('2024-01-02T03:04:05Z')
    expect(parseExifDate(d)).toBe(d.getTime())
  })

  it('falls back to ISO 8601', () => {
    expect(parseExifDate('2024-12-25T09:30:00Z')).toBe(Date.UTC(2024, 11, 25, 9, 30, 0))
  })

  it('rejects garbage', () => {
    expect(parseExifDate(undefined)).toBeNull()
    expect(parseExifDate(null)).toBeNull()
    expect(parseExifDate('')).toBeNull()
    expect(parseExifDate('not a date')).toBeNull()
    expect(parseExifDate(12345 as unknown as string)).toBeNull()
  })
})

describe('parseOffsetMinutes', () => {
  it.each([
    ['Z', 0],
    ['+00:00', 0],
    ['+09:00', 540],
    ['-05:00', -300],
    ['+0530', 330],
    ['-0830', -510],
  ])('parses %s as %d minutes', (input, expected) => {
    expect(parseOffsetMinutes(input)).toBe(expected)
  })

  it.each(['x', '+25:00', '00:00', '+09:99'])('rejects %s', (input) => {
    expect(parseOffsetMinutes(input)).toBeNull()
  })
})

describe('extractTakenAt', () => {
  const mtime = Date.UTC(2024, 5, 1, 0, 0, 0)

  it('returns DateTimeOriginal when present', () => {
    const t = extractTakenAt({ DateTimeOriginal: '2024:12:25 09:30:00' }, mtime)
    expect(new Date(t).toISOString()).toBe('2024-12-25T09:30:00.000Z')
  })

  it('falls back to CreateDate, then ModifyDate', () => {
    expect(extractTakenAt({ CreateDate: '2024:12:24 00:00:00' }, mtime)).toBe(
      Date.UTC(2024, 11, 24, 0, 0, 0),
    )
    expect(extractTakenAt({ ModifyDate: '2024:12:23 00:00:00' }, mtime)).toBe(
      Date.UTC(2024, 11, 23, 0, 0, 0),
    )
  })

  it('falls back to mtime when nothing is parseable', () => {
    expect(extractTakenAt({}, mtime)).toBe(mtime)
    expect(extractTakenAt(null, mtime)).toBe(mtime)
    expect(extractTakenAt({ DateTimeOriginal: 'nope' }, mtime)).toBe(mtime)
  })

  it('applies OffsetTimeOriginal to DateTimeOriginal', () => {
    const t = extractTakenAt(
      { DateTimeOriginal: '2024:12:25 09:30:00', OffsetTimeOriginal: '+09:00' },
      mtime,
    )
    expect(new Date(t).toISOString()).toBe('2024-12-25T00:30:00.000Z')
  })
})

describe('compactExif', () => {
  it('keeps the allowlisted keys and stringifies numbers', () => {
    const out = compactExif({
      Make: 'Sony',
      Model: 'α7 IV',
      ISO: 400,
      ExposureTime: '1/250',
      DangerousKey: 'should not appear',
    } as unknown as Record<string, unknown>)
    expect(out).toEqual({
      Make: 'Sony',
      Model: 'α7 IV',
      ISO: '400',
      ExposureTime: '1/250',
    })
  })

  it('truncates over-long strings', () => {
    const out = compactExif({ Make: 'x'.repeat(500) })
    expect(out.Make.length).toBe(200)
  })

  it('ignores empty / null inputs', () => {
    expect(compactExif(null)).toEqual({})
    expect(compactExif(undefined)).toEqual({})
  })
})
