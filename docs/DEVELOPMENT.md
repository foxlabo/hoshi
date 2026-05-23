# Hoshi — Development

## Setup

```sh
pnpm install            # auto-builds better-sqlite3 + sharp native bindings
cp .env.example .env.local
pnpm db:generate
pnpm seed:photos        # optional — drops sample JPEGs into ./photos
pnpm dev --port 3500
```

The first request triggers `ensureDbReady()` which applies pending Drizzle
migrations and creates `.hoshi-thumbs/` if missing.

## Scripts

| script              | what it does                              |
|---------------------|-------------------------------------------|
| `pnpm dev`          | Next.js dev server (turbopack)            |
| `pnpm build`        | production build                          |
| `pnpm typecheck`    | `tsc --noEmit`                            |
| `pnpm check`        | Biome lint + format check                 |
| `pnpm check:fix`    | Biome auto-fix                            |
| `pnpm test`         | Vitest unit tests                         |
| `pnpm test:e2e`     | Playwright (boots dev server on 3500)     |
| `pnpm db:generate`  | drizzle-kit migration from `schema.ts`    |
| `pnpm db:push`      | apply migration directly (skips file)     |
| `pnpm seed:photos`  | generate sample JPEGs (`scripts/`)        |

## Layout

```
src/
  app/
    page.tsx                      timeline home
    photo/[id]/page.tsx           detail
    albums/page.tsx
    albums/[id]/page.tsx
    search/page.tsx
    api/photo/[id]/route.ts       original file
    api/thumb/[id]/route.ts       generated thumbnail
    actions.ts                    server actions (scan, album CRUD)
  components/
    ui/...
    photos/...
  lib/
    db/{schema,index,init,queries}.ts
    photos/{paths,exif,group,search,scan,thumbs}.ts
scripts/
  seed-photos.mjs                 sample image generator (sharp)
tests/
  unit/photos/{exif,group,search}.test.ts
```

## Inherited gotchas from the portfolio

- `pnpm.onlyBuiltDependencies` must be in `package.json` BEFORE the first
  `pnpm install`, or rerun install after editing it. Otherwise the
  native bindings (`better-sqlite3`, `sharp`) won't build.
- All pages that read the DB are `export const dynamic = 'force-dynamic'`.
- Server actions cannot run during page render — trigger via form
  submission or `useTransition`.
- File-system access is gated through `resolveInLibrary()`. Never call
  `fs.readFile(somethingClientSupplied)`.
