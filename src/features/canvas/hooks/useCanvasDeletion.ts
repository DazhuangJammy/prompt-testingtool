import { useCallback } from 'react'
import type { Edge, OnDelete } from '@xyflow/react'
import {
  deleteCanvasEdge,
  deleteCanvasStroke,
  deleteImageNodeRecord,
  deleteShapeNodeRecord,
  deleteTextNodeRecord,
} from '@/features/canvas/application/canvasService'
import type { CanvasFlowNode } from '@/features/canvas/model/canvasFlowMapping'
import { shouldDeleteEdgeRecordOnFlowDelete } from '@/features/canvas/model/canvasDeletion'

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
        void deleteTextNodeRecord(node.id, canvasId)
        return
      }
      if (node.type === 'canvasImage') {
        void deleteImageNodeRecord(node.id, canvasId)
        return
      }
      void deleteShapeNodeRecord(node.id, canvasId)
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
      edges
        .filter((edge) =>
          shouldDeleteEdgeRecordOnFlowDelete({
            deletedNodeCount: nodes.length,
            edgeId: edge.id,
            selectedEdgeIds: selectedFlowIds.edges,
          }),
        )
        .forEach((edge) => void deleteCanvasEdge(edge.id, canvasId))
      nodes.forEach(deleteNode)
      onSelectionClear()
    },
    [canvasId, deleteNode, onSelectionClear, selectedFlowIds.edges],
  )

  return { deleteSelected, handleDelete }
}
