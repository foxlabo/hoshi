import { lstatSync, realpathSync } from 'node:fs'
import { isAbsolute, resolve, sep } from 'node:path'

/**
 * Resolve `HOSHI_LIBRARY_ROOT` once at module load. Cached so a malformed
 * env value fails loudly the first time it's used (during DB init), not
 * silently when a photo request arrives.
 *
 * We cache BOTH the configured root and its real (symlink-resolved) form
 * — every containment check uses the real form so a symlink inside the
 * library can't redirect us outside.
 */
let cachedRoot: string | null = null
let cachedRealRoot: string | null = null

export function libraryRoot(): string {
  if (cachedRoot !== null) return cachedRoot
  const raw = process.env.HOSHI_LIBRARY_ROOT ?? './photos'
  const abs = isAbsolute(raw) ? raw : resolve(process.cwd(), raw)
  cachedRoot = abs
  return abs
}

function realLibraryRoot(): string {
  if (cachedRealRoot !== null) return cachedRealRoot
  const abs = libraryRoot()
  try {
    cachedRealRoot = realpathSync.native(abs)
  } catch {
    // Library root doesn't exist yet — that's fine, treat the configured
    // path as the real root. We still containment-check children below.
    cachedRealRoot = abs
  }
  return cachedRealRoot
}

/** Reset for tests. Not used in production. */
export function _resetLibraryRoot(): void {
  cachedRoot = null
  cachedRealRoot = null
}

/**
 * Resolve a path RELATIVE to the library root to an absolute path, and
 * verify the result still sits inside the root after symlink resolution.
 * Throws if:
 *   - the input is absolute, empty, or contains a NUL byte,
 *   - the lexical resolution escapes the root (e.g. `../etc`),
 *   - the resolved path is a symlink/junction/reparse point (we never
 *     follow), or
 *   - the realpath of any parent component lands outside the real root.
 *
 * All `fs` access in the server must go through this helper.
 */
export function resolveInLibrary(relative: string): string {
  const root = libraryRoot()
  if (typeof relative !== 'string' || relative.length === 0) {
    throw new Error('relative path is empty')
  }
  if (isAbsolute(relative)) {
    throw new Error(`absolute path not allowed: ${relative}`)
  }
  if (relative.includes('\0')) {
    throw new Error('null byte in path')
  }
  const abs = resolve(root, relative)
  // Lexical containment first — cheap rejection of `..` escapes.
  const rootWithSep = root.endsWith(sep) ? root : root + sep
  if (!abs.startsWith(rootWithSep)) {
    throw new Error(`path escapes library root: ${relative}`)
  }
  // Reject symlinks / Windows reparse points outright. `lstat` does NOT
  // follow the link, so we see the link itself rather than its target.
  try {
    const lst = lstatSync(abs)
    if (lst.isSymbolicLink()) {
      throw new Error(`symlinks are not allowed: ${relative}`)
    }
  } catch (err) {
    // ENOENT is fine — caller may be probing for existence. Propagate
    // anything else (including our own "symlinks not allowed").
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
  }
  // Real-path check on the full chain — catches a symlink anywhere in the
  // ancestry (e.g. `./photos/junk -> /etc`).
  try {
    const realAbs = realpathSync.native(abs)
    const realRoot = realLibraryRoot()
    const realRootWithSep = realRoot.endsWith(sep) ? realRoot : realRoot + sep
    if (!realAbs.startsWith(realRootWithSep) && realAbs !== realRoot) {
      throw new Error(`real path escapes library root: ${relative}`)
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
  }
  return abs
}

/** Normalise a path returned by `path.relative()` (which uses the OS sep)
 *  to a stable forward-slash form for storage. */
export function toRelativePath(absolute: string): string {
  const root = libraryRoot()
  if (!absolute.startsWith(root)) {
    throw new Error(`path is not inside library root: ${absolute}`)
  }
  const stripped = absolute.slice(root.length).replace(/^[\\/]+/, '')
  return stripped.split(sep).join('/')
}

/** True if the filename's lowercase extension is one of the supported image types. */
const SUPPORTED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'])
export function isSupportedImage(filename: string): boolean {
  const idx = filename.lastIndexOf('.')
  if (idx < 0) return false
  return SUPPORTED_EXT.has(filename.slice(idx).toLowerCase())
}

export function mimeForExt(filename: string): string {
  const idx = filename.lastIndexOf('.')
  const ext = idx >= 0 ? filename.slice(idx).toLowerCase() : ''
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.webp':
      return 'image/webp'
    case '.heic':
      return 'image/heic'
    case '.heif':
      return 'image/heif'
    default:
      return 'application/octet-stream'
  }
}
