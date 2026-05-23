'use client'

import { Check, Loader2, Plus } from 'lucide-react'
import { useState, useTransition } from 'react'
import { addPhotoToAlbumAction, removePhotoFromAlbumAction } from '@/app/actions'
import { Button } from '@/components/ui/button'
import type { Album } from '@/lib/db/schema'
import { cn } from '@/lib/utils'

interface AlbumMembershipProps {
  photoId: string
  allAlbums: Album[]
  /** IDs of albums this photo is currently in. */
  initiallyIn: string[]
}

export function AlbumMembership({ photoId, allAlbums, initiallyIn }: AlbumMembershipProps) {
  const [inSet, setInSet] = useState<Set<string>>(() => new Set(initiallyIn))
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function toggle(albumId: string) {
    setPendingId(albumId)
    startTransition(async () => {
      if (inSet.has(albumId)) {
        await removePhotoFromAlbumAction({ albumId, photoId })
        setInSet((s) => {
          const next = new Set(s)
          next.delete(albumId)
          return next
        })
      } else {
        await addPhotoToAlbumAction({ albumId, photoId })
        setInSet((s) => new Set(s).add(albumId))
      }
      setPendingId(null)
    })
  }

  if (allAlbums.length === 0) {
    return (
      <p className="text-xs text-zinc-500">
        アルバムがまだありません。アルバム画面から作成してください。
      </p>
    )
  }

  return (
    <ul className="grid gap-1.5">
      {allAlbums.map((a) => {
        const member = inSet.has(a.id)
        return (
          <li key={a.id}>
            <Button
              type="button"
              size="sm"
              variant={member ? 'default' : 'outline'}
              className="w-full justify-between"
              onClick={() => toggle(a.id)}
              disabled={pendingId === a.id}
            >
              <span className={cn('truncate', member && 'font-medium')}>{a.title}</span>
              {pendingId === a.id ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : member ? (
                <Check className="size-3.5" />
              ) : (
                <Plus className="size-3.5" />
              )}
            </Button>
          </li>
        )
      })}
    </ul>
  )
}
