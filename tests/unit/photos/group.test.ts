import { describe, expect, it } from 'vitest'
import type { Photo } from '@/lib/db/schema'
import { formatDayHeader, groupByDay } from '@/lib/photos/group'

function photo(overrides: Partial<Photo>): Photo {
  return {
    id: 'x',
    relativePath: 'x.jpg',
    sha256: 'x',
    width: 100,
    height: 100,
    sizeBytes: 1,
    mimeType: 'image/jpeg',
    takenAtMs: 0,
    indexedAtMs: 0,
    exifJson: '{}',
    ...overrides,
  }
}

const JST = 'Asia/Tokyo'

describe('groupByDay', () => {
  it('groups photos that share a local date', () => {
    // Both photos fall on 2024-12-25 in JST.
    const a = photo({ id: 'a', takenAtMs: Date.UTC(2024, 11, 25, 0, 30) }) // 09:30 JST
    const b = photo({ id: 'b', takenAtMs: Date.UTC(2024, 11, 25, 13, 0) }) // 22:00 JST
    const groups = groupByDay([a, b], JST)
    expect(groups).toHaveLength(1)
    expect(groups[0].date).toBe('2024-12-25')
    expect(groups[0].photos.map((p) => p.id)).toEqual(['b', 'a'])
  })

  it('separates photos that cross midnight in the host tz', () => {
    // 2024-12-25 23:30 JST and 2024-12-26 00:30 JST.
    const a = photo({ id: 'a', takenAtMs: Date.UTC(2024, 11, 25, 14, 30) })
    const b = photo({ id: 'b', takenAtMs: Date.UTC(2024, 11, 25, 15, 30) })
    const groups = groupByDay([a, b], JST)
    expect(groups.map((g) => g.date)).toEqual(['2024-12-26', '2024-12-25'])
  })

  it('returns groups newest-first', () => {
    const groups = groupByDay(
      [
        photo({ id: 'a', takenAtMs: Date.UTC(2024, 0, 1) }),
        photo({ id: 'b', takenAtMs: Date.UTC(2024, 5, 1) }),
        photo({ id: 'c', takenAtMs: Date.UTC(2024, 11, 1) }),
      ],
      'UTC',
    )
    expect(groups.map((g) => g.date)).toEqual(['2024-12-01', '2024-06-01', '2024-01-01'])
  })

  it('returns empty list for empty input', () => {
    expect(groupByDay([])).toEqual([])
  })
})

describe('formatDayHeader', () => {
  it('renders Japanese long-form with weekday', () => {
    // 2024-12-25 was a Wednesday.
    expect(formatDayHeader('2024-12-25')).toBe('2024年12月25日（水）')
  })

  it('passes through unparseable dates', () => {
    expect(formatDayHeader('not-a-date')).toBe('not-a-date')
  })
})
