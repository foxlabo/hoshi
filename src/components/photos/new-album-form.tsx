'use client'

import { Loader2, Plus } from 'lucide-react'
import { useState, useTransition } from 'react'
import { createAlbumAction } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function NewAlbumForm() {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const r = await createAlbumAction(formData)
      if (!r.ok) setError(r.error ?? 'Failed.')
    })
  }

  return (
    <form action={onSubmit} className="flex items-end gap-2">
      <div className="flex-1">
        <label htmlFor="album-title" className="mb-1 block text-xs font-medium text-zinc-700">
          新しいアルバム
        </label>
        <Input
          id="album-title"
          name="title"
          required
          maxLength={120}
          placeholder="家族写真 / 旅行 …"
        />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
        作成
      </Button>
      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
    </form>
  )
}
