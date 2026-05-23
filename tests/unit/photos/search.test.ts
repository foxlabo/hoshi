import { describe, expect, it } from 'vitest'
import type { Photo } from '@/lib/db/schema'
import { searchPhotos } from '@/lib/photos/search'

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

describe('searchPhotos', () => {
  it('returns everything when the query is empty', () => {
    const a = photo({ id: 'a', relativePath: 'a.jpg' })
    const b = photo({ id: 'b', relativePath: 'b.jpg' })
    expect(searchPhotos([a, b], '')).toHaveLength(2)
    expect(searchPhotos([a, b], '   ')).toHaveLength(2)
  })

  it('matches case-insensitively on the relative path', () => {
    const a = photo({ id: 'a', relativePath: 'trips/Tokyo/IMG_1.jpg' })
    const b = photo({ id: 'b', relativePath: 'home.jpg' })
    expect(searchPhotos([a, b], 'TOKYO').map((p) => p.id)).toEqual(['a'])
  })

  it('drops photos that match no token', () => {
    const a = photo({ id: 'a', relativePath: 'wedding.jpg' })
    const b = photo({ id: 'b', relativePath: 'b.jpg' })
    expect(searchPhotos([a, b], 'wedding').map((p) => p.id)).toEqual(['a'])
  })

  it('breaks ties by newest takenAt', () => {
    const a = photo({ id: 'old', relativePath: 'wedding.jpg', takenAtMs: 1 })
    const b = photo({ id: 'new', relativePath: 'wedding.jpg', takenAtMs: 100 })
    expect(searchPhotos([a, b], 'wedding').map((p) => p.id)).toEqual(['new', 'old'])
  })

  it('respects the limit option', () => {
    const photos = Array.from({ length: 10 }, (_, i) =>
      photo({ id: String(i), relativePath: 'kioku.jpg' }),
    )
    expect(searchPhotos(photos, 'kioku', { limit: 3 })).toHaveLength(3)
  })

  it('matches CJK paths via overlapping bigrams', () => {
    const a = photo({ id: 'a', relativePath: '旅行/京都/写真.jpg' })
    const b = photo({ id: 'b', relativePath: 'misc.jpg' })
    expect(searchPhotos([a, b], '京都の写真').map((p) => p.id)).toEqual(['a'])
  })
})
