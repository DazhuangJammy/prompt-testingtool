import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { resizeTextAreaToContent } from '@/shared/ui/textCaret'

interface MarkdownTextareaProps {
  value: string
  onCommit: (value: string) => void
}

export function MarkdownTextarea({ value, onCommit }: MarkdownTextareaProps) {
  const [draft, setDraft] = useState(value)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    window.requestAnimationFrame(() => {
      resizeTextAreaToContent(textarea, { minHeight: 132, maxHeight: 420 })
    })
  }, [draft])

  const stopEditorKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    event.stopPropagation()
  }

  return (
    <textarea
      ref={textareaRef}
      className="nodrag nopan nowheel"
      value={draft}
      onBlur={() => onCommit(draft)}
      onChange={(event) => {
        setDraft(event.target.value)
        resizeTextAreaToContent(event.currentTarget, {
          minHeight: 132,
          maxHeight: 420,
        })
      }}
      onCompositionEnd={(event) => setDraft(event.currentTarget.value)}
      onKeyDown={stopEditorKey}
      onKeyUp={stopEditorKey}
    />
  )
}
