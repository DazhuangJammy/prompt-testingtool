import {
  type Node,
  type NodeChange,
  type XYPosition,
  applyNodeChanges,
} from '@xyflow/react'
import { canvasRepository } from '@/features/canvas/infrastructure/canvasRepository'
import {
  getStrokeBounds,
  movePoints,
} from '@/features/canvas/model/strokeGeometry'
import {
  createCanvasPastePayload,
  type CanvasClipboardSnapshot,
} from '@/features/canvas/model/canvasClipboard'
import type { PromptNodeData } from '@/features/prompt-card/PromptCardNode.types'
import type {
  CanvasEdge,
  CanvasImageNode,
  CanvasPoint,
  CanvasShapeNode,
  CanvasStroke,
  CanvasTextNode,
  PromptCard,
} from '@/shared/types'

export async function persistPromptNodeChanges(
  changes: NodeChange[],
  nodes: Array<Node<PromptNodeData>>,
  promptCards: PromptCard[],
  canvasId?: string,
) {
  const nextNodes = applyNodeChanges(changes, nodes)
  const positionChanges = nextNodes
    .map((node) => {
      const original = promptCards.find((card) => card.id === node.id)
      if (
        !original ||
        (original.position.x === node.position.x &&
          original.position.y === node.position.y)
      ) {
        return undefined
      }
      return canvasRepository.updatePromptCardPosition(node.id, node.position)
    })
    .filter(Boolean)

  await Promise.all(positionChanges)
  if (canvasId && positionChanges.length) await canvasRepository.touchCanvas(canvasId)
}

export async function persistPromptNodePosition(
  id: string,
  position: XYPosition,
  promptCards: PromptCard[],
  canvasId?: string,
) {
  const original = promptCards.find((card) => card.id === id)
  if (
    !original ||
    (original.position.x === position.x && original.position.y === position.y)
  ) {
    return
  }

  await canvasRepository.updatePromptCardPosition(id, position)
  if (canvasId) await canvasRepository.touchCanvas(canvasId)
}

export async function persistShapeNodePosition(
  id: string,
  position: XYPosition,
  shapeNodes: CanvasShapeNode[],
  canvasId?: string,
) {
  const original = shapeNodes.find((node) => node.id === id)
  if (
    !original ||
    (original.position.x === position.x && original.position.y === position.y)
  ) {
    return
  }

  await canvasRepository.updateShapeNode(id, { position })
  if (canvasId) await canvasRepository.touchCanvas(canvasId)
}

export async function persistTextNodePosition(
  id: string,
  position: XYPosition,
  textNodes: CanvasTextNode[],
  canvasId?: string,
) {
  const original = textNodes.find((node) => node.id === id)
  if (
    !original ||
    (original.position.x === position.x && original.position.y === position.y)
  ) {
    return
  }

  await canvasRepository.updateTextNode(id, { position })
  if (canvasId) await canvasRepository.touchCanvas(canvasId)
}

export async function persistImageNodePosition(
  id: string,
  position: XYPosition,
  imageNodes: CanvasImageNode[],
  canvasId?: string,
) {
  const original = imageNodes.find((node) => node.id === id)
  if (
    !original ||
    (original.position.x === position.x && original.position.y === position.y)
  ) {
    return
  }

  await canvasRepository.updateImageNode(id, { position })
  if (canvasId) await canvasRepository.touchCanvas(canvasId)
}

export async function persistCanvasStrokePosition(
  id: string,
  position: XYPosition,
  strokes: CanvasStroke[],
  canvasId?: string,
) {
  const original = strokes.find((stroke) => stroke.id === id)
  if (!original) return

  const bounds = getStrokeBounds(original.points, original.strokeWidth + 8)
  const delta = {
    x: position.x - bounds.minX,
    y: position.y - bounds.minY,
  }

  if (delta.x === 0 && delta.y === 0) return

  await canvasRepository.updateStroke(id, {
    points: movePoints(original.points, delta),
  })
  if (canvasId) await canvasRepository.touchCanvas(canvasId)
}

export async function deleteShapeNodeCascade(id: string, canvasId?: string) {
  await canvasRepository.deleteEdgesForNode(id)
  await canvasRepository.deleteShapeNode(id)
  if (canvasId) await canvasRepository.touchCanvas(canvasId)
}

export async function deleteTextNodeCascade(id: string, canvasId?: string) {
  await canvasRepository.deleteEdgesForNode(id)
  await canvasRepository.deleteTextNode(id)
  if (canvasId) await canvasRepository.touchCanvas(canvasId)
}

export async function deleteImageNodeCascade(id: string, canvasId?: string) {
  await canvasRepository.deleteEdgesForNode(id)
  await canvasRepository.deleteImageNode(id)
  if (canvasId) await canvasRepository.touchCanvas(canvasId)
}

export async function deleteCanvasEdge(id: string, canvasId?: string) {
  await canvasRepository.deleteEdge(id)
  if (canvasId) await canvasRepository.touchCanvas(canvasId)
}

export async function reconnectCanvasEdge(
  id: string,
  updates: Pick<
    CanvasEdge,
    'sourceHandle' | 'sourceId' | 'targetHandle' | 'targetId'
  >,
  canvasId?: string,
) {
  await canvasRepository.updateEdge(id, updates)
  if (canvasId) await canvasRepository.touchCanvas(canvasId)
}

export async function deleteCanvasStroke(id: string, canvasId?: string) {
  await canvasRepository.deleteStroke(id)
  if (canvasId) await canvasRepository.touchCanvas(canvasId)
}

export async function pasteCanvasClipboard(
  canvasId: string | undefined,
  clipboard: CanvasClipboardSnapshot | undefined,
  anchor: CanvasPoint,
) {
  if (!canvasId || !clipboard) return undefined

  const result = createCanvasPastePayload({
    anchor,
    canvasId,
    clipboard,
  })
  await canvasRepository.savePastedElements(result.payload)

  return {
    nodeIds: result.nodeIds,
    promptCardIds: result.promptCardIds,
  }
}
