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
import { Check, ChevronDown, ChevronRight, Heading2, X } from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react'
import ReactMarkdown from 'react-markdown'
import type {
  MarkdownOutline,
  MarkdownOutlineNode,
} from '@/features/prompt-card/model/prompt'
import { IconButton } from '@/shared/ui/IconButton'

export type MarkdownNodeEditFocus = 'title' | 'body'

interface MarkdownCardPreviewProps {
  collapsedHeadingIds: Set<string>
  editingNodeFocus: MarkdownNodeEditFocus
  editingNodeId?: string
  markdown: string
  outline: MarkdownOutline
  onAddChildHeading: (node: MarkdownOutlineNode) => void
  onCancelNodeEdit: () => void
  onEditNode: (node: MarkdownOutlineNode, focus: MarkdownNodeEditFocus) => void
  onReorderTopLevel: (activeId: string, overId: string) => void
  onSaveNode: (node: MarkdownOutlineNode, title: string, body: string) => void
  onToggleHeading: (id: string) => void
}

export function MarkdownCardPreview({
  collapsedHeadingIds,
  editingNodeFocus,
  editingNodeId,
  markdown,
  outline,
  onAddChildHeading,
  onCancelNodeEdit,
  onEditNode,
  onReorderTopLevel,
  onSaveNode,
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
      <article className="prompt-markdown-preview markdown-preview">
        <ReactMarkdown>{outline.preface}</ReactMarkdown>
      </article>
    )
  }

  return (
    <div className="prompt-outline">
      {outline.preface && (
        <article className="prompt-preface markdown-preview">
          <ReactMarkdown>{outline.preface}</ReactMarkdown>
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
                editingNodeFocus={editingNodeFocus}
                editingNodeId={editingNodeId}
                node={node}
                sortable
                onAddChildHeading={onAddChildHeading}
                onCancelNodeEdit={onCancelNodeEdit}
                onEditNode={onEditNode}
                onSaveNode={onSaveNode}
                onToggleHeading={onToggleHeading}
              />
            ))}
          </SortableContext>
        </DndContext>
      ) : (
        <article className="prompt-markdown-preview markdown-preview">
          <ReactMarkdown>{markdown || ' '}</ReactMarkdown>
        </article>
      )}
    </div>
  )
}

interface MarkdownOutlineSectionProps {
  collapsedHeadingIds: Set<string>
  editingNodeFocus: MarkdownNodeEditFocus
  editingNodeId?: string
  node: MarkdownOutlineNode
  sortable?: boolean
  onAddChildHeading: (node: MarkdownOutlineNode) => void
  onCancelNodeEdit: () => void
  onEditNode: (node: MarkdownOutlineNode, focus: MarkdownNodeEditFocus) => void
  onSaveNode: (node: MarkdownOutlineNode, title: string, body: string) => void
  onToggleHeading: (id: string) => void
}

function MarkdownOutlineSection({
  collapsedHeadingIds,
  editingNodeFocus,
  editingNodeId,
  node,
  sortable = false,
  onAddChildHeading,
  onCancelNodeEdit,
  onEditNode,
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
          focus={editingNodeFocus}
          node={node}
          onCancel={onCancelNodeEdit}
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
        onDoubleClick={() => onEditNode(node, 'title')}
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
          onDoubleClick={() => onEditNode(node, 'body')}
        >
          <ReactMarkdown>{node.ownBody}</ReactMarkdown>
        </article>
      )}
      {!collapsed && node.children.length > 0 && (
        <div className="prompt-outline-children">
          {node.children.map((child) => (
            <MarkdownOutlineSection
              key={child.id}
              collapsedHeadingIds={collapsedHeadingIds}
              editingNodeFocus={editingNodeFocus}
              editingNodeId={editingNodeId}
              node={child}
              onAddChildHeading={onAddChildHeading}
              onCancelNodeEdit={onCancelNodeEdit}
              onEditNode={onEditNode}
              onSaveNode={onSaveNode}
              onToggleHeading={onToggleHeading}
            />
          ))}
        </div>
      )}
    </section>
  )
}

interface MarkdownNodeEditorProps {
  focus: MarkdownNodeEditFocus
  node: MarkdownOutlineNode
  onCancel: () => void
  onSave: (title: string, body: string) => void
}

function MarkdownNodeEditor({
  focus,
  node,
  onCancel,
  onSave,
}: MarkdownNodeEditorProps) {
  const titleRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const [titleDraft, setTitleDraft] = useState(node.title)
  const [bodyDraft, setBodyDraft] = useState(node.ownBody)

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
    target?.focus()
    if (target instanceof HTMLInputElement) target.select()
    if (target instanceof HTMLTextAreaElement) {
      target.setSelectionRange(target.value.length, target.value.length)
    }
  }, [focus])

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
        onChange={(event) => setBodyDraft(event.target.value)}
        onCompositionEnd={(event) => setBodyDraft(event.currentTarget.value)}
      />
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
