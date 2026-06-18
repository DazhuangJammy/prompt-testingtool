import { X } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import { IconButton } from '@/shared/ui/IconButton'

interface PromptImportPanelProps {
  draft: string
  onCancel: () => void
  onChange: (value: string) => void
  onImport: () => void
}

export function PromptImportPanel({
  draft,
  onCancel,
  onChange,
  onImport,
}: PromptImportPanelProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    event.stopPropagation()
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      onImport()
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
    }
  }

  return (
    <div className="prompt-import-panel nodrag nopan nowheel">
      <div className="prompt-import-head">
        <span>导入 Markdown</span>
        <IconButton icon={<X />} label="取消" onClick={onCancel} />
      </div>
      <textarea
        autoFocus
        value={draft}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onKeyUp={(event) => event.stopPropagation()}
        placeholder="# 角色&#10;&#10;..."
      />
      <div className="prompt-import-actions">
        <button type="button" onClick={onCancel}>
          取消
        </button>
        <button type="button" disabled={!draft.trim()} onClick={onImport}>
          导入
        </button>
      </div>
    </div>
  )
}
