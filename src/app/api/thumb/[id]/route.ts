import { stat } from 'node:fs/promises'
import { z } from 'zod'
import { ensureDbReady } from '@/lib/db/init'
import { getPhoto } from '@/lib/db/queries'
import { ensureThumb, readFileStream } from '@/lib/photos/thumbs'

const ID_SCHEMA = z.string().min(1).max(64)

interface RouteContext {
  params: Promise<{ id: string }>
}

function logError(scope: string, err: unknown): void {
  // biome-ignore lint/suspicious/noConsole: server-side observability for opaque error responses
  console.error(`[hoshi/${scope}]`, err)
}

/** Generate (if missing) and serve the JPEG thumbnail for a photo. */
export async function GET(_req: Request, ctx: RouteContext) {
  try {
    const { id } = await ctx.params
    if (!ID_SCHEMA.safeParse(id).success) {
      return new Response('Bad id', { status: 400 })
    }
    ensureDbReady()
    const photo = getPhoto(id)
    if (!photo) return new Response('Not found', { status: 404 })
    const path = await ensureThumb(photo.id, photo.relativePath)
    const st = await stat(path)
    return new Response(readFileStream(path), {
      headers: {
        'content-type': 'image/jpeg',
        'content-length': String(st.size),
        // Thumbs are deterministic for a given photo → safe to cache.
        'cache-control': 'private, max-age=86400',
        etag: `"thumb-${photo.sha256}"`,
      },
    })
  } catch (err) {
    logError('thumb', err)
    return new Response('Internal error', { status: 500 })
  }
}
