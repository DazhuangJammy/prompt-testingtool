import { useCallback, useEffect, useRef } from 'react'
import type { Edge, ReactFlowInstance } from '@xyflow/react'
import { pasteCanvasClipboard } from '@/features/canvas/application/canvasService'
import { canvasRepository } from '@/features/canvas/infrastructure/canvasRepository'
import type { CanvasFlowNode } from '@/features/canvas/model/canvasFlowMapping'
import {
  createCanvasClipboard,
  type CanvasClipboardSnapshot,
} from '@/features/canvas/model/canvasClipboard'
import { createCanvasImageNode } from '@/features/canvas/model/canvasElements'
import {
  getClipboardImageFiles,
  readClipboardImage,
} from '@/features/canvas/model/canvasImageClipboard'
import type {
  CanvasEdge,
  CanvasImageNode,
  CanvasPoint,
  CanvasShapeNode,
  CanvasStroke,
  CanvasTextNode,
  PromptCard,
} from '@/shared/types'

interface UseCanvasClipboardOptions {
  canvasEdges: CanvasEdge[]
  canvasId?: string
  topicSessionId?: string
  promptCards: PromptCard[]
  reactFlow: ReactFlowInstance<CanvasFlowNode, Edge>
  selectedFlowIds: {
    edges: string[]
    nodes: string[]
  }
  shapeNodes: CanvasShapeNode[]
  strokes: CanvasStroke[]
  imageNodes: CanvasImageNode[]
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
  imageNodes,
  textNodes,
  topicSessionId,
}: UseCanvasClipboardOptions) {
  const clipboardRef = useRef<CanvasClipboardSnapshot | undefined>(undefined)
  const cursorPositionRef = useRef<CanvasPoint>({ x: 120, y: 120 })
  const keyboardPasteRef = useRef(false)

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
      imageNodes,
      promptCards,
      selectedNodeIds: selectedFlowIds.nodes,
      shapeNodes,
      strokes,
      textNodes,
    })

    if (nextClipboard) clipboardRef.current = nextClipboard
  }, [
    canvasEdges,
    imageNodes,
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
      topicSessionId,
    )
    if (!result) return

    onPasteSelection(result.nodeIds)
    const selectedPromptId = result.promptCardIds[0]
    if (selectedPromptId) onSelectPrompt(selectedPromptId)
  }, [canvasId, onPasteSelection, onSelectPrompt, topicSessionId])

  const pasteImages = useCallback(
    async (files: File[]) => {
      if (!canvasId || !files.length) return false
      const createdNodeIds: string[] = []

      for (const [index, file] of files.entries()) {
        const image = await readClipboardImage(file)
        const node = createCanvasImageNode(
          canvasId,
          {
            x: cursorPositionRef.current.x + index * 24,
            y: cursorPositionRef.current.y + index * 24,
          },
          image,
          topicSessionId,
        )
        await canvasRepository.saveImageNode(node)
        createdNodeIds.push(node.id)
      }

      onPasteSelection(createdNodeIds)
      return true
    },
    [canvasId, onPasteSelection, topicSessionId],
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isCopyPasteModifier(event) || isEditableTarget(event.target)) return

      const key = event.key.toLowerCase()
      if (key === 'c') {
        if (hasTextSelection()) return
        event.preventDefault()
        copySelection()
      }
      if (key === 'v') {
        keyboardPasteRef.current = true
      }
    }

    const handlePaste = (event: ClipboardEvent) => {
      const shouldHandlePaste = keyboardPasteRef.current
      keyboardPasteRef.current = false
      if (!shouldHandlePaste || isEditableTarget(event.target)) return

      const imageFiles = getClipboardImageFiles(event.clipboardData)
      if (imageFiles.length) {
        event.preventDefault()
        void pasteImages(imageFiles)
        return
      }

      event.preventDefault()
      void pasteSelection()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('paste', handlePaste)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('paste', handlePaste)
    }
  }, [copySelection, pasteImages, pasteSelection])

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

export function hasTextSelection() {
  const activeElement = document.activeElement
  if (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement
  ) {
    return (activeElement.selectionStart ?? 0) !== (activeElement.selectionEnd ?? 0)
  }

  const selection = window.getSelection()
  return Boolean(selection && !selection.isCollapsed && selection.toString().trim())
}
