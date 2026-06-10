import { useCallback, useEffect, useRef } from 'react'
import type { Edge, ReactFlowInstance } from '@xyflow/react'
import { pasteCanvasClipboard } from '@/features/canvas/application/canvasService'
import type { CanvasFlowNode } from '@/features/canvas/model/canvasFlowMapping'
import {
  createCanvasClipboard,
  type CanvasClipboardSnapshot,
} from '@/features/canvas/model/canvasClipboard'
import type {
  CanvasEdge,
  CanvasPoint,
  CanvasShapeNode,
  CanvasStroke,
  CanvasTextNode,
  PromptCard,
} from '@/shared/types'

interface UseCanvasClipboardOptions {
  canvasEdges: CanvasEdge[]
  canvasId?: string
  promptCards: PromptCard[]
  reactFlow: ReactFlowInstance<CanvasFlowNode, Edge>
  selectedFlowIds: {
    edges: string[]
    nodes: string[]
  }
  shapeNodes: CanvasShapeNode[]
  strokes: CanvasStroke[]
  textNodes: CanvasTextNode[]
  onPasteSelection: (ids: string[]) => void
  onSelectPrompt: (id: string) => void
}

export function useCanvasClipboard({
  canvasEdges,
  canvasId,
  onPasteSelection,
  onSelectPrompt,
  promptCards,
  reactFlow,
  selectedFlowIds,
  shapeNodes,
  strokes,
  textNodes,
}: UseCanvasClipboardOptions) {
  const clipboardRef = useRef<CanvasClipboardSnapshot | undefined>(undefined)
  const cursorPositionRef = useRef<CanvasPoint>({ x: 120, y: 120 })

  const updateCursorPosition = useCallback(
    (event: React.MouseEvent) => {
      cursorPositionRef.current = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
    },
    [reactFlow],
  )

  const copySelection = useCallback(() => {
    const nextClipboard = createCanvasClipboard({
      edges: canvasEdges,
      promptCards,
      selectedNodeIds: selectedFlowIds.nodes,
      shapeNodes,
      strokes,
      textNodes,
    })

    if (nextClipboard) clipboardRef.current = nextClipboard
  }, [
    canvasEdges,
    promptCards,
    selectedFlowIds.nodes,
    shapeNodes,
    strokes,
    textNodes,
  ])

  const pasteSelection = useCallback(async () => {
    const result = await pasteCanvasClipboard(
      canvasId,
      clipboardRef.current,
      cursorPositionRef.current,
    )
    if (!result) return

    onPasteSelection(result.nodeIds)
    const selectedPromptId = result.promptCardIds[0]
    if (selectedPromptId) onSelectPrompt(selectedPromptId)
  }, [canvasId, onPasteSelection, onSelectPrompt])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isCopyPasteModifier(event) || isEditableTarget(event.target)) return

      const key = event.key.toLowerCase()
      if (key === 'c') {
        event.preventDefault()
        copySelection()
      }
      if (key === 'v') {
        event.preventDefault()
        void pasteSelection()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [copySelection, pasteSelection])

  return {
    updateCursorPosition,
  }
}

function isCopyPasteModifier(event: KeyboardEvent) {
  return (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest('input, textarea, [contenteditable="true"]'))
}
