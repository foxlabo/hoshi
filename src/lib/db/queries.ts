import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { db, sqliteHandle } from './index'
import {
  type Album,
  albumPhotos,
  albums,
  type NewAlbum,
  type NewPhoto,
  type Photo,
  photos,
} from './schema'

// --- photos -----------------------------------------------------------------

export function listPhotos(limit?: number): Photo[] {
  const q = db.select().from(photos).orderBy(desc(photos.takenAtMs))
  return limit !== undefined ? q.limit(limit).all() : q.all()
}

export function getPhoto(id: string): Photo | undefined {
  return db.select().from(photos).where(eq(photos.id, id)).get()
}

export function getPhotoBySha256(sha256: string): Photo | undefined {
  return db.select().from(photos).where(eq(photos.sha256, sha256)).get()
}

export function insertPhoto(values: Omit<NewPhoto, 'indexedAtMs'>): Photo | undefined {
  return db.insert(photos).values(values).onConflictDoNothing().returning().get()
}

export function deletePhoto(id: string): void {
  db.delete(photos).where(eq(photos.id, id)).run()
}

export function countPhotos(): number {
  const row = sqliteHandle.prepare('SELECT COUNT(*) AS c FROM photos').get() as { c: number }
  return row.c
}

// --- albums -----------------------------------------------------------------

export function listAlbums(): Album[] {
  return db.select().from(albums).orderBy(asc(albums.title)).all()
}

export function getAlbum(id: string): Album | undefined {
  return db.select().from(albums).where(eq(albums.id, id)).get()
}

export function createAlbum(title: string): Album {
  const values: NewAlbum = { title }
  return db.insert(albums).values(values).returning().get()
}

export function renameAlbum(id: string, title: string): Album | undefined {
  return db
    .update(albums)
    .set({ title, updatedAtMs: Date.now() })
    .where(eq(albums.id, id))
    .returning()
    .get()
}

export function deleteAlbum(id: string): void {
  db.delete(albums).where(eq(albums.id, id)).run()
}

// --- album_photos -----------------------------------------------------------

export function listAlbumPhotos(albumId: string): Photo[] {
  const rows = db
    .select()
    .from(albumPhotos)
    .innerJoin(photos, eq(photos.id, albumPhotos.photoId))
    .where(eq(albumPhotos.albumId, albumId))
    .orderBy(desc(photos.takenAtMs))
    .all()
  return rows.map((r) => r.photos)
}

export function countAlbumPhotos(albumId: string): number {
  const row = sqliteHandle
    .prepare('SELECT COUNT(*) AS c FROM album_photos WHERE album_id = ?')
    .get(albumId) as { c: number }
  return row.c
}

export function listAlbumsForPhoto(photoId: string): Album[] {
  const rows = db
    .select()
    .from(albumPhotos)
    .innerJoin(albums, eq(albums.id, albumPhotos.albumId))
    .where(eq(albumPhotos.photoId, photoId))
    .all()
  return rows.map((r) => r.albums)
}

export function addPhotoToAlbum(albumId: string, photoId: string): void {
  db.insert(albumPhotos).values({ albumId, photoId }).onConflictDoNothing().run()
}

export function removePhotoFromAlbum(albumId: string, photoId: string): void {
  db.delete(albumPhotos)
    .where(and(eq(albumPhotos.albumId, albumId), eq(albumPhotos.photoId, photoId)))
    .run()
}

/** Cover thumbnail for an album = most recent photo by takenAt, if any. */
export function getAlbumCovers(albumIds: string[]): Map<string, Photo | undefined> {
  const out = new Map<string, Photo | undefined>()
  for (const id of albumIds) out.set(id, undefined)
  if (albumIds.length === 0) return out
  const rows = db
    .select({ albumId: albumPhotos.albumId, photo: photos })
    .from(albumPhotos)
    .innerJoin(photos, eq(photos.id, albumPhotos.photoId))
    .where(inArray(albumPhotos.albumId, albumIds))
    .orderBy(desc(photos.takenAtMs))
    .all()
  for (const row of rows) {
    if (!out.get(row.albumId)) out.set(row.albumId, row.photo)
  }
  return out
}
