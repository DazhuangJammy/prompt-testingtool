import { LoaderCircle, Sparkles } from 'lucide-react'
import type { KeyboardEvent, RefObject } from 'react'
import type { TextSelectionRange } from '@/features/prompt-card/model/textSelection'

interface PromptMarkdownEditorProps {
  markdownDraft: string
  markdownTextareaRef: RefObject<HTMLTextAreaElement | null>
  selection?: TextSelectionRange
  optimizationOpen: boolean
  selectionOptimizationLoading?: boolean
  onCancel: () => void
  onChange: (value: string) => void
  onOpenSelectionOptimization: () => void
  onSave: () => void
  onUpdateSelection: () => void
}

export function PromptMarkdownEditor({
  markdownDraft,
  markdownTextareaRef,
  selection,
  optimizationOpen,
  selectionOptimizationLoading = false,
  onCancel,
  onChange,
  onOpenSelectionOptimization,
  onSave,
  onUpdateSelection,
}: PromptMarkdownEditorProps) {
  const showSelectionOptimize =
    selectionOptimizationLoading ||
    (Boolean(selection?.text.trim()) && !optimizationOpen)

  const stopTextareaKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    event.stopPropagation()
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      onSave()
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
    }
  }

  return (
    <div className="prompt-markdown-editor">
      <textarea
        ref={markdownTextareaRef}
        value={markdownDraft}
        onChange={(event) => onChange(event.target.value)}
        onCompositionEnd={(event) => onChange(event.currentTarget.value)}
        onMouseUp={onUpdateSelection}
        onSelect={onUpdateSelection}
        onKeyDown={stopTextareaKey}
        onKeyUp={(event) => event.stopPropagation()}
        spellCheck={false}
      />
      {showSelectionOptimize && (
        <button
          type="button"
          className={`prompt-selection-optimize ${
            selectionOptimizationLoading ? 'is-loading' : ''
          }`}
          aria-busy={selectionOptimizationLoading}
          disabled={selectionOptimizationLoading}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (!selectionOptimizationLoading) onOpenSelectionOptimization()
          }}
        >
          {selectionOptimizationLoading ? <LoaderCircle /> : <Sparkles />}
          {selectionOptimizationLoading ? '优化中' : '优化'}
        </button>
      )}
      <div className="prompt-markdown-editor-actions">
        <button type="button" onClick={onCancel}>
          取消
        </button>
        <button type="button" onClick={onSave}>
          完成
        </button>
      </div>
    </div>
  )
}
