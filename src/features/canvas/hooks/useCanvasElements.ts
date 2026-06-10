import { useLiveQuery } from 'dexie-react-hooks'
import { canvasRepository } from '@/features/canvas/infrastructure/canvasRepository'
import type {
  CanvasEdge,
  CanvasShapeNode,
  CanvasStroke,
  CanvasTextNode,
} from '@/shared/types'

const emptyShapeNodes: CanvasShapeNode[] = []
const emptyCanvasEdges: CanvasEdge[] = []
const emptyStrokes: CanvasStroke[] = []
const emptyTextNodes: CanvasTextNode[] = []

export function useCanvasElements(canvasId?: string) {
  const shapeNodes = useLiveQuery<CanvasShapeNode[], CanvasShapeNode[]>(
    () =>
      canvasId
        ? canvasRepository.listShapeNodesByCanvas(canvasId)
        : Promise.resolve([]),
    [canvasId],
    [],
  )
  const canvasEdges = useLiveQuery<CanvasEdge[], CanvasEdge[]>(
    () =>
      canvasId ? canvasRepository.listEdgesByCanvas(canvasId) : Promise.resolve([]),
    [canvasId],
    [],
  )
  const strokes = useLiveQuery<CanvasStroke[], CanvasStroke[]>(
    () =>
      canvasId
        ? canvasRepository.listStrokesByCanvas(canvasId)
        : Promise.resolve([]),
    [canvasId],
    [],
  )
  const textNodes = useLiveQuery<CanvasTextNode[], CanvasTextNode[]>(
    () =>
      canvasId
        ? canvasRepository.listTextNodesByCanvas(canvasId)
        : Promise.resolve([]),
    [canvasId],
    [],
  )

  return {
    canvasEdges: canvasEdges ?? emptyCanvasEdges,
    shapeNodes: shapeNodes ?? emptyShapeNodes,
    strokes: strokes ?? emptyStrokes,
    textNodes: textNodes ?? emptyTextNodes,
  }
}
