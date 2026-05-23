'use client'

import { Loader2, RefreshCw } from 'lucide-react'
import { useState, useTransition } from 'react'
import { scanLibraryAction } from '@/app/actions'
import { Button } from '@/components/ui/button'

export function ScanButton() {
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<{
    kind: 'ok' | 'error'
    text: string
  } | null>(null)

  function onClick() {
    setStatus(null)
    startTransition(async () => {
      const r = await scanLibraryAction()
      if (!r.ok) {
        setStatus({ kind: 'error', text: r.error ?? 'スキャンに失敗しました。' })
        return
      }
      const summary = `スキャン完了: ${r.inserted}件追加・${r.skipped}件スキップ・${r.errors}件エラー`
      if (r.truncated) {
        // Tell the user the scan stopped early so they know to re-run.
        setStatus({
          kind: 'error',
          text: `${summary}（処理上限に達したため打ち切りました — もう一度スキャンしてください）`,
        })
      } else {
        setStatus({ kind: 'ok', text: summary })
      }
    })
  }

  return (
    <div className="flex items-center gap-3">
      <Button size="sm" variant="outline" onClick={onClick} disabled={pending}>
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
        スキャン
      </Button>
      {status && (
        <span
          className={
            status.kind === 'ok'
              ? 'text-xs text-emerald-700'
              : 'text-xs text-red-700'
          }
          role="status"
        >
          {status.text}
        </span>
      )}
    </div>
  )
}
