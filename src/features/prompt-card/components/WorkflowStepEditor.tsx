import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2 } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import type { WorkflowStep } from '@/shared/types'
import { IconButton } from '@/shared/ui/IconButton'

interface WorkflowStepEditorProps {
  step: WorkflowStep
  onChange: (step: WorkflowStep) => void
  onDelete: () => void
}

export function WorkflowStepEditor({
  step,
  onChange,
  onDelete,
}: WorkflowStepEditorProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: step.id })
  const [titleDraft, setTitleDraft] = useState(step.title)
  const [markdownDraft, setMarkdownDraft] = useState(step.markdown)

  const stopEditorKey = (event: KeyboardEvent<HTMLElement>) => {
    event.stopPropagation()
  }

  return (
    <div
      className="workflow-step nodrag nopan nowheel"
      onKeyDown={stopEditorKey}
      onKeyUp={stopEditorKey}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button className="drag-handle" type="button" {...attributes} {...listeners}>
        <GripVertical />
      </button>
      <input
        className="nodrag nopan nowheel"
        value={titleDraft}
        onBlur={() => onChange({ ...step, title: titleDraft })}
        onChange={(event) => setTitleDraft(event.target.value)}
        onCompositionEnd={(event) => setTitleDraft(event.currentTarget.value)}
        onKeyDown={stopEditorKey}
        onKeyUp={stopEditorKey}
      />
      <IconButton icon={<Trash2 />} label="删除" onClick={onDelete} />
      <textarea
        className="nodrag nopan nowheel"
        value={markdownDraft}
        onBlur={() => onChange({ ...step, markdown: markdownDraft })}
        onChange={(event) => setMarkdownDraft(event.target.value)}
        onCompositionEnd={(event) => setMarkdownDraft(event.currentTarget.value)}
        onKeyDown={stopEditorKey}
        onKeyUp={stopEditorKey}
      />
    </div>
  )
}
