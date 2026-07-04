import type { Edge, OnNodeDrag } from '@xyflow/react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import {
  microArrangeCanvasNodes,
  snapCanvasNodeToNearbyNodes,
  type CanvasAlignmentGuide,
} from '@/features/canvas/model/canvasAlignment'
import type { CanvasFlowNode } from '@/features/canvas/model/canvasFlowMapping'

interface UseCanvasAlignmentOptions {
  flowEdges: Edge[]
  flowNodes: CanvasFlowNode[]
  getNode: (nodeId: string) => CanvasFlowNode | undefined
  onPersistNode: (node: CanvasFlowNode) => void
  selectedNodeIds: string[]
  setFlowNodes: Dispatch<SetStateAction<CanvasFlowNode[]>>
}

export function useCanvasAlignment({
  flowEdges,
  flowNodes,
  getNode,
  onPersistNode,
  selectedNodeIds,
  setFlowNodes,
}: UseCanvasAlignmentOptions) {
  const [alignmentGuides, setAlignmentGuides] = useState<CanvasAlignmentGuide[]>([])
  const flowNodesRef = useRef(flowNodes)
  const getNodeRef = useRef(getNode)
  const onPersistNodeRef = useRef(onPersistNode)

  useEffect(() => {
    flowNodesRef.current = flowNodes
  }, [flowNodes])

  useEffect(() => {
    getNodeRef.current = getNode
  }, [getNode])

  useEffect(() => {
    onPersistNodeRef.current = onPersistNode
  }, [onPersistNode])

  const handleNodeDrag = useCallback<OnNodeDrag<CanvasFlowNode>>(
    (_, node, draggedNodes) => {
      if (draggedNodes.length > 1) {
        setAlignmentGuides([])
        return
      }

      const snapResult = snapCanvasNodeToNearbyNodes(node, flowNodesRef.current)
      setAlignmentGuides(snapResult.guides)

      if (
        snapResult.position.x === node.position.x &&
        snapResult.position.y === node.position.y
      ) {
        return
      }

      setFlowNodes((currentNodes) =>
        currentNodes.map((currentNode) =>
          currentNode.id === node.id
            ? ({ ...currentNode, position: snapResult.position } as CanvasFlowNode)
            : currentNode,
        ),
      )
    },
    [setFlowNodes],
  )

  const handleNodeDragStop = useCallback<OnNodeDrag<CanvasFlowNode>>(
    (_, node, draggedNodes) => {
      const nodesToPersist = draggedNodes.length ? draggedNodes : [node]
      nodesToPersist.forEach((draggedNode) => {
        onPersistNodeRef.current(getNodeRef.current(draggedNode.id) ?? draggedNode)
      })
      setAlignmentGuides([])
    },
    [],
  )

  const arrangeCanvas = useCallback(() => {
    const arranged = microArrangeCanvasNodes(flowNodes, flowEdges, selectedNodeIds)
    if (!arranged.changedNodes.length) return

    setAlignmentGuides([])
    setFlowNodes(arranged.nodes)
    arranged.changedNodes.forEach(onPersistNode)
  }, [flowEdges, flowNodes, onPersistNode, selectedNodeIds, setFlowNodes])

  return {
    alignmentGuides,
    arrangeCanvas,
    handleNodeDrag,
    handleNodeDragStop,
  }
}
