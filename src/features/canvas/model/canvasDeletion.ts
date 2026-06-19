export function shouldDeleteEdgeRecordOnFlowDelete({
  deletedNodeCount,
  edgeId,
  selectedEdgeIds,
}: {
  deletedNodeCount: number
  edgeId: string
  selectedEdgeIds: string[]
}) {
  if (deletedNodeCount === 0) return true
  return selectedEdgeIds.includes(edgeId)
}
