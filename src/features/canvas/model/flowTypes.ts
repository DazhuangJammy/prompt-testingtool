import type { Node } from '@xyflow/react'
import type { CanvasTool as SharedCanvasTool } from '@/shared/model/canvasToolShortcuts'
import type {
  CanvasPoint,
  CanvasImageNode,
  InputCard,
  CanvasShapeNode,
  CanvasStroke,
  CanvasTextNode,
} from '@/shared/types'

export type CanvasTool = SharedCanvasTool

export interface CanvasShapeNodeData extends Record<string, unknown> {
  node: CanvasShapeNode
  selectedNodeId?: string
  onSelect: (id: string) => void
  onUpdate: (
    id: string,
    updates: Partial<
      Pick<
        CanvasShapeNode,
        'body' | 'frameStyle' | 'height' | 'position' | 'title' | 'width'
      >
    >,
  ) => void
}

export type CanvasShapeFlowNode = Node<CanvasShapeNodeData, 'flowShape'>

export interface InputCardNodeData extends Record<string, unknown> {
  card: InputCard
  selectedCardId?: string
  onSelect: (id: string) => void
  onChange: (card: InputCard) => void
}

export type InputCardFlowNode = Node<InputCardNodeData, 'inputCard'>

export interface CanvasTextNodeData extends Record<string, unknown> {
  node: CanvasTextNode
  selectedNodeId?: string
  onSelect: (id: string) => void
  onUpdate: (
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

export type CanvasTextFlowNode = Node<CanvasTextNodeData, 'freeText'>

export interface CanvasImageNodeData extends Record<string, unknown> {
  node: CanvasImageNode
  selectedNodeId?: string
  onSelect: (id: string) => void
  onUpdate: (
    id: string,
    updates: Partial<Pick<CanvasImageNode, 'height' | 'position' | 'width'>>,
  ) => void
}

export type CanvasImageFlowNode = Node<CanvasImageNodeData, 'canvasImage'>

export interface CanvasStrokeNodeData extends Record<string, unknown> {
  bounds: {
    height: number
    minX: number
    minY: number
    width: number
  }
  selectedNodeId?: string
  stroke: CanvasStroke
  viewPoints: CanvasPoint[]
}

export type CanvasStrokeFlowNode = Node<CanvasStrokeNodeData, 'freehandStroke'>
