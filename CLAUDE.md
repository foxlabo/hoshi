# CLAUDE.md — Hoshi

Context for AI coding agents working on this repo.

## Project intent

Hoshi is a portfolio-grade clean-room reimagining of `Immich`: a local
self-hosted photo library. Index a directory of images, browse a timeline
by date taken, manage albums. Quality over speed.

## Hard rules

- **No code copy from Immich.** Reading its docs for understanding is fine.
- **TypeScript strict.** No `any` without a `// reason:` comment.
- **No `console.log`** in committed code.
- **Originals are read-only.** The importer / web server never writes to
  the library root. Caches go under `.hoshi-thumbs/`.
- **Pure logic** (EXIF date parsing, day grouping, search) gets Vitest tests.
- Conventional Commits, small and atomic.

## Stack reminders

- Next.js **16** App Router (docs in `node_modules/next/dist/docs/`)
- React 19.2, Tailwind **4** (configured via CSS)
- `sharp` for thumbnails, `exifr` for metadata extraction
- Drizzle ORM + `better-sqlite3`
- Local SQLite at `./hoshi.db`. WAL + `foreign_keys = ON`.

## Architecture rules

- File system access is gated through a single helper that rejects paths
  outside the configured library root (`HOSHI_LIBRARY_ROOT`). No raw
  client-supplied paths ever reach `fs`.
- Thumbnail / original photo API routes look up the photo by ID in the DB
  and serve the resolved absolute path. Never trust path parameters.
- Pure helpers live in `src/lib/photos/`: EXIF date extraction, day
  grouping, search.
- Server Components must not pass functions as props to Client Components.

## Security model

- Local-only single user. No auth. README spells this out.
- The library root is server-configured; nothing client-side can change it.
- The dev server listens on localhost by default — do not expose it.

## Before claiming done

Run `pnpm typecheck && pnpm check && pnpm test`. For UI, verify in a real
browser — `next build` does not render dynamic routes so runtime bugs slip
past.
