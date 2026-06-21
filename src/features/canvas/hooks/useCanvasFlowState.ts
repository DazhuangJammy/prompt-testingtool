import {
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type NodeChange,
  type OnEdgesChange,
} from '@xyflow/react'
import { useCallback, useEffect, useState } from 'react'
import {
  areCanvasFlowEdgesEqual,
  areCanvasFlowNodesEqual,
  syncCanvasEdges,
  syncCanvasNodes,
  type CanvasFlowNode,
} from '@/features/canvas/model/canvasFlowMapping'

interface UseCanvasFlowStateOptions {
  businessEdges: Edge[]
  businessNodes: CanvasFlowNode[]
}

export function useCanvasFlowState({
  businessEdges,
  businessNodes,
}: UseCanvasFlowStateOptions) {
  const [flowNodes, setFlowNodes] = useState<CanvasFlowNode[]>(businessNodes)
  const [flowEdges, setFlowEdges] = useState<Edge[]>(businessEdges)

  useEffect(() => {
    const syncId = window.setTimeout(() => {
      setFlowNodes((currentNodes) => syncCanvasNodes(currentNodes, businessNodes))
    }, 0)

    return () => window.clearTimeout(syncId)
  }, [businessNodes])

  useEffect(() => {
    const syncId = window.setTimeout(() => {
      setFlowEdges((currentEdges) => syncCanvasEdges(currentEdges, businessEdges))
    }, 0)

    return () => window.clearTimeout(syncId)
  }, [businessEdges])

  const handleNodeChanges = useCallback((changes: NodeChange<CanvasFlowNode>[]) => {
    setFlowNodes((currentNodes) => {
      const nextNodes = applyNodeChanges(changes, currentNodes)
      return areCanvasFlowNodesEqual(currentNodes, nextNodes)
        ? currentNodes
        : nextNodes
    })
  }, [])

  const handleEdgesChange = useCallback<OnEdgesChange<Edge>>((changes) => {
    setFlowEdges((currentEdges) => {
      const nextEdges = applyEdgeChanges(changes, currentEdges)
      return areCanvasFlowEdgesEqual(currentEdges, nextEdges)
        ? currentEdges
        : nextEdges
    })
  }, [])

  return {
    flowEdges,
    flowNodes,
    handleEdgesChange,
    handleNodeChanges,
    setFlowNodes,
  }
}
