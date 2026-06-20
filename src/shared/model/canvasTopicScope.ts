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
  sessionCreatedAt?: string
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
  sessionCreatedAt,
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

  const records = {
    canvasEdges,
    canvasImageNodes,
    canvasShapeNodes,
    canvasStrokes,
    canvasTextNodes,
    promptCards,
  }
  const scoped = filterRecordsByTopicSession(
    records,
    sessionId,
  )

  const legacyBatch = filterLegacyBatchByPromptCardCreatedAt(
    records,
    promptCardId,
    sessionId,
  )

  const legacyConnected = filterLegacyConnectedRecords(
    records,
    promptCardId,
    sessionId,
  )
  const legacyForScopedPrompts = filterLegacyRecordsForScopedPromptCards(
    records,
    scoped.promptCards,
    sessionId,
  )
  const legacyFallback = promptCardId
    ? undefined
    : filterUnscopedRecordsCreatedSince(records, sessionCreatedAt)
  const mergedLegacy = mergeDefinedTopicRecords([
    legacyBatch,
    legacyConnected,
    legacyForScopedPrompts,
    legacyFallback,
  ])
  if (mergedLegacy) {
    return withMergedVisibleEdges(
      records,
      mergeTopicRecords(scoped, mergedLegacy),
      sessionId,
      sessionCreatedAt,
    )
  }
  if (hasTopicRecords(scoped)) return scoped

  return scoped
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
  sessionId?: string,
) {
  const promptCard = records.promptCards.find(
    (card) =>
      card.id === promptCardId &&
      (!card.topicSessionId || card.topicSessionId === sessionId),
  )
  if (!promptCard) return undefined

  const createdAt = promptCard.createdAt
  const promptCards = filterLegacyByCreatedAt(
    records.promptCards,
    createdAt,
    sessionId,
  )
  const canvasImageNodes = filterLegacyByCreatedAt(
    records.canvasImageNodes,
    createdAt,
    sessionId,
  )
  const canvasShapeNodes = filterLegacyByCreatedAt(
    records.canvasShapeNodes,
    createdAt,
    sessionId,
  )
  const canvasStrokes = filterLegacyByCreatedAt(
    records.canvasStrokes,
    createdAt,
    sessionId,
  )
  const canvasTextNodes = filterLegacyByCreatedAt(
    records.canvasTextNodes,
    createdAt,
    sessionId,
  )
  const nodeIds = collectNodeIds({
    promptCards,
    canvasImageNodes,
    canvasShapeNodes,
    canvasStrokes,
    canvasTextNodes,
    canvasEdges: [],
  })
  const canvasEdges = filterEdgesForNodes(
    filterLegacyByCreatedAt(records.canvasEdges, createdAt, sessionId),
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
  sessionId?: string,
) {
  if (!promptCardId) return undefined
  const promptCard = records.promptCards.find(
    (card) =>
      card.id === promptCardId &&
      (!card.topicSessionId || card.topicSessionId === sessionId),
  )
  if (!promptCard) return undefined
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

function filterLegacyRecordsForScopedPromptCards(
  records: CanvasTopicRecords,
  promptCards: PromptCard[],
  sessionId?: string,
) {
  const legacyRecords = promptCards
    .map((card) =>
      filterLegacyBatchByPromptCardCreatedAt(records, card.id, sessionId),
    )
    .filter((item): item is CanvasTopicRecords => Boolean(item))

  return mergeDefinedTopicRecords(legacyRecords)
}

function mergeDefinedTopicRecords(records: Array<CanvasTopicRecords | undefined>) {
  const definedRecords = records.filter((item): item is CanvasTopicRecords =>
    Boolean(item),
  )
  if (!definedRecords.length) return undefined

  return definedRecords.reduce((merged, current) =>
    mergeTopicRecords(merged, current),
  )
}

function mergeTopicRecords(
  first: CanvasTopicRecords,
  second: CanvasTopicRecords,
): CanvasTopicRecords {
  return {
    canvasEdges: uniqueById([...first.canvasEdges, ...second.canvasEdges]),
    canvasImageNodes: uniqueById([
      ...first.canvasImageNodes,
      ...second.canvasImageNodes,
    ]),
    canvasShapeNodes: uniqueById([
      ...first.canvasShapeNodes,
      ...second.canvasShapeNodes,
    ]),
    canvasStrokes: uniqueById([...first.canvasStrokes, ...second.canvasStrokes]),
    canvasTextNodes: uniqueById([
      ...first.canvasTextNodes,
      ...second.canvasTextNodes,
    ]),
    promptCards: uniqueById([...first.promptCards, ...second.promptCards]),
  }
}

function withMergedVisibleEdges(
  source: CanvasTopicRecords,
  records: CanvasTopicRecords,
  sessionId: string,
  sessionCreatedAt?: string,
): CanvasTopicRecords {
  const nodeIds = collectNodeIds({ ...records, canvasEdges: [] })
  return {
    ...records,
    canvasEdges: uniqueById([
      ...records.canvasEdges,
      ...source.canvasEdges.filter(
        (edge) =>
          (edge.topicSessionId === sessionId ||
            (!edge.topicSessionId &&
              isCreatedAtOrAfter(edge.createdAt, sessionCreatedAt))) &&
          nodeIds.has(edge.sourceId) &&
          nodeIds.has(edge.targetId),
      ),
    ]),
  }
}

function filterUnscopedRecordsCreatedSince(
  records: CanvasTopicRecords,
  createdAt?: string,
) {
  if (!createdAt) return undefined
  const promptCards = filterUnscopedCreatedSince(records.promptCards, createdAt)
  const canvasImageNodes = filterUnscopedCreatedSince(
    records.canvasImageNodes,
    createdAt,
  )
  const canvasShapeNodes = filterUnscopedCreatedSince(
    records.canvasShapeNodes,
    createdAt,
  )
  const canvasStrokes = filterUnscopedCreatedSince(records.canvasStrokes, createdAt)
  const canvasTextNodes = filterUnscopedCreatedSince(
    records.canvasTextNodes,
    createdAt,
  )
  const nodeIds = collectNodeIds({
    promptCards,
    canvasImageNodes,
    canvasShapeNodes,
    canvasStrokes,
    canvasTextNodes,
    canvasEdges: [],
  })
  const canvasEdges = filterEdgesForNodes(
    filterUnscopedCreatedSince(records.canvasEdges, createdAt),
    nodeIds,
  )
  const scoped = {
    canvasEdges,
    canvasImageNodes,
    canvasShapeNodes,
    canvasStrokes,
    canvasTextNodes,
    promptCards,
  }

  return hasTopicRecords(scoped) ? scoped : undefined
}

function filterUnscopedCreatedSince<T extends TopicScopedRecord>(
  items: T[],
  createdAt: string,
) {
  return items.filter(
    (item) =>
      !item.topicSessionId && isCreatedAtOrAfter(item.createdAt, createdAt),
  )
}

function isCreatedAtOrAfter(value: string, lowerBound?: string) {
  if (!lowerBound) return false
  const parsedValue = Date.parse(value)
  const parsedLowerBound = Date.parse(lowerBound)
  if (Number.isFinite(parsedValue) && Number.isFinite(parsedLowerBound)) {
    return parsedValue >= parsedLowerBound
  }
  return value >= lowerBound
}

function filterByTopic<T extends { topicSessionId?: string }>(
  items: T[],
  sessionId?: string,
) {
  return items.filter((item) =>
    sessionId ? item.topicSessionId === sessionId : !item.topicSessionId,
  )
}

function filterLegacyByCreatedAt<T extends TopicScopedRecord>(
  items: T[],
  createdAt: string,
  sessionId?: string,
) {
  return items.filter(
    (item) =>
      item.createdAt === createdAt &&
      (!item.topicSessionId || item.topicSessionId === sessionId),
  )
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

function uniqueById<T extends { id: string }>(items: T[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()]
}
