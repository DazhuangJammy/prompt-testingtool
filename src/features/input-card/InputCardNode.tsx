import type { NodeProps } from '@xyflow/react'
import { Check, GripVertical, Pencil, X } from 'lucide-react'
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { MarkdownInputPreview } from '@/features/input-card/components/MarkdownInputPreview'
import {
  getInputCardCollapsedMarkdownHeadingIds,
  moveInputSegment,
  normalizeInputCard,
  parseInputCardOutline,
  updateInputCollapsedMarkdownHeadingIds,
  updateInputCardMarkdown,
} from '@/features/input-card/model/inputCard'
import { updateMarkdownOutlineNode } from '@/features/prompt-card/model/markdownEditing'
import {
  findMarkdownOutlineNodeById,
  type MarkdownOutlineNode,
} from '@/features/prompt-card/model/prompt'
import {
  PromptMarkdownEditor,
} from '@/features/prompt-card/components/PromptMarkdownEditor'
import type { InputCardFlowNode } from '@/features/canvas/model/flowTypes'
import { resolveCanvasNodeFrameStyle } from '@/shared/model/nodeFrameStyle'
import { subscribeCanvasCommitActiveEdit } from '@/shared/model/canvasEditEvents'
import { IconButton } from '@/shared/ui/IconButton'
import { CanvasConnectionHandles } from '@/shared/ui/CanvasConnectionHandles'

