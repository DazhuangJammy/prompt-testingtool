import { useCallback, useEffect, useRef } from 'react'
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
  onDeleteInputCard: (id: string) => void
  onSelectionClear: () => void
}

export function useCanvasDeletion({
  canvasId,
  flowNodes,
  onDeleteCard,
  onDeleteInputCard,
  onSelectionClear,
  selectedFlowIds,
}: UseCanvasDeletionOptions) {
  const flowNodesRef = useRef(flowNodes)
  const onDeleteCardRef = useRef(onDeleteCard)
  const onDeleteInputCardRef = useRef(onDeleteInputCard)
  const selectedFlowIdsRef = useRef(selectedFlowIds)

  useEffect(() => {
    flowNodesRef.current = flowNodes
  }, [flowNodes])

  useEffect(() => {
    onDeleteCardRef.current = onDeleteCard
  }, [onDeleteCard])

  useEffect(() => {
    onDeleteInputCardRef.current = onDeleteInputCard
  }, [onDeleteInputCard])

  useEffect(() => {
    selectedFlowIdsRef.current = selectedFlowIds
  }, [selectedFlowIds])

  const deleteNode = useCallback(
    (node: CanvasFlowNode) => {
      if (node.type === 'promptCard') {
        onDeleteCardRef.current(node.id)
        return
      }
      if (node.type === 'freehandStroke') {
        void deleteCanvasStroke(node.id, canvasId)
        return
      }
      if (node.type === 'inputCard') {
        onDeleteInputCardRef.current(node.id)
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
    [canvasId],
  )

  const deleteSelected = useCallback(() => {
    const currentSelection = selectedFlowIdsRef.current
    const currentFlowNodes = flowNodesRef.current

    currentSelection.edges.forEach((id) => void deleteCanvasEdge(id, canvasId))
    currentSelection.nodes.forEach((id) => {
      const node = currentFlowNodes.find((item) => item.id === id)
      if (node) deleteNode(node)
    })
    onSelectionClear()
  }, [canvasId, deleteNode, onSelectionClear])

  const handleDelete = useCallback<OnDelete<CanvasFlowNode, Edge>>(
    ({ edges, nodes }) => {
      const currentSelection = selectedFlowIdsRef.current
      edges
        .filter((edge) =>
          shouldDeleteEdgeRecordOnFlowDelete({
            deletedNodeCount: nodes.length,
            edgeId: edge.id,
            selectedEdgeIds: currentSelection.edges,
          }),
        )
        .forEach((edge) => void deleteCanvasEdge(edge.id, canvasId))
      nodes.forEach(deleteNode)
      onSelectionClear()
    },
    [canvasId, deleteNode, onSelectionClear],
  )

  return { deleteSelected, handleDelete }
}
