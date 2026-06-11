import { Handle, Position, type NodeProps } from '@xyflow/react'
import {
  Check,
  ClipboardCopy,
  Eye,
  GripVertical,
  Import,
  Pencil,
  X,
} from 'lucide-react'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import {
  insertMarkdownChildOutlineNode,
  moveTopLevelMarkdownHeading,
  updateMarkdownOutlineNode,
} from '@/features/prompt-card/model/markdownEditing'
import {
  compilePrompt,
  importMarkdownToPromptCard,
  type MarkdownOutlineNode,
  normalizePromptCard,
  parseMarkdownOutline,
  updatePromptMarkdown,
} from '@/features/prompt-card/model/prompt'
import { IconButton } from '@/shared/ui/IconButton'
import {
  MarkdownCardPreview,
  type MarkdownNodeEditFocus,
} from './components/MarkdownCardPreview'
import { PromptMarkdownPreviewDialog } from './components/PromptMarkdownPreviewDialog'
import type { PromptFlowNode } from './PromptCardNode.types'

function PromptCardNode({ data }: NodeProps<PromptFlowNode>) {
  const {
    card: rawCard,
    selectedCardId,
    onSelect,
    onChange,
  } = data
  const card = normalizePromptCard(rawCard)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [toastState, setToastState] = useState<'idle' | 'copied' | 'imported'>(
    'idle',
  )
  const [importPanelOpen, setImportPanelOpen] = useState(false)
  const [importDraft, setImportDraft] = useState('')
  const copyTimerRef = useRef<number | undefined>(undefined)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const markdownTextareaRef = useRef<HTMLTextAreaElement>(null)
  const pendingCursorIndexRef = useRef<number | undefined>(undefined)
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingMarkdown, setEditingMarkdown] = useState(false)
  const [editingNodeId, setEditingNodeId] = useState<string | undefined>()
  const [editingNodeFocus, setEditingNodeFocus] =
    useState<MarkdownNodeEditFocus>('body')
  const [collapsedHeadingIds, setCollapsedHeadingIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [hovering, setHovering] = useState(false)
  const [titleDraft, setTitleDraft] = useState(card.title)
  const isSelected = selectedCardId === card.id
  const compiledMarkdown = useMemo(() => compilePrompt(card), [card])
  const [markdownDraft, setMarkdownDraft] = useState(compiledMarkdown)
  const outline = useMemo(
    () => parseMarkdownOutline(compiledMarkdown),
    [compiledMarkdown],
  )
  const activeEditingNodeId =
    editingNodeId && findNodeById(outline.nodes, editingNodeId)
      ? editingNodeId
      : undefined

  const updateCard = (nextCard: typeof card) => {
    onChange({ ...nextCard, updatedAt: new Date().toISOString() })
  }

  const showToast = (state: Exclude<typeof toastState, 'idle'>) => {
    setToastState(state)
    window.clearTimeout(copyTimerRef.current)
    copyTimerRef.current = window.setTimeout(() => setToastState('idle'), 1400)
  }

  const copyPromptMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(compiledMarkdown)
      showToast('copied')
    } catch {
      setImportDraft(compiledMarkdown)
      setImportPanelOpen(true)
    }
  }

  const importPromptMarkdown = async () => {
    if (!importDraft.trim()) return
    updateCard(importMarkdownToPromptCard(card, importDraft))
    setImportDraft('')
    setImportPanelOpen(false)
    showToast('imported')
  }

  const openImportPanel = () => {
    setImportDraft('')
    setImportPanelOpen(true)
  }

  const closeImportPanel = () => {
    setImportDraft('')
    setImportPanelOpen(false)
  }

  const handleImportDraftKey = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    event.stopPropagation()
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      void importPromptMarkdown()
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      closeImportPanel()
    }
  }

  const saveTitle = () => {
    const nextTitle = titleDraft.trim() || card.title
    if (nextTitle !== card.title) updateCard({ ...card, title: nextTitle })
    setTitleDraft(nextTitle)
    setEditingTitle(false)
  }

  const startMarkdownEditing = (
    nextDraft = compiledMarkdown,
    cursorIndex?: number,
  ) => {
    pendingCursorIndexRef.current = cursorIndex
    setMarkdownDraft(nextDraft)
    setEditingMarkdown(true)
  }

  const saveMarkdown = () => {
    const nextMarkdown = markdownDraft.trim()
    updateCard(updatePromptMarkdown(card, nextMarkdown))
    setMarkdownDraft(nextMarkdown)
    setEditingMarkdown(false)
  }

  const cancelMarkdownEditing = () => {
    setMarkdownDraft(compiledMarkdown)
    setEditingMarkdown(false)
  }

  const appendChildHeading = (node: MarkdownOutlineNode) => {
    const result = insertMarkdownChildOutlineNode(compiledMarkdown, node)
    const nextCard = updatePromptMarkdown(card, result.markdown)
    updateCard(nextCard)
    setEditingMarkdown(false)
    setEditingNodeId(result.nodeId)
    setEditingNodeFocus('title')
  }

  const startNodeEditing = (
    node: MarkdownOutlineNode,
    focus: MarkdownNodeEditFocus,
  ) => {
    setEditingMarkdown(false)
    setEditingNodeId(node.id)
    setEditingNodeFocus(focus)
  }

  const saveNode = (node: MarkdownOutlineNode, title: string, body: string) => {
    const nextMarkdown = updateMarkdownOutlineNode(
      compiledMarkdown,
      node,
      title,
      body,
    )
    updateCard(updatePromptMarkdown(card, nextMarkdown))
    setEditingNodeId(undefined)
  }

  const reorderTopLevelHeadings = (activeId: string, overId: string) => {
    const nextMarkdown = moveTopLevelMarkdownHeading(
      compiledMarkdown,
      activeId,
      overId,
    )
    if (nextMarkdown === compiledMarkdown) return
    updateCard(updatePromptMarkdown(card, nextMarkdown))
  }

  const toggleHeadingCollapse = (id: string) => {
    setCollapsedHeadingIds((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const stopTextareaKey = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    event.stopPropagation()
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      saveMarkdown()
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      cancelMarkdownEditing()
    }
  }

  useEffect(() => {
    if (!editingTitle) return
    titleInputRef.current?.focus()
    titleInputRef.current?.select()
  }, [editingTitle])

  useEffect(() => {
    if (!editingMarkdown) return
    const textarea = markdownTextareaRef.current
    if (!textarea) return

    textarea.focus()
    const cursorIndex = pendingCursorIndexRef.current
    pendingCursorIndexRef.current = undefined
    if (cursorIndex === undefined) return

    window.requestAnimationFrame(() => {
      const nextIndex = Math.min(cursorIndex, textarea.value.length)
      textarea.setSelectionRange(nextIndex, nextIndex)
    })
  }, [editingMarkdown, markdownDraft])

  return (
    <section
      className={`prompt-node ${isSelected ? 'is-selected' : ''} ${
        hovering ? 'is-hovered' : ''
      }`}
      onClick={() => onSelect(card.id)}
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={() => setHovering(false)}
    >
      <Handle
        id="top"
        className="canvas-connection-handle nodrag nopan"
        position={Position.Top}
        type="source"
      />
      <Handle
        id="left"
        className="canvas-connection-handle nodrag nopan"
        position={Position.Left}
        type="source"
      />
      <Handle
        id="right"
        className="canvas-connection-handle nodrag nopan"
        position={Position.Right}
        type="source"
      />
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
            onBlur={saveTitle}
            onKeyDown={(event) => {
              event.stopPropagation()
              if (event.key === 'Enter') {
                event.preventDefault()
                saveTitle()
              }
              if (event.key === 'Escape') {
                event.preventDefault()
                setTitleDraft(card.title)
                setEditingTitle(false)
              }
            }}
            onKeyUp={(event) => event.stopPropagation()}
            onChange={(event) => setTitleDraft(event.target.value)}
          />
        ) : (
          <div
            className="prompt-title prompt-title-button prompt-node-drag-area"
            role="button"
            tabIndex={0}
            onDoubleClick={() => {
              setTitleDraft(card.title)
              setEditingTitle(true)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                setTitleDraft(card.title)
                setEditingTitle(true)
              }
            }}
          >
            {card.title}
          </div>
        )}
        <div className="prompt-actions nodrag">
          <IconButton
            icon={editingMarkdown ? <Check /> : <Pencil />}
            label={editingMarkdown ? '完成编辑' : '编辑'}
            active={editingMarkdown}
            onClick={editingMarkdown ? saveMarkdown : () => startMarkdownEditing()}
          />
          <IconButton
            icon={<Eye />}
            label="预览"
            onClick={() => setPreviewOpen(true)}
          />
          <IconButton
            icon={<ClipboardCopy />}
            label="复制"
            onClick={copyPromptMarkdown}
          />
          <IconButton
            icon={<Import />}
            label="导入"
            onClick={openImportPanel}
          />
        </div>
        {toastState !== 'idle' && (
          <div className="action-toast">
            {toastState === 'copied' ? '复制成功' : '导入成功'}
          </div>
        )}
      </div>

      {importPanelOpen && (
        <div className="prompt-import-panel nodrag nopan nowheel">
          <div className="prompt-import-head">
            <span>导入 Markdown</span>
            <IconButton icon={<X />} label="取消" onClick={closeImportPanel} />
          </div>
          <textarea
            autoFocus
            value={importDraft}
            onChange={(event) => setImportDraft(event.target.value)}
            onKeyDown={handleImportDraftKey}
            onKeyUp={(event) => event.stopPropagation()}
            placeholder="# 角色&#10;&#10;..."
          />
          <div className="prompt-import-actions">
            <button type="button" onClick={closeImportPanel}>
              取消
            </button>
            <button
              type="button"
              disabled={!importDraft.trim()}
              onClick={importPromptMarkdown}
            >
              导入
            </button>
          </div>
        </div>
      )}

      <div className="prompt-markdown-shell nodrag nopan nowheel">
        {editingMarkdown ? (
          <div className="prompt-markdown-editor">
            <textarea
              ref={markdownTextareaRef}
              value={markdownDraft}
              onChange={(event) => setMarkdownDraft(event.target.value)}
              onCompositionEnd={(event) => setMarkdownDraft(event.currentTarget.value)}
              onKeyDown={stopTextareaKey}
              onKeyUp={(event) => event.stopPropagation()}
              spellCheck={false}
            />
            <div className="prompt-markdown-editor-actions">
              <button type="button" onClick={cancelMarkdownEditing}>
                取消
              </button>
              <button type="button" onClick={saveMarkdown}>
                完成
              </button>
            </div>
          </div>
        ) : (
          <MarkdownCardPreview
            markdown={compiledMarkdown}
            collapsedHeadingIds={collapsedHeadingIds}
            editingNodeFocus={editingNodeFocus}
            editingNodeId={activeEditingNodeId}
            outline={outline}
            onAddChildHeading={appendChildHeading}
            onCancelNodeEdit={() => setEditingNodeId(undefined)}
            onEditNode={startNodeEditing}
            onReorderTopLevel={reorderTopLevelHeadings}
            onSaveNode={saveNode}
            onToggleHeading={toggleHeadingCollapse}
          />
        )}
      </div>
      <Handle
        id="bottom"
        className="canvas-connection-handle nodrag nopan"
        position={Position.Bottom}
        type="source"
      />
      {previewOpen && (
        <PromptMarkdownPreviewDialog
          markdown={compiledMarkdown}
          title={card.title}
          onClose={() => setPreviewOpen(false)}
          onCopy={copyPromptMarkdown}
        />
      )}
    </section>
  )
}

function findNodeById(
  nodes: MarkdownOutlineNode[],
  id: string,
): MarkdownOutlineNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node
    const child = findNodeById(node.children, id)
    if (child) return child
  }

  return undefined
}

export default memo(PromptCardNode)
export type { PromptFlowNode, PromptNodeData } from './PromptCardNode.types'
