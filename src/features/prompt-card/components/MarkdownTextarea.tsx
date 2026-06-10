import { useState, type KeyboardEvent } from 'react'

interface MarkdownTextareaProps {
  value: string
  onCommit: (value: string) => void
}

export function MarkdownTextarea({ value, onCommit }: MarkdownTextareaProps) {
  const [draft, setDraft] = useState(value)

  const stopEditorKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    event.stopPropagation()
  }

  return (
    <textarea
      className="nodrag nopan nowheel"
      value={draft}
      onBlur={() => onCommit(draft)}
      onChange={(event) => setDraft(event.target.value)}
      onCompositionEnd={(event) => setDraft(event.currentTarget.value)}
      onKeyDown={stopEditorKey}
      onKeyUp={stopEditorKey}
    />
  )
}
