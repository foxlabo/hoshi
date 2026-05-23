# Hoshi — Architecture

## Surface

- `/` — timeline of photos grouped by day, newest first. Includes a
  scan button.
- `/photo/[id]` — detail view with full EXIF.
- `/albums` — list of albums.
- `/albums/[id]` — single album view; add/remove photos.
- `/search?q=...` — filename / album search.
- `/api/thumb/[id]` — serves a JPEG thumbnail (Sharp-generated, on-disk cached).
- `/api/photo/[id]` — serves the original image.

## Data model

- `photos(id, relativePath, sha256, width, height, sizeBytes, mimeType,
  takenAtMs, indexedAtMs)` — `sha256` is UNIQUE.
- `albums(id, title, createdAtMs, updatedAtMs)`.
- `album_photos(albumId, photoId, addedAtMs)` — composite PK; FK ON
  DELETE CASCADE both sides.

## File-system safety

`src/lib/photos/paths.ts` exports `resolveInLibrary(relative)` which:

1. Resolves to an absolute path under `HOSHI_LIBRARY_ROOT`.
2. Verifies the resolved path begins with the library root prefix.
3. Throws otherwise.

Every `fs` call goes through this helper. Server routes look photos up by
id in the DB and pass `photo.relativePath` to the helper — clients cannot
inject a path.

## Pure logic

`src/lib/photos/exif.ts`:
- `extractTakenAt(exif, mtimeMs)`: returns `DateTimeOriginal` in ms, or
  `mtimeMs` as a fallback.
- `parseExifDate(value)`: tolerant parser for `'YYYY:MM:DD HH:MM:SS'`,
  ISO 8601, and a few other shapes.

`src/lib/photos/group.ts`:
- `groupByDay(photos[]): { date: string; photos: Photo[] }[]`
- `formatDayHeader(date, locale)`: e.g. "2024年12月25日（水）".

`src/lib/photos/search.ts`:
- `searchPhotos(photos, query)` — substring + CJK bigram tokenization.
  (Same shape as Kioku's, but specialized for filenames.)

## Import flow

1. `pnpm scan` / scan button → `scanLibrary()` walks `HOSHI_LIBRARY_ROOT`.
2. For each image file: read first 64 KiB to compute SHA-256 of the FILE
   STAT (path + size + mtime) — fast incremental, no full hashing on
   re-scan. `sha256` is the full file digest computed on first import.
3. New photos are inserted; existing rows are skipped (UNIQUE on sha256).
4. Thumbnails are generated lazily on first `/api/thumb/[id]` request and
   cached in `.hoshi-thumbs/<id>.jpg`.

## What we deliberately do not have

- Authentication, multi-user, tenants.
- Cloud sync (Google Photos / S3 / Backblaze).
- Face recognition / ML tagging.
- Video files (out of scope for v1).
- Mobile apps. Web only.
