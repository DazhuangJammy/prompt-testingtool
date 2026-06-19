import { db } from '@/shared/storage/db'
import type {
  CanvasEdge,
  CanvasImageNode,
  CanvasShapeNode,
  CanvasStroke,
  CanvasTextNode,
  PromptCard,
} from '@/shared/types'

export async function repairLegacyTopicScopeRecords({
  canvasId,
  promptCardId,
  sessionId,
}: {
  canvasId: string
  promptCardId: string
  sessionId: string
}) {
  const promptCard = await db.promptCards.get(promptCardId)
  if (!promptCard || promptCard.topicSessionId === sessionId) return

  const records = await listCanvasRecordsByCanvas(canvasId)
  const createdAt = promptCard.createdAt
  const promptCards = filterLegacyBatch(records.promptCards, createdAt)
  const canvasShapeNodes = filterLegacyBatch(records.canvasShapeNodes, createdAt)
  const canvasImageNodes = filterLegacyBatch(records.canvasImageNodes, createdAt)
  const canvasStrokes = filterLegacyBatch(records.canvasStrokes, createdAt)
  const canvasTextNodes = filterLegacyBatch(records.canvasTextNodes, createdAt)
  const nodeIds = new Set([
    ...promptCards.map((card) => card.id),
    ...canvasShapeNodes.map((node) => node.id),
    ...canvasImageNodes.map((node) => node.id),
    ...canvasStrokes.map((stroke) => stroke.id),
    ...canvasTextNodes.map((node) => node.id),
  ])
  const canvasEdges = records.canvasEdges.filter(
    (edge) =>
      !edge.topicSessionId &&
      edge.createdAt === createdAt &&
      nodeIds.has(edge.sourceId) &&
      nodeIds.has(edge.targetId),
  )

  await Promise.all([
    ...promptCards.map((card) =>
      db.promptCards.update(card.id, { topicSessionId: sessionId }),
    ),
    ...canvasShapeNodes.map((node) =>
      db.canvasShapeNodes.update(node.id, { topicSessionId: sessionId }),
    ),
    ...canvasImageNodes.map((node) =>
      db.canvasImageNodes.update(node.id, { topicSessionId: sessionId }),
    ),
    ...canvasStrokes.map((stroke) =>
      db.canvasStrokes.update(stroke.id, { topicSessionId: sessionId }),
    ),
    ...canvasTextNodes.map((node) =>
      db.canvasTextNodes.update(node.id, { topicSessionId: sessionId }),
    ),
    ...canvasEdges.map((edge) =>
      db.canvasEdges.update(edge.id, { topicSessionId: sessionId }),
    ),
  ])
}

export async function repairLegacyTopicScope(sessionId: string) {
  const session = await db.chatSessions.get(sessionId)
  if (!session?.canvasId || !session.promptCardId) return

  await repairLegacyTopicScopeRecords({
    canvasId: session.canvasId,
    promptCardId: session.promptCardId,
    sessionId,
  })
}

export async function repairAllLegacyTopicScopes() {
  const sessions = await db.chatSessions.toArray()
  for (const session of sessions) {
    if (session.hidden || !session.canvasId || !session.promptCardId) continue
    await repairLegacyTopicScopeRecords({
      canvasId: session.canvasId,
      promptCardId: session.promptCardId,
      sessionId: session.id,
    })
  }
}

async function listCanvasRecordsByCanvas(canvasId: string) {
  const [
    promptCards,
    canvasShapeNodes,
    canvasImageNodes,
    canvasStrokes,
    canvasTextNodes,
    canvasEdges,
  ] = await Promise.all([
    db.promptCards.where('canvasId').equals(canvasId).toArray(),
    db.canvasShapeNodes.where('canvasId').equals(canvasId).toArray(),
    db.canvasImageNodes.where('canvasId').equals(canvasId).toArray(),
    db.canvasStrokes.where('canvasId').equals(canvasId).toArray(),
    db.canvasTextNodes.where('canvasId').equals(canvasId).toArray(),
    db.canvasEdges.where('canvasId').equals(canvasId).toArray(),
  ])

  return {
    canvasEdges,
    canvasImageNodes,
    canvasShapeNodes,
    canvasStrokes,
    canvasTextNodes,
    promptCards,
  }
}

function filterLegacyBatch<T extends ScopedCanvasRecord>(
  records: T[],
  createdAt: string,
) {
  return records.filter(
    (record) => !record.topicSessionId && record.createdAt === createdAt,
  )
}

type ScopedCanvasRecord =
  | CanvasEdge
  | CanvasImageNode
  | CanvasShapeNode
  | CanvasStroke
  | CanvasTextNode
  | PromptCard
