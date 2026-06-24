import { X } from 'lucide-react'
import { useState } from 'react'
import { IconButton } from '@/shared/ui/IconButton'

interface QuickPhraseGroupDialogProps {
  onClose: () => void
  onSubmit: (draft: { name: string }) => void
}

export function QuickPhraseGroupDialog({
  onClose,
  onSubmit,
}: QuickPhraseGroupDialogProps) {
  const [name, setName] = useState('')
  const canSubmit = Boolean(name.trim())

  return (
    <div className="nested-dialog-backdrop" onMouseDown={onClose}>
      <form
        className="quick-phrase-dialog quick-phrase-group-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault()
          if (!canSubmit) return
          onSubmit({ name })
        }}
      >
        <div className="quick-phrase-dialog-head">
          <h2>添加分组</h2>
          <IconButton icon={<X />} label="关闭" onClick={onClose} />
        </div>

        <label className="settings-field">
          <span>分组名称</span>
          <input
            autoFocus
            value={name}
            placeholder="例如 常用、写作、复盘"
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <div className="quick-phrase-dialog-actions">
          <button type="button" onClick={onClose}>
            取消
          </button>
          <button type="submit" disabled={!canSubmit}>
            确定
          </button>
        </div>
      </form>
    </div>
  )
}
