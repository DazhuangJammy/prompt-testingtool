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
import { ChevronDown, ChevronRight, Heading2 } from 'lucide-react'
import { type CSSProperties } from 'react'
import type {
  MarkdownOutline,
  MarkdownOutlineNode,
} from '@/features/prompt-card/model/prompt'
import { IconButton } from '@/shared/ui/IconButton'
import { MarkdownRenderer } from '@/shared/ui/MarkdownRenderer'
import { getTextOffsetFromPoint } from '@/shared/ui/textCaret'
import {
  MarkdownNodeEditor,
  type OptimizeMarkdownSelection,
} from './MarkdownNodeEditor'

export type MarkdownNodeEditFocus = 'title' | 'body'
export interface MarkdownNodeEditRequest {
  focus: MarkdownNodeEditFocus
  cursorOffset?: number
}

interface MarkdownCardPreviewProps {
  collapsedHeadingIds: Set<string>
  editingNodeFocus: MarkdownNodeEditFocus
  editingNodeCursorOffset?: number
  editingNodeId?: string
  markdown: string
  outline: MarkdownOutline
  onAddChildHeading: (node: MarkdownOutlineNode) => void
  onCancelNodeEdit: () => void
  onEditMarkdown?: (cursorOffset?: number) => void
  onEditNode: (node: MarkdownOutlineNode, request: MarkdownNodeEditRequest) => void
  onReorderTopLevel: (activeId: string, overId: string) => void
  onSaveNode: (node: MarkdownOutlineNode, title: string, body: string) => void
  onOptimizeSelection?: OptimizeMarkdownSelection
  onToggleHeading: (id: string) => void
}

export function MarkdownCardPreview({
  collapsedHeadingIds,
  editingNodeFocus,
  editingNodeCursorOffset,
  editingNodeId,
  markdown,
  outline,
  onAddChildHeading,
  onCancelNodeEdit,
  onEditMarkdown,
  onEditNode,
  onReorderTopLevel,
  onSaveNode,
  onOptimizeSelection,
  onToggleHeading,
}: MarkdownCardPreviewProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    onReorderTopLevel(String(active.id), String(over.id))
  }

  if (outline.preface && !outline.nodes.length) {
    return (
      <article
        className="prompt-markdown-preview markdown-preview"
        onDoubleClick={(event) => {
          onEditMarkdown?.(
            getTextOffsetFromPoint(
              event.currentTarget,
              event.clientX,
              event.clientY,
            ),
          )
        }}
      >
        <MarkdownRenderer>{outline.preface}</MarkdownRenderer>
      </article>
    )
  }

  return (
    <div className="prompt-outline">
      {outline.preface && (
        <article
          className="prompt-preface markdown-preview"
          onDoubleClick={(event) => {
            onEditMarkdown?.(
              getTextOffsetFromPoint(
                event.currentTarget,
                event.clientX,
                event.clientY,
              ),
            )
          }}
        >
          <MarkdownRenderer>{outline.preface}</MarkdownRenderer>
        </article>
      )}
      {outline.nodes.length ? (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext
            items={outline.nodes.map((node) => node.id)}
            strategy={verticalListSortingStrategy}
          >
            {outline.nodes.map((node) => (
              <MarkdownOutlineSection
                key={node.id}
                collapsedHeadingIds={collapsedHeadingIds}
                editingNodeCursorOffset={editingNodeCursorOffset}
                editingNodeFocus={editingNodeFocus}
                editingNodeId={editingNodeId}
                node={node}
                sortable
                fullMarkdown={markdown}
                onAddChildHeading={onAddChildHeading}
                onCancelNodeEdit={onCancelNodeEdit}
                onEditNode={onEditNode}
                onOptimizeSelection={onOptimizeSelection}
                onSaveNode={onSaveNode}
                onToggleHeading={onToggleHeading}
              />
            ))}
          </SortableContext>
        </DndContext>
      ) : (
        <article
          className="prompt-markdown-preview markdown-preview"
          onDoubleClick={(event) => {
            onEditMarkdown?.(
              getTextOffsetFromPoint(
                event.currentTarget,
                event.clientX,
                event.clientY,
              ),
            )
          }}
        >
          <MarkdownRenderer>{markdown || ' '}</MarkdownRenderer>
        </article>
      )}
    </div>
  )
}

