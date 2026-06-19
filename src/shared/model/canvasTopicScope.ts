import type {
  CanvasEdge,
  CanvasImageNode,
  CanvasShapeNode,
  CanvasStroke,
  CanvasTextNode,
  PromptCard,
} from '@/shared/types'

export interface CanvasTopicRecords {
  canvasEdges: CanvasEdge[]
  canvasImageNodes: CanvasImageNode[]
  canvasShapeNodes: CanvasShapeNode[]
  canvasStrokes: CanvasStroke[]
  canvasTextNodes: CanvasTextNode[]
  promptCards: PromptCard[]
}

export interface CanvasTopicScopeOptions extends CanvasTopicRecords {
  promptCardId?: string
  sessionId?: string
}

type TopicScopedRecord = { createdAt: string; id: string; topicSessionId?: string }

export function filterCanvasRecordsForTopic({
  canvasEdges,
  canvasImageNodes,
  canvasShapeNodes,
  canvasStrokes,
  canvasTextNodes,
  promptCardId,
  promptCards,
  sessionId,
}: CanvasTopicScopeOptions): CanvasTopicRecords {
  if (!sessionId) {
    return filterRecordsByTopicSession({
      canvasEdges,
      canvasImageNodes,
      canvasShapeNodes,
      canvasStrokes,
      canvasTextNodes,
      promptCards,
    })
  }

  const scoped = filterRecordsByTopicSession(
    {
      canvasEdges,
      canvasImageNodes,
      canvasShapeNodes,
      canvasStrokes,
      canvasTextNodes,
      promptCards,
    },
    sessionId,
  )
  if (hasTopicRecords(scoped)) return scoped

  const legacyBatch = filterLegacyBatchByPromptCardCreatedAt(
    {
      canvasEdges,
      canvasImageNodes,
      canvasShapeNodes,
      canvasStrokes,
      canvasTextNodes,
      promptCards,
    },
    promptCardId,
  )
  if (legacyBatch) return legacyBatch

  const legacyConnected = filterLegacyConnectedRecords(
    {
      canvasEdges,
      canvasImageNodes,
      canvasShapeNodes,
      canvasStrokes,
      canvasTextNodes,
      promptCards,
    },
    promptCardId,
  )
  if (legacyConnected) return legacyConnected

  return filterRecordsByTopicSession({
    canvasEdges,
    canvasImageNodes,
    canvasShapeNodes,
    canvasStrokes,
    canvasTextNodes,
    promptCards,
  })
}

export function hasTopicRecords(records: CanvasTopicRecords) {
  return (
    records.promptCards.length > 0 ||
    records.canvasShapeNodes.length > 0 ||
    records.canvasImageNodes.length > 0 ||
    records.canvasStrokes.length > 0 ||
    records.canvasTextNodes.length > 0
  )
}

function filterRecordsByTopicSession(
  records: CanvasTopicRecords,
  sessionId?: string,
): CanvasTopicRecords {
  const promptCards = filterByTopic(records.promptCards, sessionId)
  const canvasImageNodes = filterByTopic(records.canvasImageNodes, sessionId)
  const canvasShapeNodes = filterByTopic(records.canvasShapeNodes, sessionId)
  const canvasStrokes = filterByTopic(records.canvasStrokes, sessionId)
  const canvasTextNodes = filterByTopic(records.canvasTextNodes, sessionId)

  return {
    promptCards,
    canvasImageNodes,
    canvasShapeNodes,
    canvasStrokes,
    canvasTextNodes,
    canvasEdges: filterEdgesForNodes(
      filterByTopic(records.canvasEdges, sessionId),
      collectNodeIds({
        promptCards,
        canvasImageNodes,
        canvasShapeNodes,
        canvasStrokes,
        canvasTextNodes,
        canvasEdges: [],
      }),
    ),
  }
}

