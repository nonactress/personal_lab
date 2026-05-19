import { useState } from 'react'
import { useApp } from '@/context/AppContext'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

export function FixesSection() {
  const { result } = useApp()
  const [copied, setCopied] = useState(false)
  if (!result) return null

  const text = (result.fix_prompts ?? []).join('\n\n---\n\n')

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-semibold text-base text-slate-100">Vibe Coding Fix Prompts</div>
          <div className="text-xs mt-0.5 text-slate-500">Cursor / v0 / Claude에 붙여넣으세요</div>
        </div>
        <Button variant="outline" size="sm" onClick={copy}>
          {copied ? '✓ 복사됨' : '복사'}
        </Button>
      </div>
      <Textarea readOnly rows={10} value={text} />
    </div>
  )
}
