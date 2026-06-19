import type { OnNodeDrag } from '@xyflow/react'
import { useCallback } from 'react'
import {
  persistCanvasStrokePosition,
  persistImageNodePosition,
  persistPromptNodePosition,
  persistShapeNodePosition,
  persistTextNodePosition,
} from '@/features/canvas/application/canvasService'
import { canvasRepository } from '@/features/canvas/infrastructure/canvasRepository'
import type { CanvasFlowNode } from '@/features/canvas/model/canvasFlowMapping'
import type {
  CanvasImageNode,
  CanvasShapeNode,
  CanvasStroke,
  CanvasTextNode,
  PromptCard,
} from '@/shared/types'

interface UseCanvasNodePersistenceOptions {
  canvasId?: string
  imageNodes: CanvasImageNode[]
  promptCards: PromptCard[]
  shapeNodes: CanvasShapeNode[]
  strokes: CanvasStroke[]
  textNodes: CanvasTextNode[]
}

export function useCanvasNodePersistence({
  canvasId,
  imageNodes,
  promptCards,
  shapeNodes,
  strokes,
  textNodes,
}: UseCanvasNodePersistenceOptions) {
  const touchAfter = useCallback(
    async (task: Promise<unknown>) => {
      await task
      if (canvasId) await canvasRepository.touchCanvas(canvasId)
    },
    [canvasId],
  )

  const persistNodePosition = useCallback(
    (node: CanvasFlowNode) => {
      if (node.type === 'promptCard') {
        void persistPromptNodePosition(node.id, node.position, promptCards, canvasId)
        return
      }
      if (node.type === 'freehandStroke') {
        void persistCanvasStrokePosition(node.id, node.position, strokes, canvasId)
        return
      }
      if (node.type === 'freeText') {
        void persistTextNodePosition(node.id, node.position, textNodes, canvasId)
        return
      }
      if (node.type === 'canvasImage') {
        void persistImageNodePosition(node.id, node.position, imageNodes, canvasId)
        return
      }
      void persistShapeNodePosition(node.id, node.position, shapeNodes, canvasId)
    },
    [canvasId, imageNodes, promptCards, shapeNodes, strokes, textNodes],
  )

  const onNodeDragStop = useCallback<OnNodeDrag<CanvasFlowNode>>(
    (_, node) => {
      persistNodePosition(node)
    },
    [persistNodePosition],
  )

  const updateImageNode = useCallback(
    (
      id: string,
      updates: Partial<Pick<CanvasImageNode, 'height' | 'position' | 'width'>>,
    ) => {
      void touchAfter(canvasRepository.updateImageNode(id, updates))
    },
    [touchAfter],
  )

  const updateShapeNode = useCallback(
    (
      id: string,
      updates: Partial<
        Pick<
          CanvasShapeNode,
          'body' | 'frameStyle' | 'height' | 'position' | 'title' | 'width'
        >
      >,
    ) => {
      void touchAfter(canvasRepository.updateShapeNode(id, updates))
    },
    [touchAfter],
  )

  const updateTextNode = useCallback(
    (
      id: string,
      updates: Partial<
        Pick<
          CanvasTextNode,
          | 'backgroundColor'
          | 'color'
          | 'fontSize'
          | 'frameStyle'
          | 'position'
          | 'text'
          | 'width'
        >
      >,
    ) => {
      void touchAfter(canvasRepository.updateTextNode(id, updates))
    },
    [touchAfter],
  )

  return {
    onNodeDragStop,
    persistNodePosition,
    updateImageNode,
    updateShapeNode,
    updateTextNode,
  }
}
