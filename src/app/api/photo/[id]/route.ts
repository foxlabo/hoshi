import { stat } from 'node:fs/promises'
import { z } from 'zod'
import { ensureDbReady } from '@/lib/db/init'
import { getPhoto } from '@/lib/db/queries'
import { resolveInLibrary } from '@/lib/photos/paths'
import { readFileStream } from '@/lib/photos/thumbs'

const ID_SCHEMA = z.string().min(1).max(64)

interface RouteContext {
  params: Promise<{ id: string }>
}

function logError(scope: string, err: unknown): void {
  // biome-ignore lint/suspicious/noConsole: server-side observability for opaque error responses
  console.error(`[hoshi/${scope}]`, err)
}

/**
 * Serve the original image file. Lookup is by ID — `relativePath` is taken
 * from the DB and routed through `resolveInLibrary()` so a client can
 * never ask for an arbitrary file.
 */
export async function GET(_req: Request, ctx: RouteContext) {
  try {
    const { id } = await ctx.params
    if (!ID_SCHEMA.safeParse(id).success) {
      return new Response('Bad id', { status: 400 })
    }
    ensureDbReady()
    const photo = getPhoto(id)
    if (!photo) return new Response('Not found', { status: 404 })
    const absolute = resolveInLibrary(photo.relativePath)
    const st = await stat(absolute)
    return new Response(readFileStream(absolute), {
      headers: {
        'content-type': photo.mimeType,
        'content-length': String(st.size),
        // Originals are content-addressed by sha256 → safe to cache aggressively.
        'cache-control': 'private, max-age=86400',
        etag: `"${photo.sha256}"`,
      },
    })
  } catch (err) {
    logError('photo', err)
    return new Response('Internal error', { status: 500 })
  }
}
