import { createReadStream, existsSync } from 'node:fs'
import { mkdir, rename } from 'node:fs/promises'
import { resolve } from 'node:path'
import { Readable } from 'node:stream'
import sharp from 'sharp'
import { resolveInLibrary } from './paths'

const THUMB_DIR = resolve(process.cwd(), '.hoshi-thumbs')
const THUMB_MAX = 480

/** Absolute path of the cached thumbnail file for a photo id. */
export function thumbPath(photoId: string): string {
  // `photoId` is a server-generated nanoid → safe to use in a filename.
  // Strip anything pathological just in case (only the id-allowed alphabet survives).
  const safe = photoId.replace(/[^A-Za-z0-9_-]/g, '')
  if (safe.length === 0) throw new Error('empty photo id')
  return resolve(THUMB_DIR, `${safe}.jpg`)
}

/** In-process map of pending thumbnail builds. Multiple concurrent
 *  requests for the same photo share the same generation promise instead
 *  of racing on the same output file. */
const pending = new Map<string, Promise<string>>()

/**
 * Produce a JPEG thumbnail (max edge 480 px) for the supplied photo and
 * cache it on disk. Idempotent — if the cache file already exists, the
 * thumbnail isn't regenerated. Writes go to a unique temp name first and
 * are renamed atomically into place so concurrent generators can't tear
 * the cached output.
 *
 * Server-only.
 */
export async function ensureThumb(photoId: string, photoRelativePath: string): Promise<string> {
  const out = thumbPath(photoId)
  if (existsSync(out)) return out
  const existing = pending.get(photoId)
  if (existing) return existing

  const job = (async () => {
    await mkdir(THUMB_DIR, { recursive: true })
    // Re-check after the directory exists in case another request raced us.
    if (existsSync(out)) return out
    const original = resolveInLibrary(photoRelativePath)
    const tmp = `${out}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    await sharp(original, { failOn: 'none' })
      .rotate() // honor EXIF orientation
      .resize({ width: THUMB_MAX, height: THUMB_MAX, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toFile(tmp)
    // Atomic on POSIX; on Windows `rename` over an existing file fails, so
    // we tolerate that race by deleting the tmp if the cache already won.
    try {
      await rename(tmp, out)
    } catch {
      try {
        const { unlink } = await import('node:fs/promises')
        await unlink(tmp)
      } catch {
        // best-effort cleanup
      }
    }
    return out
  })()
  pending.set(photoId, job)
  try {
    return await job
  } finally {
    pending.delete(photoId)
  }
}

export { THUMB_DIR }

/**
 * Streaming helper for route handlers. `Readable.toWeb()` translates
 * Node-side pause/resume into Web-stream `pull` backpressure, so a slow
 * client doesn't force the whole file into memory.
 */
export function readFileStream(absolute: string): ReadableStream<Uint8Array> {
  const node = createReadStream(absolute)
  // The `as ReadableStream<Uint8Array>` cast: Node's Readable.toWeb()
  // returns `ReadableStream<any>` in the .d.ts; the runtime always emits
  // Uint8Array for unencoded streams, so we narrow the type for callers.
  // biome-ignore lint/suspicious/noExplicitAny: see comment
  return Readable.toWeb(node) as unknown as ReadableStream<Uint8Array>
}
