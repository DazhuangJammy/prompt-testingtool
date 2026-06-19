import { MarkerType, type Edge } from '@xyflow/react'
import {
  getStrokeBounds,
  toStrokeViewPoints,
} from '@/features/canvas/model/strokeGeometry'
import type {
  CanvasImageFlowNode,
  CanvasShapeFlowNode,
  CanvasStrokeFlowNode,
  CanvasTextFlowNode,
} from '@/features/canvas/model/flowTypes'
import type { PromptFlowNode } from '@/features/prompt-card/PromptCardNode.types'
import type {
  CanvasEdge,
  CanvasImageNode,
  CanvasShapeNode,
  CanvasStroke,
  CanvasTextNode,
  DefaultModelSettings,
  PromptCard,
  ProviderConfig,
} from '@/shared/types'

export type CanvasFlowNode =
  | PromptFlowNode
  | CanvasImageFlowNode
  | CanvasShapeFlowNode
  | CanvasTextFlowNode
  | CanvasStrokeFlowNode

interface CreateCanvasNodesOptions {
  promptCards: PromptCard[]
  promptOptimizationProvider?: ProviderConfig
  promptOptimizationSettings?: DefaultModelSettings
  selectedNodeIds: string[]
  imageNodes: CanvasImageNode[]
  shapeNodes: CanvasShapeNode[]
  strokes: CanvasStroke[]
  textNodes: CanvasTextNode[]
  onSavePromptCard: (card: PromptCard) => void
  onSelectPrompt: (id: string) => void
  onSelectShape: (id: string) => void
  onSelectImage: (id: string) => void
  onSelectText: (id: string) => void
  onUpdateImage: (
    id: string,
    updates: Partial<Pick<CanvasImageNode, 'height' | 'position' | 'width'>>,
  ) => void
  onUpdateShape: (
    id: string,
    updates: Partial<
      Pick<
        CanvasShapeNode,
        'body' | 'frameStyle' | 'height' | 'position' | 'title' | 'width'
      >
    >,
  ) => void
  onUpdateText: (
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
  ) => void
}

export function createCanvasFlowNodes({
  onSavePromptCard,
  onSelectPrompt,
  onSelectImage,
  onSelectShape,
  onSelectText,
  onUpdateImage,
  onUpdateShape,
  onUpdateText,
  promptCards,
  promptOptimizationProvider,
  promptOptimizationSettings,
  selectedNodeIds,
  imageNodes,
  shapeNodes,
  strokes,
  textNodes,
}: CreateCanvasNodesOptions): CanvasFlowNode[] {
  return [
    ...promptCards.map(
      (card): PromptFlowNode => ({
        id: card.id,
        dragHandle: '.prompt-node-drag-area',
        selected: selectedNodeIds.includes(card.id),
        type: 'promptCard',
        position: card.position,
        data: {
          card,
          promptOptimizationProvider,
          promptOptimizationSettings,
          selectedCardId: selectedNodeIds.includes(card.id) ? card.id : undefined,
          onSelect: onSelectPrompt,
          onChange: onSavePromptCard,
        },
      }),
    ),
    ...shapeNodes.map(
      (node): CanvasShapeFlowNode => ({
        id: node.id,
        dragHandle: '.flow-shape-drag-area',
        selected: selectedNodeIds.includes(node.id),
        style: {
          height: node.height,
          width: node.width,
        },
        type: 'flowShape',
        position: node.position,
        data: {
          node,
          selectedNodeId: selectedNodeIds.includes(node.id) ? node.id : undefined,
          onSelect: onSelectShape,
          onUpdate: onUpdateShape,
        },
      }),
    ),
    ...imageNodes.map(
      (node): CanvasImageFlowNode => ({
        id: node.id,
        dragHandle: '.canvas-image-drag-area',
        selected: selectedNodeIds.includes(node.id),
        style: {
          height: node.height,
          width: node.width,
        },
        type: 'canvasImage',
        position: node.position,
        data: {
          node,
          selectedNodeId: selectedNodeIds.includes(node.id) ? node.id : undefined,
          onSelect: onSelectImage,
          onUpdate: onUpdateImage,
        },
      }),
    ),
    ...textNodes.map(
      (node): CanvasTextFlowNode => ({
        id: node.id,
        dragHandle: '.free-text-drag-area',
        selected: selectedNodeIds.includes(node.id),
        style: {
          width: node.width,
        },
        type: 'freeText',
        position: node.position,
        data: {
          node,
          selectedNodeId: selectedNodeIds.includes(node.id) ? node.id : undefined,
          onSelect: onSelectText,
          onUpdate: onUpdateText,
        },
      }),
    ),
    ...strokes.map((stroke): CanvasStrokeFlowNode => {
      const bounds = getStrokeBounds(stroke.points, stroke.strokeWidth + 8)

      return {
        id: stroke.id,
        type: 'freehandStroke',
        position: { x: bounds.minX, y: bounds.minY },
        selected: selectedNodeIds.includes(stroke.id),
        data: {
          bounds,
          selectedNodeId: selectedNodeIds.includes(stroke.id) ? stroke.id : undefined,
          stroke,
          viewPoints: toStrokeViewPoints(stroke.points, bounds),
        },
        draggable: true,
      }
    }),
  ]
}

export function createCanvasFlowEdges(canvasEdges: CanvasEdge[]): Edge[] {
  return canvasEdges.map((edge) => ({
    id: edge.id,
    source: edge.sourceId,
    target: edge.targetId,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    markerEnd: { type: MarkerType.ArrowClosed },
    reconnectable: true,
    type: 'smoothstep',
  }))
}

export function syncCanvasNodes(
  currentNodes: CanvasFlowNode[],
  businessNodes: CanvasFlowNode[],
) {
  const currentById = new Map(currentNodes.map((node) => [node.id, node]))

  return businessNodes.map((businessNode) => {
    const currentNode = currentById.get(businessNode.id)
    if (!currentNode) return businessNode

    return {
      ...currentNode,
      data: businessNode.data,
      dragHandle: businessNode.dragHandle,
      position: hasBusinessPositionChanged(currentNode, businessNode)
        ? businessNode.position
        : currentNode.position,
      selected: currentNode.selected,
      style: businessNode.style,
      type: businessNode.type,
    } as CanvasFlowNode
  })
}

export function syncCanvasEdges(currentEdges: Edge[], businessEdges: Edge[]) {
  const currentById = new Map(currentEdges.map((edge) => [edge.id, edge]))

  return businessEdges.map((businessEdge) => {
    const currentEdge = currentById.get(businessEdge.id)
    if (!currentEdge) return businessEdge

    return {
      ...currentEdge,
      markerEnd: businessEdge.markerEnd,
      reconnectable: businessEdge.reconnectable,
      selected: currentEdge.selected,
      source: businessEdge.source,
      sourceHandle: businessEdge.sourceHandle,
      target: businessEdge.target,
      targetHandle: businessEdge.targetHandle,
      type: businessEdge.type,
    }
  })
}

function hasBusinessPositionChanged(
  currentNode: CanvasFlowNode,
  businessNode: CanvasFlowNode,
) {
  return (
    currentNode.position.x !== businessNode.position.x ||
    currentNode.position.y !== businessNode.position.y
  )
}