function filterLegacyBatchByPromptCardCreatedAt(
  records: CanvasTopicRecords,
  promptCardId?: string,
) {
  const promptCard = records.promptCards.find(
    (card) => card.id === promptCardId && !card.topicSessionId,
  )
  if (!promptCard) return undefined

  const createdAt = promptCard.createdAt
  const promptCards = filterUnscopedByCreatedAt(records.promptCards, createdAt)
  const canvasImageNodes = filterUnscopedByCreatedAt(records.canvasImageNodes, createdAt)
  const canvasShapeNodes = filterUnscopedByCreatedAt(records.canvasShapeNodes, createdAt)
  const canvasStrokes = filterUnscopedByCreatedAt(records.canvasStrokes, createdAt)
  const canvasTextNodes = filterUnscopedByCreatedAt(records.canvasTextNodes, createdAt)
  const nodeIds = collectNodeIds({
    promptCards,
    canvasImageNodes,
    canvasShapeNodes,
    canvasStrokes,
    canvasTextNodes,
    canvasEdges: [],
  })
  const canvasEdges = filterEdgesForNodes(
    filterUnscopedByCreatedAt(records.canvasEdges, createdAt),
    nodeIds,
  )

  if (promptCards.length <= 1 && !hasTopicRecords({
    promptCards: [],
    canvasImageNodes,
    canvasShapeNodes,
    canvasStrokes,
    canvasTextNodes,
    canvasEdges,
  })) {
    return undefined
  }

  return {
    canvasEdges,
    canvasImageNodes,
    canvasShapeNodes,
    canvasStrokes,
    canvasTextNodes,
    promptCards,
  }
}

function filterLegacyConnectedRecords(
  records: CanvasTopicRecords,
  promptCardId?: string,
) {
  if (!promptCardId) return undefined
  const unscopedEdges = records.canvasEdges.filter((edge) => !edge.topicSessionId)
  const reachableIds = collectReachableNodeIds(promptCardId, unscopedEdges)
  if (!reachableIds.has(promptCardId)) return undefined

  const promptCards = filterUnscopedByIds(records.promptCards, reachableIds)
  const canvasImageNodes = filterUnscopedByIds(records.canvasImageNodes, reachableIds)
  const canvasShapeNodes = filterUnscopedByIds(records.canvasShapeNodes, reachableIds)
  const canvasStrokes = filterUnscopedByIds(records.canvasStrokes, reachableIds)
  const canvasTextNodes = filterUnscopedByIds(records.canvasTextNodes, reachableIds)

  return {
    promptCards,
    canvasImageNodes,
    canvasShapeNodes,
    canvasStrokes,
    canvasTextNodes,
    canvasEdges: filterEdgesForNodes(unscopedEdges, reachableIds),
  }
}

function filterByTopic<T extends { topicSessionId?: string }>(
  items: T[],
  sessionId?: string,
) {
  return items.filter((item) =>
    sessionId ? item.topicSessionId === sessionId : !item.topicSessionId,
  )
}

function filterUnscopedByCreatedAt<T extends TopicScopedRecord>(
  items: T[],
  createdAt: string,
) {
  return items.filter((item) => !item.topicSessionId && item.createdAt === createdAt)
}

function filterUnscopedByIds<T extends TopicScopedRecord>(
  items: T[],
  ids: Set<string>,
) {
  return items.filter((item) => !item.topicSessionId && ids.has(item.id))
}

function filterEdgesForNodes(edges: CanvasEdge[], nodeIds: Set<string>) {
  return edges.filter(
    (edge) => nodeIds.has(edge.sourceId) && nodeIds.has(edge.targetId),
  )
}

function collectNodeIds({
  canvasImageNodes,
  canvasShapeNodes,
  canvasStrokes,
  canvasTextNodes,
  promptCards,
}: CanvasTopicRecords) {
  return new Set([
    ...promptCards.map((card) => card.id),
    ...canvasImageNodes.map((node) => node.id),
    ...canvasShapeNodes.map((node) => node.id),
    ...canvasStrokes.map((stroke) => stroke.id),
    ...canvasTextNodes.map((node) => node.id),
  ])
}

function collectReachableNodeIds(rootId: string, edges: CanvasEdge[]) {
  const reachableIds = new Set([rootId])
  let changed = true

  while (changed) {
    changed = false
    edges.forEach((edge) => {
      if (reachableIds.has(edge.sourceId) && !reachableIds.has(edge.targetId)) {
        reachableIds.add(edge.targetId)
        changed = true
      }
      if (reachableIds.has(edge.targetId) && !reachableIds.has(edge.sourceId)) {
        reachableIds.add(edge.sourceId)
        changed = true
      }
    })
  }

  return reachableIds
}
