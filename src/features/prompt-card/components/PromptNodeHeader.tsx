import {
  Check,
  ClipboardCopy,
  Eye,
  GripVertical,
  Import,
  Pencil,
  Sparkles,
} from 'lucide-react'
import type { KeyboardEvent, RefObject } from 'react'
import { IconButton } from '@/shared/ui/IconButton'

interface PromptNodeHeaderProps {
  editingMarkdown: boolean
  editingTitle: boolean
  title: string
  titleDraft: string
  titleInputRef: RefObject<HTMLInputElement | null>
  toastState: 'idle' | 'copied' | 'imported' | 'optimized'
  onCancelTitleEdit: () => void
  onChangeTitleDraft: (value: string) => void
  onCopy: () => void
  onEditMarkdown: () => void
  onImport: () => void
  onOptimize: () => void
  onPreview: () => void
  onSaveTitle: () => void
  onStartTitleEdit: () => void
}

export function PromptNodeHeader({
  editingMarkdown,
  editingTitle,
  title,
  titleDraft,
  titleInputRef,
  toastState,
  onCancelTitleEdit,
  onChangeTitleDraft,
  onCopy,
  onEditMarkdown,
  onImport,
  onOptimize,
  onPreview,
  onSaveTitle,
  onStartTitleEdit,
}: PromptNodeHeaderProps) {
  const handleTitleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation()
    if (event.key === 'Enter') {
      event.preventDefault()
      onSaveTitle()
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancelTitleEdit()
    }
  }

  return (
    <div className="prompt-node-head">
      <button
        type="button"
        className="prompt-drag-handle prompt-node-drag-area"
        aria-label="拖拽"
        title="拖拽"
      >
        <GripVertical />
      </button>
      {editingTitle ? (
        <input
          ref={titleInputRef}
          className="prompt-title nodrag"
          value={titleDraft}
          onBlur={onSaveTitle}
          onKeyDown={handleTitleKeyDown}
          onKeyUp={(event) => event.stopPropagation()}
          onChange={(event) => onChangeTitleDraft(event.target.value)}
        />
      ) : (
        <div
          className="prompt-title prompt-title-button prompt-node-drag-area"
          role="button"
          tabIndex={0}
          onDoubleClick={onStartTitleEdit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              onStartTitleEdit()
            }
          }}
        >
          {title}
        </div>
      )}
      <div className="prompt-actions nodrag">
        <IconButton
          icon={editingMarkdown ? <Check /> : <Pencil />}
          label={editingMarkdown ? '完成编辑' : '编辑'}
          active={editingMarkdown}
          onClick={onEditMarkdown}
        />
        <IconButton icon={<Eye />} label="预览" onClick={onPreview} />
        <IconButton icon={<Sparkles />} label="优化" onClick={onOptimize} />
        <IconButton icon={<ClipboardCopy />} label="复制" onClick={onCopy} />
        <IconButton icon={<Import />} label="导入" onClick={onImport} />
      </div>
      {toastState !== 'idle' && (
        <div className="action-toast">
          {toastState === 'copied'
            ? '复制成功'
            : toastState === 'imported'
              ? '导入成功'
              : '优化完成'}
        </div>
      )}
    </div>
  )
}
