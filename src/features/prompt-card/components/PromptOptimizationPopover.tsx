import { Sparkles, X } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { IconButton } from '@/shared/ui/IconButton'

export type PromptOptimizationMode = 'full' | 'selection'

interface PromptOptimizationPopoverProps {
  error?: string
  loading: boolean
  mode: PromptOptimizationMode
  onClose: () => void
  onSubmit: (instruction: string) => void
}

export function PromptOptimizationPopover({
  error,
  loading,
  mode,
  onClose,
  onSubmit,
}: PromptOptimizationPopoverProps) {
  const [instruction, setInstruction] = useState('')
  const canSubmit = Boolean(instruction.trim()) && !loading

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    event.stopPropagation()
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      if (canSubmit) onSubmit(instruction)
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }

  return (
    <div className="prompt-optimization-popover nodrag nopan nowheel">
      <div className="prompt-optimization-head">
        <span>{mode === 'full' ? '优化整张提示词' : '优化选中片段'}</span>
        <IconButton icon={<X />} label="关闭优化" onClick={onClose} />
      </div>
      <textarea
        autoFocus
        value={instruction}
        disabled={loading}
        onChange={(event) => setInstruction(event.target.value)}
        onCompositionEnd={(event) => setInstruction(event.currentTarget.value)}
        onKeyDown={handleKeyDown}
        onKeyUp={(event) => event.stopPropagation()}
        placeholder={
          mode === 'full'
            ? '例如：让结构更清楚，约束更具体'
            : '例如：把这段改得更专业、更短'
        }
      />
      {error && <p className="prompt-optimization-error">{error}</p>}
      <div className="prompt-optimization-actions">
        <button type="button" disabled={loading} onClick={onClose}>
          取消
        </button>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => onSubmit(instruction)}
        >
          <Sparkles size={15} />
          {loading ? '优化中' : '优化'}
        </button>
      </div>
    </div>
  )
}
