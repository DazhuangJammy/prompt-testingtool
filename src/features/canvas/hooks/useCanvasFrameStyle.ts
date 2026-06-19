import { useCallback, useMemo } from 'react'
import { canvasRepository } from '@/features/canvas/infrastructure/canvasRepository'
import {
  defaultNodeFrameStyle,
  mergeCanvasNodeFrameStyle,
  resolveCanvasNodeFrameStyle,
  type CanvasFrameStyle,
} from '@/shared/model/nodeFrameStyle'
import type { CanvasShapeNode, CanvasTextNode, PromptCard } from '@/shared/types'

interface UseCanvasFrameStyleOptions {
  canvasId?: string
  promptCards: PromptCard[]
  selectedNodeIds: string[]
  shapeNodes: CanvasShapeNode[]
  textNodes: CanvasTextNode[]
}

type FrameTarget =
  | { kind: 'prompt'; node: PromptCard }
  | { kind: 'shape'; node: CanvasShapeNode }
  | { kind: 'text'; node: CanvasTextNode }

export function useCanvasFrameStyle({
  canvasId,
  promptCards,
  selectedNodeIds,
  shapeNodes,
  textNodes,
}: UseCanvasFrameStyleOptions) {
  const target = useMemo(
    () => resolveSelectedFrameTarget({
      promptCards,
      selectedNodeIds,
      shapeNodes,
      textNodes,
    }),
    [promptCards, selectedNodeIds, shapeNodes, textNodes],
  )
  const activeFrameStyle = target
    ? resolveCanvasNodeFrameStyle(target.node.frameStyle)
    : defaultNodeFrameStyle

  const updateFrameStyle = useCallback(
    (updates: Partial<CanvasFrameStyle>) => {
      if (!target) return

      const frameStyle = mergeCanvasNodeFrameStyle(target.node.frameStyle, updates)

      if (target.kind === 'prompt') {
        void canvasRepository.savePromptCard({
          ...target.node,
          frameStyle,
          updatedAt: new Date().toISOString(),
        })
        return
      }

      const task =
        target.kind === 'shape'
          ? canvasRepository.updateShapeNode(target.node.id, { frameStyle })
          : canvasRepository.updateTextNode(target.node.id, { frameStyle })

      void task.then(() =>
        canvasId ? canvasRepository.touchCanvas(canvasId) : undefined,
      )
    },
    [canvasId, target],
  )

  return {
    activeFrameStyle,
    canStyleFrame: Boolean(target),
    updateFrameStyle,
  }
}

function resolveSelectedFrameTarget({
  promptCards,
  selectedNodeIds,
  shapeNodes,
  textNodes,
}: Omit<UseCanvasFrameStyleOptions, 'canvasId'>): FrameTarget | undefined {
  if (selectedNodeIds.length !== 1) return undefined

  const selectedId = selectedNodeIds[0]
  const selectedText = textNodes.find((node) => node.id === selectedId)
  if (selectedText) return { kind: 'text', node: selectedText }

  const selectedShape = shapeNodes.find((node) => node.id === selectedId)
  if (selectedShape) return { kind: 'shape', node: selectedShape }

  const selectedPrompt = promptCards.find((card) => card.id === selectedId)
  return selectedPrompt ? { kind: 'prompt', node: selectedPrompt } : undefined
}
