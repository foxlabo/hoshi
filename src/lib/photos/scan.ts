import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
// reason: `exifr`'s type declarations are loose; `parse()` accepts a path string.
// biome-ignore lint/style/useImportType: runtime call
import exifr from 'exifr'
import sharp from 'sharp'
import { ensureDbReady } from '@/lib/db/init'
import { getPhotoBySha256, insertPhoto } from '@/lib/db/queries'
import { compactExif, extractTakenAt } from './exif'
import { isSupportedImage, libraryRoot, mimeForExt, toRelativePath } from './paths'

const MAX_FILE_BYTES = 200 * 1024 * 1024 // 200 MiB — covers most modern JPEG/PNG.
/** Hard cap on how many SUPPORTED-IMAGE candidates a single scan will
 *  examine. Non-image files (videos, sidecars) don't count against this so
 *  they can't starve a hostile library of real photo budget. */
const MAX_IMAGE_CANDIDATES_PER_SCAN = 50_000
/** Hard cap on directories traversed — guards against pathological trees. */
const MAX_DIRS_PER_SCAN = 10_000

export interface ScanReport {
  scanned: number
  inserted: number
  skipped: number
  errors: Array<{ relativePath: string; message: string }>
  /** True iff scanning stopped because a budget was hit. */
  truncated?: boolean
}

/** Module-level single-flight: a second scanLibrary() call awaits the same
 *  in-flight promise rather than re-walking the whole tree. */
let inFlight: Promise<ScanReport> | null = null

interface WalkBudget {
  /** How many more directories the walker may descend into. */
  dirsRemaining: number
  /** How many more SUPPORTED-IMAGE candidates the walker may yield. A
   *  hostile library packed with non-image sidecar files can no longer
   *  exhaust the budget before we reach a single photo. */
  candidatesRemaining: number
  /** Set to true when we stopped early because a budget was hit. */
  truncated: boolean
}

async function* walk(dir: string, budget: WalkBudget): AsyncGenerator<string> {
  if (budget.candidatesRemaining <= 0 || budget.dirsRemaining <= 0) {
    budget.truncated = true
    return
  }
  budget.dirsRemaining--
  // Force the string overload of readdir — the buffer overload trips the type checker.
  let entries: import('node:fs').Dirent[]
  try {
    entries = await readdir(dir, { withFileTypes: true, encoding: 'utf8' })
  } catch {
    return
  }
  for (const entry of entries) {
    if (budget.candidatesRemaining <= 0 || budget.dirsRemaining < 0) {
      budget.truncated = true
      return
    }
    const name = entry.name
    const full = join(dir, name)
    if (entry.isSymbolicLink()) {
      // Never follow symlinks — they can loop or escape the library.
      continue
    }
    if (entry.isDirectory()) {
      // Skip dot-folders and the thumbnail cache so we don't recurse forever.
      if (name.startsWith('.')) continue
      yield* walk(full, budget)
    } else if (entry.isFile()) {
      if (!isSupportedImage(name)) continue
      budget.candidatesRemaining--
      yield full
    }
  }
}

async function sha256OfFile(absolute: string): Promise<string> {
  const hash = createHash('sha256')
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(absolute)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolve())
    stream.on('error', (err) => reject(err))
  })
  return hash.digest('hex')
}

/**
 * Walk `HOSHI_LIBRARY_ROOT`, index any new image file. Idempotent — files
 * whose SHA-256 already exists in the DB are skipped. Returns a summary.
 *
 * Single-flight: concurrent callers share the same in-flight scan rather
 * than each starting their own.
 *
 * Server-only (uses `fs` + `sharp`). Never call from a Client Component.
 */
export function scanLibrary(): Promise<ScanReport> {
  if (inFlight) return inFlight
  inFlight = (async () => {
    try {
      return await runScan()
    } finally {
      inFlight = null
    }
  })()
  return inFlight
}

async function runScan(): Promise<ScanReport> {
  ensureDbReady()
  const root = libraryRoot()
  const report: ScanReport = { scanned: 0, inserted: 0, skipped: 0, errors: [] }
  const budget: WalkBudget = {
    dirsRemaining: MAX_DIRS_PER_SCAN,
    candidatesRemaining: MAX_IMAGE_CANDIDATES_PER_SCAN,
    truncated: false,
  }

  for await (const absolute of walk(root, budget)) {
    // walk() only yields supported-image candidates — no second filter needed.
    report.scanned++
    let rel = ''
    try {
      // Compute relative from root in forward-slash form for storage.
      rel = relative(root, absolute).split(sep).join('/')
      const st = await stat(absolute)
      if (st.size > MAX_FILE_BYTES) {
        report.errors.push({ relativePath: rel, message: 'file too large' })
        continue
      }
      const sha = await sha256OfFile(absolute)
      if (getPhotoBySha256(sha)) {
        report.skipped++
        continue
      }
      // sharp.metadata() is cheap — reads the header only.
      const meta = await sharp(absolute).metadata()
      if (!meta.width || !meta.height) {
        report.errors.push({ relativePath: rel, message: 'unreadable image' })
        continue
      }
      let exif: Record<string, unknown> | null = null
      try {
        exif = (await exifr.parse(absolute, {
          pick: [
            'DateTimeOriginal',
            'CreateDate',
            'ModifyDate',
            'OffsetTimeOriginal',
            'OffsetTime',
            'Make',
            'Model',
            'LensModel',
            'FNumber',
            'ExposureTime',
            'ISO',
            'FocalLength',
            'FocalLengthIn35mmFormat',
            'Orientation',
          ],
        })) as Record<string, unknown> | null
      } catch {
        exif = null
      }
      const takenAtMs = extractTakenAt(exif, st.mtimeMs)
      const inserted = insertPhoto({
        relativePath: toRelativePath(absolute),
        sha256: sha,
        width: meta.width,
        height: meta.height,
        sizeBytes: st.size,
        // Prefer the extension-based MIME so the original-serving route
        // returns a consistent type regardless of how sharp internally
        // classified the file (e.g. .heic → image/heic, not image/heif).
        mimeType: mimeForExt(absolute),
        takenAtMs,
        exifJson: JSON.stringify(compactExif(exif)),
      })
      if (inserted) report.inserted++
      else report.skipped++
    } catch (err) {
      report.errors.push({
        relativePath: rel,
        message: err instanceof Error ? err.message : 'unknown error',
      })
    }
  }
  if (budget.truncated) report.truncated = true
  return report
}
