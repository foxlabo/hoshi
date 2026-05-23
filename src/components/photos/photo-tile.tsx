import Link from 'next/link'
import type { Photo } from '@/lib/db/schema'

interface PhotoTileProps {
  photo: Photo
  /** Optional pixel size for grid layout; defaults to a square 160. */
  size?: number
}

export function PhotoTile({ photo, size = 160 }: PhotoTileProps) {
  return (
    <Link
      href={`/photo/${photo.id}`}
      className="group relative block overflow-hidden rounded-md bg-zinc-200 transition-transform hover:scale-[1.01]"
      style={{ width: size, height: size }}
    >
      {/* Plain <img> on purpose — the server already produces a 480px JPEG
          thumbnail under .hoshi-thumbs, and we want to bypass Next's image
          optimization pipeline entirely (we own the cache). */}
      {/* biome-ignore lint/performance/noImgElement: see comment above */}
      {/* biome-ignore lint/nursery/useImageSize: we set fixed CSS dimensions */}
      <img
        src={`/api/thumb/${photo.id}`}
        alt={photo.relativePath}
        loading="lazy"
        className="h-full w-full object-cover"
      />
    </Link>
  )
}
