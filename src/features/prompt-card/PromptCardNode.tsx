import { type NodeProps } from '@xyflow/react'
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import {
  optimizeFullPrompt,
  optimizeSelectedPromptText,
} from '@/features/prompt-card/application/promptOptimizationService'
import { resolveCanvasNodeFrameStyle } from '@/shared/model/nodeFrameStyle'
import {
  insertMarkdownChildOutlineNode,
  moveTopLevelMarkdownHeading,
  updateMarkdownOutlineNode,
} from '@/features/prompt-card/model/markdownEditing'
import {
  compilePrompt,
  findMarkdownOutlineNodeById,
  type MarkdownOutlineNode,
  normalizePromptCard,
  parseMarkdownOutline,
  remapCollapsedMarkdownHeadingIds,
  updatePromptCollapsedMarkdownHeadingIds,
  updatePromptMarkdown,
} from '@/features/prompt-card/model/prompt'
import {
  createTextSelection,
  replaceTextSelection,
  type TextSelectionRange,
} from '@/features/prompt-card/model/textSelection'
import { subscribeCanvasCommitActiveEdit } from '@/shared/model/canvasEditEvents'
import { normalizeThinkingMode } from '@/shared/model/thinking'
import { usePersistentCollapsedHeadings } from './hooks/usePersistentCollapsedHeadings'
import {
  MarkdownCardPreview,
  type MarkdownNodeEditRequest,
  type MarkdownNodeEditFocus,
} from './components/MarkdownCardPreview'
import { PromptImportPanel } from './components/PromptImportPanel'
import { PromptMarkdownEditor } from './components/PromptMarkdownEditor'
import {
  PromptOptimizationPopover,
  type PromptOptimizationMode,
} from './components/PromptOptimizationPopover'
import { PromptCardConnectionHandles } from './components/PromptCardConnectionHandles'
import { PromptMarkdownPreviewDialog } from './components/PromptMarkdownPreviewDialog'
import { PromptNodeHeader } from './components/PromptNodeHeader'
import type { PromptFlowNode } from './PromptCardNode.types'