interface MarkdownOutlineSectionProps {
  collapsedHeadingIds: Set<string>
  editingNodeCursorOffset?: number
  editingNodeFocus: MarkdownNodeEditFocus
  editingNodeId?: string
  node: MarkdownOutlineNode
  sortable?: boolean
  fullMarkdown: string
  onAddChildHeading: (node: MarkdownOutlineNode) => void
  onCancelNodeEdit: () => void
  onEditNode: (node: MarkdownOutlineNode, request: MarkdownNodeEditRequest) => void
  onSaveNode: (node: MarkdownOutlineNode, title: string, body: string) => void
  onOptimizeSelection?: OptimizeMarkdownSelection
  onToggleHeading: (id: string) => void
}

function MarkdownOutlineSection({
  collapsedHeadingIds,
  editingNodeCursorOffset,
  editingNodeFocus,
  editingNodeId,
  fullMarkdown,
  node,
  sortable = false,
  onAddChildHeading,
  onCancelNodeEdit,
  onEditNode,
  onOptimizeSelection,
  onSaveNode,
  onToggleHeading,
}: MarkdownOutlineSectionProps) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: node.id, disabled: !sortable || Boolean(editingNodeId) })
  const collapsed = collapsedHeadingIds.has(node.id)
  const hasContent = Boolean(node.ownBody || node.children.length)
  const isEditing = editingNodeId === node.id
  const style = {
    '--heading-depth': node.depth,
    transform: CSS.Transform.toString(transform),
    transition,
  } as CSSProperties

  if (isEditing) {
    return (
      <section
        className="prompt-outline-section is-editing"
        ref={sortable ? setNodeRef : undefined}
        style={style}
      >
        <MarkdownNodeEditor
          cursorOffset={editingNodeCursorOffset}
          focus={editingNodeFocus}
          fullMarkdown={fullMarkdown}
          node={node}
          onCancel={onCancelNodeEdit}
          onOptimizeSelection={onOptimizeSelection}
          onSave={(title, body) => onSaveNode(node, title, body)}
        />
      </section>
    )
  }

  return (
    <section
      className={`prompt-outline-section ${sortable ? 'is-sortable' : ''} ${
        collapsed ? 'is-collapsed' : ''
      } ${isDragging ? 'is-dragging' : ''}`}
      ref={sortable ? setNodeRef : undefined}
      style={style}
    >
      <div
        className="prompt-outline-heading"
        onDoubleClick={(event) => {
          const title = event.currentTarget.querySelector<HTMLElement>('strong')
          const offset = title
            ? getTextOffsetFromPoint(title, event.clientX, event.clientY)
            : undefined
          onEditNode(node, { focus: 'title', cursorOffset: offset })
        }}
        {...(sortable ? attributes : {})}
        {...(sortable ? listeners : {})}
      >
        <button
          type="button"
          className="prompt-outline-toggle"
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
        <strong>{node.title}</strong>
        <IconButton
          icon={<Heading2 />}
          label="新增下级标题"
          onDoubleClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            onAddChildHeading(node)
          }}
        />
      </div>
      {!collapsed && node.ownBody && (
        <article
          className="prompt-outline-body markdown-preview"
          onDoubleClick={(event) => {
            const offset = getTextOffsetFromPoint(
              event.currentTarget,
              event.clientX,
              event.clientY,
            )
            onEditNode(node, { focus: 'body', cursorOffset: offset })
          }}
        >
          <MarkdownRenderer>{node.ownBody}</MarkdownRenderer>
        </article>
      )}
      {!collapsed && node.children.length > 0 && (
        <div className="prompt-outline-children">
          {node.children.map((child) => (
            <MarkdownOutlineSection
              key={child.id}
              collapsedHeadingIds={collapsedHeadingIds}
              editingNodeCursorOffset={editingNodeCursorOffset}
              editingNodeFocus={editingNodeFocus}
              editingNodeId={editingNodeId}
              fullMarkdown={fullMarkdown}
              node={child}
              onAddChildHeading={onAddChildHeading}
              onCancelNodeEdit={onCancelNodeEdit}
              onEditNode={onEditNode}
              onOptimizeSelection={onOptimizeSelection}
              onSaveNode={onSaveNode}
              onToggleHeading={onToggleHeading}
            />
          ))}
        </div>
      )}
    </section>
  )
}
