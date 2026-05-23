'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { ensureDbReady } from '@/lib/db/init'
import {
  addPhotoToAlbum,
  createAlbum,
  deleteAlbum,
  removePhotoFromAlbum,
  renameAlbum,
} from '@/lib/db/queries'
import { scanLibrary } from '@/lib/photos/scan'

const ID_SCHEMA = z.string().min(1).max(64)
const TITLE_SCHEMA = z.string().trim().min(1).max(120)

export interface ScanResult {
  ok: boolean
  scanned: number
  inserted: number
  skipped: number
  errors: number
  /** True when the scan stopped early because a per-scan budget was hit. */
  truncated?: boolean
  error?: string
}

/** Walk the library and import any new images. */
export async function scanLibraryAction(): Promise<ScanResult> {
  ensureDbReady()
  try {
    const r = await scanLibrary()
    revalidatePath('/')
    revalidatePath('/albums')
    return {
      ok: true,
      scanned: r.scanned,
      inserted: r.inserted,
      skipped: r.skipped,
      errors: r.errors.length,
      truncated: r.truncated === true ? true : undefined,
    }
  } catch (err) {
    return {
      ok: false,
      scanned: 0,
      inserted: 0,
      skipped: 0,
      errors: 1,
      error: err instanceof Error ? err.message : 'scan failed',
    }
  }
}

export interface ActionResult {
  ok: boolean
  error?: string
}

const createAlbumSchema = z.object({ title: TITLE_SCHEMA })

export async function createAlbumAction(formData: FormData): Promise<ActionResult> {
  ensureDbReady()
  const parsed = createAlbumSchema.safeParse({ title: formData.get('title') })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid title.' }
  }
  const album = createAlbum(parsed.data.title)
  revalidatePath('/albums')
  redirect(`/albums/${album.id}`)
}

const renameAlbumSchema = z.object({ id: ID_SCHEMA, title: TITLE_SCHEMA })

export async function renameAlbumAction(input: {
  id: string
  title: string
}): Promise<ActionResult> {
  ensureDbReady()
  const parsed = renameAlbumSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }
  const updated = renameAlbum(parsed.data.id, parsed.data.title)
  if (!updated) return { ok: false, error: 'Album not found.' }
  revalidatePath('/albums')
  revalidatePath(`/albums/${parsed.data.id}`)
  return { ok: true }
}

const deleteAlbumSchema = z.object({ id: ID_SCHEMA })

export async function deleteAlbumAction(id: string): Promise<void> {
  ensureDbReady()
  const parsed = deleteAlbumSchema.safeParse({ id })
  if (!parsed.success) return
  deleteAlbum(parsed.data.id)
  revalidatePath('/albums')
  redirect('/albums')
}

const membershipSchema = z.object({
  albumId: ID_SCHEMA,
  photoId: ID_SCHEMA,
})

export async function addPhotoToAlbumAction(input: {
  albumId: string
  photoId: string
}): Promise<ActionResult> {
  ensureDbReady()
  const parsed = membershipSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid input.' }
  addPhotoToAlbum(parsed.data.albumId, parsed.data.photoId)
  revalidatePath(`/albums/${parsed.data.albumId}`)
  revalidatePath(`/photo/${parsed.data.photoId}`)
  return { ok: true }
}

export async function removePhotoFromAlbumAction(input: {
  albumId: string
  photoId: string
}): Promise<ActionResult> {
  ensureDbReady()
  const parsed = membershipSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid input.' }
  removePhotoFromAlbum(parsed.data.albumId, parsed.data.photoId)
  revalidatePath(`/albums/${parsed.data.albumId}`)
  revalidatePath(`/photo/${parsed.data.photoId}`)
  return { ok: true }
}
