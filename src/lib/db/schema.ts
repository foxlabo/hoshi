import { integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { nanoid } from 'nanoid'

const nowMs = (name: string) =>
  integer(name)
    .notNull()
    .$defaultFn(() => Date.now())

export const photos = sqliteTable(
  'photos',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => nanoid()),
    /** Path relative to HOSHI_LIBRARY_ROOT, with forward slashes. Stable across OS. */
    relativePath: text('relative_path').notNull(),
    /** SHA-256 of the full file — used to dedupe across re-scans. UNIQUE. */
    sha256: text('sha256').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    mimeType: text('mime_type').notNull(),
    /** EXIF DateTimeOriginal in ms; falls back to file mtime when missing. */
    takenAtMs: integer('taken_at_ms').notNull(),
    indexedAtMs: nowMs('indexed_at_ms'),
    /** Compact EXIF subset for the detail view — JSON-encoded. */
    exifJson: text('exif_json').notNull().default('{}'),
  },
  (table) => [uniqueIndex('photos_sha256_unique').on(table.sha256)],
)

export const albums = sqliteTable('albums', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => nanoid()),
  title: text('title').notNull(),
  createdAtMs: nowMs('created_at_ms'),
  updatedAtMs: nowMs('updated_at_ms'),
})

export const albumPhotos = sqliteTable(
  'album_photos',
  {
    albumId: text('album_id')
      .notNull()
      .references(() => albums.id, { onDelete: 'cascade' }),
    photoId: text('photo_id')
      .notNull()
      .references(() => photos.id, { onDelete: 'cascade' }),
    addedAtMs: nowMs('added_at_ms'),
  },
  (table) => [primaryKey({ columns: [table.albumId, table.photoId] })],
)

export type Photo = typeof photos.$inferSelect
export type NewPhoto = typeof photos.$inferInsert
export type Album = typeof albums.$inferSelect
export type NewAlbum = typeof albums.$inferInsert
export type AlbumPhoto = typeof albumPhotos.$inferSelect
