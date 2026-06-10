import {
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type NodeChange,
  type OnEdgesChange,
} from '@xyflow/react'
import { useCallback, useEffect, useState } from 'react'
import {
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
    setFlowNodes((currentNodes) => applyNodeChanges(changes, currentNodes))
  }, [])

  const handleEdgesChange = useCallback<OnEdgesChange<Edge>>((changes) => {
    setFlowEdges((currentEdges) => applyEdgeChanges(changes, currentEdges))
  }, [])

  return {
    flowEdges,
    flowNodes,
    handleEdgesChange,
    handleNodeChanges,
  }
}
