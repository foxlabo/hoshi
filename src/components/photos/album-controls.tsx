'use client'

import { Loader2, Pencil, Trash2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { deleteAlbumAction, renameAlbumAction } from '@/app/actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { Album } from '@/lib/db/schema'

interface AlbumControlsProps {
  album: Album
}

export function AlbumControls({ album }: AlbumControlsProps) {
  const [title, setTitle] = useState(album.title)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onRename(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const r = await renameAlbumAction({ id: album.id, title })
      if (!r.ok) setError(r.error ?? '失敗しました。')
    })
  }

  function onDelete() {
    startTransition(async () => {
      await deleteAlbumAction(album.id)
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Dialog>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <Pencil className="size-3.5" /> 名前変更
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>アルバム名を変更</DialogTitle>
            <DialogDescription>新しいタイトルを入力してください。</DialogDescription>
          </DialogHeader>
          <form onSubmit={onRename} className="grid gap-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              required
            />
            {error && (
              <p role="alert" className="text-xs text-red-700">
                {error}
              </p>
            )}
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={pending}>
                {pending && <Loader2 className="size-3.5 animate-spin" />} 保存
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog>
        <DialogTrigger asChild>
          <Button size="sm" variant="destructive">
            <Trash2 className="size-3.5" /> 削除
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>アルバムを削除しますか？</DialogTitle>
            <DialogDescription>
              「{album.title}」を削除します。中の写真はライブラリから消えません。
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="destructive" onClick={onDelete} disabled={pending}>
              削除する
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