function PromptCardNode({ data }: NodeProps<PromptFlowNode>) {
  const {
    card: rawCard,
    promptOptimizationProvider,
    promptOptimizationSettings,
    selectedCardId,
    onSelect,
    onChange,
  } = data
  const card = normalizePromptCard(rawCard)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [toastState, setToastState] = useState<'idle' | 'copied' | 'imported' | 'optimized'>('idle')
  const [importPanelOpen, setImportPanelOpen] = useState(false)
  const [importDraft, setImportDraft] = useState('')
  const [optimizationMode, setOptimizationMode] = useState<PromptOptimizationMode>()
  const [optimizationError, setOptimizationError] = useState('')
  const [optimizationLoading, setOptimizationLoading] = useState(false)
  const [selectionOptimization, setSelectionOptimization] = useState<TextSelectionRange>()
  const copyTimerRef = useRef<number | undefined>(undefined)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const markdownTextareaRef = useRef<HTMLTextAreaElement>(null)
  const pendingCursorIndexRef = useRef<number | undefined>(undefined)
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingMarkdown, setEditingMarkdown] = useState(false)
  const [editingNodeId, setEditingNodeId] = useState<string | undefined>()
  const [editingNodeFocus, setEditingNodeFocus] = useState<MarkdownNodeEditFocus>('body')
  const [editingNodeCursorOffset, setEditingNodeCursorOffset] = useState<number | undefined>()
  const [hovering, setHovering] = useState(false)
  const [titleDraft, setTitleDraft] = useState(card.title)
  const isSelected = selectedCardId === card.id
  const frameStyle = resolveCanvasNodeFrameStyle(card.frameStyle)
  const nodeStyle = card.frameStyle?.borderColor
    ? ({ '--node-frame-color': frameStyle.borderColor } as CSSProperties)
    : undefined
  const compiledMarkdown = useMemo(() => compilePrompt(card), [card])
  const generatingFlowPrompt = compiledMarkdown.startsWith('# 生成中')
  const [markdownDraft, setMarkdownDraft] = useState(compiledMarkdown)
  const outline = useMemo(() => parseMarkdownOutline(compiledMarkdown), [compiledMarkdown])
  const activeEditingNodeId =
    editingNodeId && findMarkdownOutlineNodeById(outline.nodes, editingNodeId)
      ? editingNodeId
      : undefined
  const promptOptimizationThinkingMode = normalizeThinkingMode(
    promptOptimizationProvider,
    promptOptimizationSettings?.thinkingMode ?? 'off',
  )

  const updateCard = useCallback(
    (nextCard: typeof card) => {
      onChange({ ...nextCard, updatedAt: new Date().toISOString() })
    },
    [onChange],
  )
  const {
    collapsedHeadingIds,
    setLocalCollapsedHeadingIds,
    toggleHeadingCollapse,
  } = usePersistentCollapsedHeadings({
    card,
    generating: generatingFlowPrompt,
    nodes: outline.nodes,
    onChange: updateCard,
  })

  const updateCardWithMarkdown = useCallback(
    (nextMarkdown: string) => {
      const previousOutline = parseMarkdownOutline(compiledMarkdown)
      const nextOutline = parseMarkdownOutline(nextMarkdown)
      const nextCollapsedHeadingIds = remapCollapsedMarkdownHeadingIds(
        previousOutline,
        nextOutline,
        collapsedHeadingIds,
      )
      setLocalCollapsedHeadingIds(nextCollapsedHeadingIds)
      updateCard(
        updatePromptCollapsedMarkdownHeadingIds(
          updatePromptMarkdown(card, nextMarkdown),
          nextCollapsedHeadingIds,
        ),
      )
    },
    [card, collapsedHeadingIds, compiledMarkdown, setLocalCollapsedHeadingIds, updateCard],
  )

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
    updateCardWithMarkdown(importDraft)
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

  const openFullOptimization = () => {
    setOptimizationError('')
    setSelectionOptimization(undefined)
    setOptimizationMode('full')
  }

  const closeOptimization = () => {
    if (optimizationLoading) return
    setOptimizationMode(undefined)
    setOptimizationError('')
  }

  const updateSelectedText = () => {
    const textarea = markdownTextareaRef.current
    if (!textarea) return
    const selection = createTextSelection(
      textarea.value,
      textarea.selectionStart,
      textarea.selectionEnd,
    )
    setSelectionOptimization(selection)
    return selection
  }

  const openSelectionOptimization = () => {
    const selection = updateSelectedText()
    if (!selection?.text.trim()) return
    setOptimizationError('')
    setOptimizationMode('selection')
  }

  const submitOptimization = async (instruction: string) => {
    const trimmedInstruction = instruction.trim()
    if (!trimmedInstruction || !promptOptimizationProvider) {
      setOptimizationError('请先在设置里选择提示词优化模型')
      return
    }

    setOptimizationLoading(true)
    setOptimizationError('')
    try {
      if (optimizationMode === 'selection') {
        const selection = selectionOptimization
        if (!selection?.text.trim()) {
          setOptimizationError('请先选中要优化的文字')
          return
        }
        const baseMarkdown = markdownDraft
        setOptimizationMode(undefined)
        setEditingMarkdown(true)
        const optimizedText = await optimizeSelectedPromptText({
          instruction: trimmedInstruction,
          onUpdate: (partialText) => {
            setMarkdownDraft(replaceTextSelection(baseMarkdown, selection, partialText))
          },
          promptMarkdown: baseMarkdown,
          provider: promptOptimizationProvider,
          selectedText: selection.text,
          systemPrompt: promptOptimizationSettings?.prompt,
          thinkingMode: promptOptimizationThinkingMode,
        })
        const nextMarkdown = replaceTextSelection(
          baseMarkdown,
          selection,
          optimizedText,
        )
        setMarkdownDraft(nextMarkdown)
        setSelectionOptimization(undefined)
      } else {
        const sourceMarkdown = editingMarkdown ? markdownDraft : compiledMarkdown
        setSelectionOptimization(undefined)
        setOptimizationMode(undefined)
        setMarkdownDraft(sourceMarkdown)
        setEditingMarkdown(true)
        const optimizedPrompt = await optimizeFullPrompt({
          instruction: trimmedInstruction,
          onUpdate: setMarkdownDraft,
          promptMarkdown: sourceMarkdown,
          provider: promptOptimizationProvider,
          systemPrompt: promptOptimizationSettings?.prompt,
          thinkingMode: promptOptimizationThinkingMode,
        })
        updateCardWithMarkdown(optimizedPrompt)
        setMarkdownDraft(optimizedPrompt)
      }

      showToast('optimized')
    } catch (error) {
      setOptimizationError(
        error instanceof Error ? error.message : '优化失败，请稍后重试',
      )
      setOptimizationMode(optimizationMode)
    } finally {
      setOptimizationLoading(false)
    }
  }

  const optimizeInlineSelection = async (
    selectedText: string,
    instruction: string,
    contextMarkdown = compiledMarkdown,
    onUpdate?: (text: string) => void,
  ) => {
    const trimmedInstruction = instruction.trim()
    if (!trimmedInstruction) throw new Error('请填写优化要求')
    if (!promptOptimizationProvider) {
      throw new Error('请先在设置里选择提示词优化模型')
    }

    return optimizeSelectedPromptText({
      instruction: trimmedInstruction,
      onUpdate,
      promptMarkdown: contextMarkdown,
      provider: promptOptimizationProvider,
      selectedText,
      systemPrompt: promptOptimizationSettings?.prompt,
      thinkingMode: promptOptimizationThinkingMode,
    })
  }

  const saveTitle = () => {
    const nextTitle = titleDraft.trim() || card.title
    if (nextTitle !== card.title) updateCard({ ...card, title: nextTitle })
    setTitleDraft(nextTitle)
    setEditingTitle(false)
  }

  const startMarkdownEditing = (nextDraft = compiledMarkdown, cursorIndex?: number) => {
    pendingCursorIndexRef.current = cursorIndex
    setMarkdownDraft(nextDraft)
    setEditingMarkdown(true)
  }

  const saveMarkdown = useCallback(() => {
    const nextMarkdown = markdownDraft.trim()
    updateCardWithMarkdown(nextMarkdown)
    setMarkdownDraft(nextMarkdown)
    setEditingMarkdown(false)
  },
    [markdownDraft, setEditingMarkdown, setMarkdownDraft, updateCardWithMarkdown],
  )

  const cancelMarkdownEditing = () => {
    setMarkdownDraft(compiledMarkdown)
    setEditingMarkdown(false)
  }

  const appendChildHeading = (node: MarkdownOutlineNode) => {
    const result = insertMarkdownChildOutlineNode(compiledMarkdown, node)
    updateCardWithMarkdown(result.markdown)
    setEditingMarkdown(false)
    setEditingNodeId(result.nodeId)
    setEditingNodeFocus('title')
    setEditingNodeCursorOffset(undefined)
  }

  const startNodeEditing = (node: MarkdownOutlineNode, request: MarkdownNodeEditRequest) => {
    setEditingMarkdown(false)
    setEditingNodeId(node.id)
    setEditingNodeFocus(request.focus)
    setEditingNodeCursorOffset(request.cursorOffset)
  }

  const saveNode = (node: MarkdownOutlineNode, title: string, body: string) => {
    const nextMarkdown = updateMarkdownOutlineNode(
      compiledMarkdown,
      node,
      title,
      body,
    )
    updateCardWithMarkdown(nextMarkdown)
    setEditingNodeId(undefined)
    setEditingNodeCursorOffset(undefined)
  }

  const reorderTopLevelHeadings = (activeId: string, overId: string) => {
    const nextMarkdown = moveTopLevelMarkdownHeading(
      compiledMarkdown,
      activeId,
      overId,
    )
    if (nextMarkdown === compiledMarkdown) return
    updateCardWithMarkdown(nextMarkdown)
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

  useEffect(() => {
    if (!editingMarkdown) return
    return subscribeCanvasCommitActiveEdit(saveMarkdown)
  }, [editingMarkdown, saveMarkdown])

  return (
    <section
      className={`prompt-node ${isSelected ? 'is-selected' : ''} ${
        hovering ? 'is-hovered' : ''
      } ${frameStyle.highlighted ? 'is-highlighted' : ''} ${
        generatingFlowPrompt ? 'is-generating-flow-prompt' : ''
      }`}
      style={nodeStyle}
      onClick={() => onSelect(card.id)}
      onPointerDownCapture={() => onSelect(card.id)}
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={() => setHovering(false)}
    >
      <PromptCardConnectionHandles />
      <PromptNodeHeader
        editingMarkdown={editingMarkdown}
        editingTitle={editingTitle}
        title={card.title}
        titleDraft={titleDraft}
        titleInputRef={titleInputRef}
        toastState={toastState}
        onCancelTitleEdit={() => {
          setTitleDraft(card.title)
          setEditingTitle(false)
        }}
        onChangeTitleDraft={setTitleDraft}
        onCopy={copyPromptMarkdown}
        onEditMarkdown={editingMarkdown ? saveMarkdown : () => startMarkdownEditing()}
        onImport={openImportPanel}
        onOptimize={openFullOptimization}
        onPreview={() => setPreviewOpen(true)}
        onSaveTitle={saveTitle}
        onStartTitleEdit={() => {
          setTitleDraft(card.title)
          setEditingTitle(true)
        }}
      />

      {optimizationMode && (
        <PromptOptimizationPopover
          error={optimizationError}
          loading={optimizationLoading}
          mode={optimizationMode}
          onClose={closeOptimization}
          onSubmit={submitOptimization}
        />
      )}

      {importPanelOpen && (
        <PromptImportPanel
          draft={importDraft}
          onCancel={closeImportPanel}
          onChange={setImportDraft}
          onImport={importPromptMarkdown}
        />
      )}

      <div className="prompt-markdown-shell nodrag nopan nowheel">
        {editingMarkdown ? (
          <PromptMarkdownEditor
            markdownDraft={markdownDraft}
            markdownTextareaRef={markdownTextareaRef}
            optimizationOpen={Boolean(optimizationMode) || optimizationLoading}
            selection={selectionOptimization}
            selectionOptimizationLoading={!optimizationMode && optimizationLoading}
            onCancel={cancelMarkdownEditing}
            onChange={(value) => {
              setMarkdownDraft(value)
              setSelectionOptimization(undefined)
            }}
            onOpenSelectionOptimization={openSelectionOptimization}
            onSave={saveMarkdown}
            onUpdateSelection={updateSelectedText}
          />
        ) : (
          <MarkdownCardPreview
            markdown={compiledMarkdown}
            collapsedHeadingIds={collapsedHeadingIds}
            editingNodeCursorOffset={editingNodeCursorOffset}
            editingNodeFocus={editingNodeFocus}
            editingNodeId={activeEditingNodeId}
            outline={outline}
            onAddChildHeading={appendChildHeading}
            onCancelNodeEdit={() => {
              setEditingNodeId(undefined)
              setEditingNodeCursorOffset(undefined)
            }}
            onEditMarkdown={(cursorOffset) =>
              startMarkdownEditing(compiledMarkdown, cursorOffset)
            }
            onEditNode={startNodeEditing}
            onOptimizeSelection={optimizeInlineSelection}
            onReorderTopLevel={reorderTopLevelHeadings}
            onSaveNode={saveNode}
            onToggleHeading={toggleHeadingCollapse}
          />
        )}
      </div>
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

export default memo(PromptCardNode)
export type { PromptFlowNode, PromptNodeData } from './PromptCardNode.types'