function InputCardNode({ data, selected }: NodeProps<InputCardFlowNode>) {
  const { card: rawCard, onChange, onSelect, selectedCardId } = data
  const card = normalizeInputCard(rawCard)
  const isSelected = selected || selectedCardId === card.id
  const frameStyle = resolveCanvasNodeFrameStyle(card.frameStyle)
  const nodeStyle = card.frameStyle?.borderColor
    ? ({ '--node-frame-color': frameStyle.borderColor } as CSSProperties)
    : undefined
  const titleInputRef = useRef<HTMLInputElement>(null)
  const markdownTextareaRef = useRef<HTMLTextAreaElement>(null)
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingMarkdown, setEditingMarkdown] = useState(false)
  const [editingNodeId, setEditingNodeId] = useState<string | undefined>()
  const [editingNodeFocus, setEditingNodeFocus] = useState<'title' | 'body'>('body')
  const [editingNodeCursorOffset, setEditingNodeCursorOffset] = useState<number>()
  const [titleDraft, setTitleDraft] = useState(card.title)
  const [markdownDraft, setMarkdownDraft] = useState(card.markdown)
  const [localCollapsedOverride, setLocalCollapsedOverride] = useState<{
    cardId: string
    headingIds: Set<string>
  }>()
  const outline = useMemo(() => parseInputCardOutline(card), [card])
  const persistedCollapsedHeadingIds = useMemo(
    () => new Set(getInputCardCollapsedMarkdownHeadingIds(card)),
    [card],
  )
  const collapsedHeadingIds =
    localCollapsedOverride?.cardId === card.id
      ? localCollapsedOverride.headingIds
      : persistedCollapsedHeadingIds
  const activeEditingNodeId =
    editingNodeId && findMarkdownOutlineNodeById(outline.nodes, editingNodeId)
      ? editingNodeId
      : undefined

  const updateCard = useCallback(
    (nextCard: typeof card) => {
      onChange({ ...nextCard, updatedAt: new Date().toISOString() })
    },
    [onChange],
  )

  const updateCollapsedHeadingIds = useCallback(
    (headingIds: Set<string>) => {
      setLocalCollapsedOverride({
        cardId: card.id,
        headingIds: new Set(headingIds),
      })
      updateCard(updateInputCollapsedMarkdownHeadingIds(card, headingIds))
    },
    [card, updateCard],
  )

  const toggleHeadingCollapse = useCallback(
    (id: string) => {
      const next = new Set(collapsedHeadingIds)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      updateCollapsedHeadingIds(next)
    },
    [collapsedHeadingIds, updateCollapsedHeadingIds],
  )

  const saveTitle = () => {
    const nextTitle = titleDraft.trim() || card.title
    if (nextTitle !== card.title) updateCard({ ...card, title: nextTitle })
    setTitleDraft(nextTitle)
    setEditingTitle(false)
  }

  const saveMarkdown = useCallback(() => {
    const nextMarkdown = markdownDraft.trim()
    updateCard(updateInputCardMarkdown(card, nextMarkdown))
    setMarkdownDraft(nextMarkdown)
    setEditingMarkdown(false)
  }, [card, markdownDraft, updateCard])

  const cancelMarkdownEditing = () => {
    setMarkdownDraft(card.markdown)
    setEditingMarkdown(false)
  }

  const startNodeEditing = (
    node: MarkdownOutlineNode,
    request: { focus: 'title' | 'body'; cursorOffset?: number },
  ) => {
    setEditingMarkdown(false)
    setEditingNodeId(node.id)
    setEditingNodeFocus(request.focus)
    setEditingNodeCursorOffset(request.cursorOffset)
  }

  const saveNode = (node: MarkdownOutlineNode, title: string, body: string) => {
    updateCard(
      updateInputCardMarkdown(
        card,
        updateMarkdownOutlineNode(card.markdown, node, title, body),
      ),
    )
    setEditingNodeId(undefined)
    setEditingNodeCursorOffset(undefined)
  }

  const reorderSegments = (activeId: string, overId: string) => {
    const nextCard = moveInputSegment(card, activeId, overId)
    if (nextCard.markdown === card.markdown) return
    updateCard(nextCard)
  }

  useEffect(() => {
    if (!editingTitle) return
    titleInputRef.current?.focus()
    titleInputRef.current?.select()
  }, [editingTitle])

  useEffect(() => {
    if (!editingMarkdown) return
    markdownTextareaRef.current?.focus()
  }, [editingMarkdown])

  useEffect(() => {
    if (!editingMarkdown) return
    return subscribeCanvasCommitActiveEdit(saveMarkdown)
  }, [editingMarkdown, saveMarkdown])

  return (
    <section
      className={`input-card-node ${isSelected ? 'is-selected' : ''} ${
        frameStyle.highlighted ? 'is-highlighted' : ''
      }`}
      style={nodeStyle}
      onClick={() => onSelect(card.id)}
      onPointerDownCapture={() => onSelect(card.id)}
    >
      <CanvasConnectionHandles />

      <header className="input-card-head input-card-drag-area">
        <GripVertical aria-hidden="true" />
        {editingTitle ? (
          <input
            ref={titleInputRef}
            className="input-card-title"
            value={titleDraft}
            onChange={(event) => setTitleDraft(event.target.value)}
            onBlur={saveTitle}
            onKeyDown={(event) => {
              event.stopPropagation()
              if (event.key === 'Enter') saveTitle()
              if (event.key === 'Escape') {
                setTitleDraft(card.title)
                setEditingTitle(false)
              }
            }}
          />
        ) : (
          <button
            type="button"
            className="input-card-title input-card-title-button"
            onDoubleClick={(event) => {
              event.stopPropagation()
              setTitleDraft(card.title)
              setEditingTitle(true)
            }}
          >
            {card.title}
          </button>
        )}
        <div className="input-card-actions nodrag nopan">
          <IconButton
            icon={editingMarkdown ? <Check /> : <Pencil />}
            label={editingMarkdown ? '完成编辑' : '编辑输入'}
            onClick={editingMarkdown ? saveMarkdown : () => {
              setMarkdownDraft(card.markdown)
              setEditingMarkdown(true)
            }}
          />
          {editingMarkdown && (
            <IconButton
              icon={<X />}
              label="取消编辑"
              onClick={cancelMarkdownEditing}
            />
          )}
        </div>
      </header>

      <div
        className={`input-card-body nodrag nopan nowheel ${
          editingMarkdown ? 'is-editing-markdown' : ''
        }`}
      >
        {editingMarkdown ? (
          <PromptMarkdownEditor
            markdownDraft={markdownDraft}
            markdownTextareaRef={markdownTextareaRef}
            optimizationOpen
            onCancel={cancelMarkdownEditing}
            onChange={setMarkdownDraft}
            onOpenSelectionOptimization={() => undefined}
            onSave={saveMarkdown}
            onUpdateSelection={() => undefined}
          />
        ) : (
          <MarkdownInputPreview
            editingNodeCursorOffset={editingNodeCursorOffset}
            editingNodeFocus={editingNodeFocus}
            editingNodeId={activeEditingNodeId}
            collapsedHeadingIds={collapsedHeadingIds}
            fullMarkdown={card.markdown}
            outline={outline}
            onCancelNodeEdit={() => {
              setEditingNodeId(undefined)
              setEditingNodeCursorOffset(undefined)
            }}
            onEditNode={startNodeEditing}
            onReorderTopLevel={reorderSegments}
            onSaveNode={saveNode}
            onToggleHeading={toggleHeadingCollapse}
          />
        )}
      </div>
    </section>
  )
}

export default memo(InputCardNode)
