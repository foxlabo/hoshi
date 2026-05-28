# Hoshi

> A local self-hosted photo library. Point it at a folder, get a fast
> timeline grouped by the date each photo was taken, search by filename,
> and organize into albums.

## Features

- **Index a folder** of `.jpg / .jpeg / .png / .webp / .heic` images.
  Originals stay where they are — Hoshi never modifies them.
- **Day-grouped timeline** using EXIF `DateTimeOriginal`, falling back to
  the file's mtime when EXIF is missing.
- **Sharp-powered thumbnails** cached on disk under `.hoshi-thumbs/`.
- **Photo detail** view with EXIF (camera, lens, exposure) and metadata.
- **Albums** — manual grouping with arbitrary photos.
- **Search** by filename or album name.
- **SHA-256 dedup** — re-scanning is idempotent.

## Stack

- Next.js 16 App Router + React 19.2 + Tailwind 4
- TypeScript strict, Biome (lint + format), Vitest (unit), Playwright (e2e)
- SQLite via better-sqlite3 + Drizzle ORM
- `sharp` for thumbnails, `exifr` for EXIF
- Zod for runtime validation

## Quick start

```sh
cp .env.example .env.local
pnpm install
pnpm db:generate
pnpm seed:photos       # optional — drops a few sample JPEGs into ./photos
pnpm dev --port 3500
```

Open <http://localhost:3500>, click **"スキャン"** to index the library.

To point at your own photo collection, edit `HOSHI_LIBRARY_ROOT` in
`.env.local` (absolute paths work).

## Security note

Hoshi is intended for **local, single-user** use. There is no
authentication; anyone with access to the dev server can browse every
photo in your library root. Do not deploy this to the public internet
as-is.

Hoshi accesses the file system through a single guarded helper that
rejects paths outside the configured library root; clients cannot ask the
server to read arbitrary paths.

## License

MIT — see [LICENSE](LICENSE).
