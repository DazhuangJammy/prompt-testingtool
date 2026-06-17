import { useCallback } from 'react'
import type { Edge, OnDelete } from '@xyflow/react'
import {
  deleteCanvasEdge,
  deleteCanvasStroke,
  deleteImageNodeCascade,
  deleteShapeNodeCascade,
  deleteTextNodeCascade,
} from '@/features/canvas/application/canvasService'
import type { CanvasFlowNode } from '@/features/canvas/model/canvasFlowMapping'

interface UseCanvasDeletionOptions {
  canvasId?: string
  flowNodes: CanvasFlowNode[]
  selectedFlowIds: {
    edges: string[]
    nodes: string[]
  }
  onDeleteCard: (id: string) => void
  onSelectionClear: () => void
}

export function useCanvasDeletion({
  canvasId,
  flowNodes,
  onDeleteCard,
  onSelectionClear,
  selectedFlowIds,
}: UseCanvasDeletionOptions) {
  const deleteNode = useCallback(
    (node: CanvasFlowNode) => {
      if (node.type === 'promptCard') {
        onDeleteCard(node.id)
        return
      }
      if (node.type === 'freehandStroke') {
        void deleteCanvasStroke(node.id, canvasId)
        return
      }
      if (node.type === 'freeText') {
        void deleteTextNodeCascade(node.id, canvasId)
        return
      }
      if (node.type === 'canvasImage') {
        void deleteImageNodeCascade(node.id, canvasId)
        return
      }
      void deleteShapeNodeCascade(node.id, canvasId)
    },
    [canvasId, onDeleteCard],
  )

  const deleteSelected = useCallback(() => {
    selectedFlowIds.edges.forEach((id) => void deleteCanvasEdge(id, canvasId))
    selectedFlowIds.nodes.forEach((id) => {
      const node = flowNodes.find((item) => item.id === id)
      if (node) deleteNode(node)
    })
    onSelectionClear()
  }, [canvasId, deleteNode, flowNodes, onSelectionClear, selectedFlowIds])

  const handleDelete = useCallback<OnDelete<CanvasFlowNode, Edge>>(
    ({ edges, nodes }) => {
      edges.forEach((edge) => void deleteCanvasEdge(edge.id, canvasId))
      nodes.forEach(deleteNode)
      onSelectionClear()
    },
    [canvasId, deleteNode, onSelectionClear],
  )

  return { deleteSelected, handleDelete }
}
