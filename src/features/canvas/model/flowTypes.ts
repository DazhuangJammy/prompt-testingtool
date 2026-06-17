import type { Node } from '@xyflow/react'
import type {
  CanvasPoint,
  CanvasImageNode,
  CanvasShapeNode,
  CanvasStroke,
  CanvasTextNode,
} from '@/shared/types'

export type CanvasTool =
  | 'select'
  | 'pan'
  | 'prompt'
  | 'step'
  | 'decision'
  | 'text'
  | 'pen'

export interface CanvasShapeNodeData extends Record<string, unknown> {
  node: CanvasShapeNode
  selectedNodeId?: string
  onSelect: (id: string) => void
  onUpdate: (
    id: string,
    updates: Partial<
      Pick<CanvasShapeNode, 'body' | 'height' | 'position' | 'title' | 'width'>
    >,
  ) => void
}

export type CanvasShapeFlowNode = Node<CanvasShapeNodeData, 'flowShape'>

export interface CanvasTextNodeData extends Record<string, unknown> {
  node: CanvasTextNode
  selectedNodeId?: string
  onSelect: (id: string) => void
  onUpdate: (
    id: string,
    updates: Partial<
      Pick<
        CanvasTextNode,
        'backgroundColor' | 'color' | 'fontSize' | 'position' | 'text' | 'width'
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
