import {
  DndContext,
  PointerSensor,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { CSSProperties } from 'react'
import {
  MarkdownNodeEditor,
} from '@/features/prompt-card/components/MarkdownNodeEditor'
import type {
  MarkdownOutline,
  MarkdownOutlineNode,
} from '@/features/prompt-card/model/prompt'
import { MarkdownRenderer } from '@/shared/ui/MarkdownRenderer'
import { getTextOffsetFromPoint } from '@/shared/ui/textCaret'

interface MarkdownInputPreviewProps {
  collapsedHeadingIds: Set<string>
  editingNodeCursorOffset?: number
  editingNodeFocus: 'title' | 'body'
  editingNodeId?: string
  fullMarkdown: string
  outline: MarkdownOutline
  onCancelNodeEdit: () => void
  onEditNode: (
    node: MarkdownOutlineNode,
    request: { focus: 'title' | 'body'; cursorOffset?: number },
  ) => void
  onReorderTopLevel: (activeId: string, overId: string) => void
  onSaveNode: (node: MarkdownOutlineNode, title: string, body: string) => void
  onToggleHeading: (id: string) => void
}

export function MarkdownInputPreview({
  collapsedHeadingIds,
  editingNodeCursorOffset,
  editingNodeFocus,
  editingNodeId,
  fullMarkdown,
  outline,
  onCancelNodeEdit,
  onEditNode,
  onReorderTopLevel,
  onSaveNode,
  onToggleHeading,
}: MarkdownInputPreviewProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    onReorderTopLevel(String(active.id), String(over.id))
  }

  if (!outline.nodes.length) {
    return (
      <article className="input-card-empty markdown-preview">
        <MarkdownRenderer preserveLineBreaks protectSpecialBlockHeadings>
          {outline.preface || '用 # 标题拆分要发送的输入'}
        </MarkdownRenderer>
      </article>
    )
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext
        items={outline.nodes.map((node) => node.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="input-outline">
          {outline.nodes.map((node) => (
            <InputOutlineSection
              key={node.id}
              collapsedHeadingIds={collapsedHeadingIds}
              editingNodeCursorOffset={editingNodeCursorOffset}
              editingNodeFocus={editingNodeFocus}
              editingNodeId={editingNodeId}
              fullMarkdown={fullMarkdown}
              node={node}
              onCancelNodeEdit={onCancelNodeEdit}
              onEditNode={onEditNode}
              onSaveNode={onSaveNode}
              onToggleHeading={onToggleHeading}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

interface InputOutlineSectionProps {
  collapsedHeadingIds: Set<string>
  editingNodeCursorOffset?: number
  editingNodeFocus: 'title' | 'body'
  editingNodeId?: string
  fullMarkdown: string
  node: MarkdownOutlineNode
  onCancelNodeEdit: () => void
  onEditNode: (
    node: MarkdownOutlineNode,
    request: { focus: 'title' | 'body'; cursorOffset?: number },
  ) => void
  onSaveNode: (node: MarkdownOutlineNode, title: string, body: string) => void
  onToggleHeading: (id: string) => void
}

function InputOutlineSection({
  collapsedHeadingIds,
  editingNodeCursorOffset,
  editingNodeFocus,
  editingNodeId,
  fullMarkdown,
  node,
  onCancelNodeEdit,
  onEditNode,
  onSaveNode,
  onToggleHeading,
}: InputOutlineSectionProps) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: node.id, disabled: Boolean(editingNodeId) })
  const collapsed = collapsedHeadingIds.has(node.id)
  const hasContent = Boolean(node.body)
  const isEditing = editingNodeId === node.id
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as CSSProperties

  if (isEditing) {
    return (
      <section className="input-outline-section is-editing" ref={setNodeRef} style={style}>
        <MarkdownNodeEditor
          cursorOffset={editingNodeCursorOffset}
          focus={editingNodeFocus}
          fullMarkdown={fullMarkdown}
          node={node}
          onCancel={onCancelNodeEdit}
          onSave={(title, body) => onSaveNode(node, title, body)}
        />
      </section>
    )
  }

  return (
    <section
      className={`input-outline-section ${collapsed ? 'is-collapsed' : ''} ${
        isDragging ? 'is-dragging' : ''
      }`}
      ref={setNodeRef}
      style={style}
    >
      <div className="input-outline-heading">
        <button
          type="button"
          className="input-outline-toggle nodrag nopan"
          aria-label={collapsed ? '展开标题' : '折叠标题'}
          disabled={!hasContent}
          onDoubleClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            onToggleHeading(node.id)
          }}
        >
          {collapsed ? <ChevronRight /> : <ChevronDown />}
        </button>
        <div
          className="input-outline-drag-target"
          onDoubleClick={(event) => {
            const title = event.currentTarget.querySelector<HTMLElement>('strong')
            const offset = title
              ? getTextOffsetFromPoint(title, event.clientX, event.clientY)
              : undefined
            onEditNode(node, { focus: 'title', cursorOffset: offset })
          }}
          {...attributes}
          {...listeners}
        >
          <strong>{node.title}</strong>
        </div>
      </div>
      {!collapsed && node.body && (
        <article
          className="input-outline-body markdown-preview"
          onDoubleClick={(event) => {
            const offset = getTextOffsetFromPoint(
              event.currentTarget,
              event.clientX,
              event.clientY,
            )
            onEditNode(node, { focus: 'body', cursorOffset: offset })
          }}
        >
          <MarkdownRenderer preserveLineBreaks protectSpecialBlockHeadings>
            {node.body}
          </MarkdownRenderer>
        </article>
      )}
    </section>
  )
}
