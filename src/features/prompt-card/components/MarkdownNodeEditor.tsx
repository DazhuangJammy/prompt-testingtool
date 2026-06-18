import { Check, LoaderCircle, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { updateMarkdownOutlineNode } from '@/features/prompt-card/model/markdownEditing'
import type { MarkdownOutlineNode } from '@/features/prompt-card/model/prompt'
import {
  createTextSelection,
  replaceTextSelection,
  type TextSelectionRange,
} from '@/features/prompt-card/model/textSelection'
import { IconButton } from '@/shared/ui/IconButton'
import {
  placeTextControlCaret,
  resizeTextAreaToContent,
} from '@/shared/ui/textCaret'
import { PromptOptimizationPopover } from './PromptOptimizationPopover'

const LOCAL_BODY_TEXTAREA_SIZE = { minHeight: 118 }

export type OptimizeMarkdownSelection = (
  selectedText: string,
  instruction: string,
  contextMarkdown: string,
  onUpdate?: (text: string) => void,
) => Promise<string>

interface MarkdownNodeEditorProps {
  focus: 'title' | 'body'
  cursorOffset?: number
  fullMarkdown: string
  node: MarkdownOutlineNode
  onCancel: () => void
  onOptimizeSelection?: OptimizeMarkdownSelection
  onSave: (title: string, body: string) => void
}

export function MarkdownNodeEditor({
  focus,
  cursorOffset,
  fullMarkdown,
  node,
  onCancel,
  onOptimizeSelection,
  onSave,
}: MarkdownNodeEditorProps) {
  const titleRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const [titleDraft, setTitleDraft] = useState(node.title)
  const [bodyDraft, setBodyDraft] = useState(node.ownBody)
  const [selection, setSelection] = useState<TextSelectionRange>()
  const [optimizing, setOptimizing] = useState(false)
  const [optimizationError, setOptimizationError] = useState('')
  const [optimizationOpen, setOptimizationOpen] = useState(false)

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    event.stopPropagation()
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      onSave(titleDraft, bodyDraft)
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
    }
  }

  useEffect(() => {
    const target = focus === 'body' ? bodyRef.current : titleRef.current
    if (target instanceof HTMLInputElement) {
      window.requestAnimationFrame(() => {
        placeTextControlCaret(target, cursorOffset)
      })
    }
    if (target instanceof HTMLTextAreaElement) {
      window.requestAnimationFrame(() => {
        resizeTextAreaToContent(target, LOCAL_BODY_TEXTAREA_SIZE)
        placeTextControlCaret(target, cursorOffset)
      })
    }
  }, [cursorOffset, focus])

  useEffect(() => {
    const textarea = bodyRef.current
    if (!textarea) return
    window.requestAnimationFrame(() => {
      resizeTextAreaToContent(textarea, LOCAL_BODY_TEXTAREA_SIZE)
    })
  }, [bodyDraft])

  const updateBodySelection = () => {
    const textarea = bodyRef.current
    if (!textarea) return
    setSelection(
      createTextSelection(
        textarea.value,
        textarea.selectionStart,
        textarea.selectionEnd,
      ),
    )
  }
  const showSelectionOptimize = Boolean(
    onOptimizeSelection &&
      (optimizing || (selection?.text.trim() && !optimizationOpen)),
  )

  const submitSelectionOptimization = async (instruction: string) => {
    if (!selection?.text.trim() || !onOptimizeSelection) return
    const baseBodyDraft = bodyDraft
    const currentSelection = selection
    setOptimizing(true)
    setOptimizationError('')
    setOptimizationOpen(false)
    try {
      const contextMarkdown = updateMarkdownOutlineNode(
        fullMarkdown,
        node,
        titleDraft,
        baseBodyDraft,
      )
      const replacement = await onOptimizeSelection(
        currentSelection.text,
        instruction,
        contextMarkdown,
        (partialText) => {
          setBodyDraft(
            replaceTextSelection(baseBodyDraft, currentSelection, partialText),
          )
        },
      )
      setBodyDraft(replaceTextSelection(baseBodyDraft, currentSelection, replacement))
      setSelection(undefined)
    } catch (error) {
      setOptimizationError(
        error instanceof Error ? error.message : '优化失败，请稍后重试',
      )
      setOptimizationOpen(true)
    } finally {
      setOptimizing(false)
    }
  }

  return (
    <div
      className="prompt-node-local-editor nodrag nopan nowheel"
      onKeyDown={handleKeyDown}
      onKeyUp={(event) => event.stopPropagation()}
    >
      <input
        ref={titleRef}
        value={titleDraft}
        onChange={(event) => setTitleDraft(event.target.value)}
        onCompositionEnd={(event) => setTitleDraft(event.currentTarget.value)}
      />
      <textarea
        ref={bodyRef}
        value={bodyDraft}
        onChange={(event) => {
          setBodyDraft(event.target.value)
          resizeTextAreaToContent(event.currentTarget, LOCAL_BODY_TEXTAREA_SIZE)
          setSelection(undefined)
        }}
        onCompositionEnd={(event) => setBodyDraft(event.currentTarget.value)}
        onMouseUp={updateBodySelection}
        onSelect={updateBodySelection}
      />
      {showSelectionOptimize && (
        <button
          type="button"
          className={`prompt-selection-optimize is-local ${
            optimizing ? 'is-loading' : ''
          }`}
          aria-busy={optimizing}
          disabled={optimizing}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (!optimizing) setOptimizationOpen(true)
          }}
        >
          {optimizing ? <LoaderCircle /> : <Sparkles />}
          {optimizing ? '优化中' : '优化'}
        </button>
      )}
      {optimizationOpen && (
        <PromptOptimizationPopover
          error={optimizationError}
          loading={optimizing}
          mode="selection"
          onClose={() => {
            if (!optimizing) setOptimizationOpen(false)
          }}
          onSubmit={submitSelectionOptimization}
        />
      )}
      <div className="prompt-node-local-editor-actions">
        <IconButton icon={<X />} label="取消局部编辑" onClick={onCancel} />
        <IconButton
          icon={<Check />}
          label="完成局部编辑"
          onClick={() => onSave(titleDraft, bodyDraft)}
        />
      </div>
    </div>
  )
}
