import { selectActiveCompareChildSessions } from '@/features/chat/model/comparePanes'
import { filterCanvasRecordsForTopic } from '@/shared/model/canvasTopicScope'
import { db } from '@/shared/storage/db'
import type { Canvas, ChatTopicExportPayload } from '@/shared/types'
import { nowIso } from '@/shared/utils/time'
import {
  cloneChatMessageAttachments,
  createTopicImportIdMap,
  mapOptionalId,
  mapRequiredId,
  uniqueById,
} from './topicIdMap'

export async function exportChatTopic(
  sessionId: string,
): Promise<ChatTopicExportPayload> {
  const session = await db.chatSessions.get(sessionId)
  if (!session) throw new Error('未找到要导出的话题')
  const canvasId = session.canvasId
  const allChildChatSessions = await db.chatSessions
    .where('parentSessionId')
    .equals(sessionId)
    .toArray()
  const childChatSessions = selectActiveCompareChildSessions(allChildChatSessions)
  const childSessionIds = childChatSessions.map((childSession) => childSession.id)
  const [
    sourceCanvas,
    canvasPromptCards,
    canvasInputCards,
    messages,
    childMessages,
    canvasShapeNodes,
    canvasImageNodes,
    canvasEdges,
    canvasStrokes,
    canvasTextNodes,
  ] = await Promise.all([
    canvasId ? db.canvases.get(canvasId) : Promise.resolve(undefined),
    canvasId
      ? db.promptCards.where('canvasId').equals(canvasId).toArray()
      : Promise.resolve([]),
    canvasId
      ? db.inputCards.where('canvasId').equals(canvasId).toArray()
      : Promise.resolve([]),
    db.chatMessages.where('sessionId').equals(sessionId).sortBy('createdAt'),
    childSessionIds.length
      ? db.chatMessages.where('sessionId').anyOf(childSessionIds).toArray()
      : Promise.resolve([]),
    canvasId
      ? db.canvasShapeNodes.where('canvasId').equals(canvasId).toArray()
      : Promise.resolve([]),
    canvasId
      ? db.canvasImageNodes.where('canvasId').equals(canvasId).toArray()
      : Promise.resolve([]),
    canvasId
      ? db.canvasEdges.where('canvasId').equals(canvasId).toArray()
      : Promise.resolve([]),
    canvasId
      ? db.canvasStrokes.where('canvasId').equals(canvasId).toArray()
      : Promise.resolve([]),
    canvasId
      ? db.canvasTextNodes.where('canvasId').equals(canvasId).toArray()
      : Promise.resolve([]),
  ])
  const scopedRecords = filterCanvasRecordsForTopic({
    canvasEdges,
    canvasImageNodes,
    inputCards: canvasInputCards,
    canvasShapeNodes,
    canvasStrokes,
    canvasTextNodes,
    promptCardId: session.promptCardId,
    promptCards: canvasPromptCards,
    sessionId,
    sessionCreatedAt: session.createdAt,
  })
  const promptCards = scopedRecords.promptCards
  const promptCardIds = promptCards.map((card) => card.id)
  const chatMessages = [...messages, ...childMessages]
  const messagePromptVersionIds = Array.from(
    new Set(chatMessages.map((message) => message.promptVersionId).filter(Boolean)),
  ) as string[]
  const [cardPromptVersions, messagePromptVersions] = await Promise.all([
    promptCardIds.length
      ? db.promptVersions.where('promptCardId').anyOf(promptCardIds).toArray()
      : Promise.resolve([]),
    messagePromptVersionIds.length
      ? db.promptVersions.where('id').anyOf(messagePromptVersionIds).toArray()
      : Promise.resolve([]),
  ])
  const promptVersions = uniqueById([...cardPromptVersions, ...messagePromptVersions])
  const compareRuns = promptCardIds.length
    ? await db.compareRuns.where('promptCardId').anyOf(promptCardIds).toArray()
    : []

  return {
    kind: 'prompt-canvas-chat-topic',
    version: 1,
    exportedAt: nowIso(),
    sourceCanvas,
    chatSession: session,
    childChatSessions,
    chatMessages,
    promptCards,
    inputCards: scopedRecords.inputCards,
    canvasShapeNodes: scopedRecords.canvasShapeNodes,
    canvasImageNodes: scopedRecords.canvasImageNodes,
    canvasEdges: scopedRecords.canvasEdges,
    canvasStrokes: scopedRecords.canvasStrokes,
    canvasTextNodes: scopedRecords.canvasTextNodes,
    promptVersions,
    compareRuns,
  }
}

export async function importChatTopic(
  payload: ChatTopicExportPayload,
  targetCanvasId?: string,
) {
  if (payload.kind !== 'prompt-canvas-chat-topic' || payload.version !== 1) {
    throw new Error('Unsupported topic file')
  }

  const at = nowIso()
  const canvasId = targetCanvasId ?? crypto.randomUUID()
  const sourceCanvasTitle = payload.sourceCanvas?.title?.trim()
  const createdCanvas: Canvas | undefined = targetCanvasId
    ? undefined
    : {
        id: canvasId,
        title: sourceCanvasTitle || '导入工作台',
        createdAt: at,
        updatedAt: at,
      }
  const idMap = createTopicImportIdMap(payload)
  const nextSession = {
    ...payload.chatSession,
    id: idMap.sessions.get(payload.chatSession.id) ?? crypto.randomUUID(),
    canvasId,
    promptCardId: mapOptionalId(payload.chatSession.promptCardId, idMap.promptCards),
    title: payload.chatSession.title?.trim() || '导入话题',
    createdAt: at,
    updatedAt: at,
  }
  const nextSessionId = nextSession.id
  const childChatSessions = (payload.childChatSessions ?? []).map((session, index) => ({
    ...session,
    id: idMap.sessions.get(session.id) ?? crypto.randomUUID(),
    canvasId,
    comparePaneIndex: session.comparePaneIndex ?? index,
    hidden: true,
    parentSessionId: nextSessionId,
    promptCardId: mapOptionalId(session.promptCardId, idMap.promptCards),
    createdAt: at,
    updatedAt: at,
  }))

  await db.transaction(
    'rw',
    [
      db.canvases,
      db.promptCards,
      db.inputCards,
      db.canvasShapeNodes,
      db.canvasImageNodes,
      db.canvasEdges,
      db.canvasStrokes,
      db.canvasTextNodes,
      db.promptVersions,
      db.chatSessions,
      db.chatMessages,
      db.compareRuns,
    ],
    async () => {
      if (createdCanvas) await db.canvases.add(createdCanvas)
      await Promise.all([
        db.promptCards.bulkPut(
          payload.promptCards.map((card) => ({
            ...card,
            id: idMap.promptCards.get(card.id) ?? crypto.randomUUID(),
            canvasId,
            topicSessionId: nextSessionId,
            createdAt: at,
            updatedAt: at,
          })),
        ),
        db.inputCards.bulkPut(
          (payload.inputCards ?? []).map((card) => ({
            ...card,
            id: idMap.nodes.get(card.id) ?? crypto.randomUUID(),
            canvasId,
            topicSessionId: nextSessionId,
            createdAt: at,
            updatedAt: at,
          })),
        ),
        db.canvasShapeNodes.bulkPut(
          (payload.canvasShapeNodes ?? []).map((node) => ({
            ...node,
            id: idMap.nodes.get(node.id) ?? crypto.randomUUID(),
            canvasId,
            topicSessionId: nextSessionId,
            createdAt: at,
            updatedAt: at,
          })),
        ),
        db.canvasImageNodes.bulkPut(
          (payload.canvasImageNodes ?? []).map((node) => ({
            ...node,
            id: idMap.nodes.get(node.id) ?? crypto.randomUUID(),
            canvasId,
            topicSessionId: nextSessionId,
            createdAt: at,
            updatedAt: at,
          })),
        ),
        db.canvasStrokes.bulkPut(
          (payload.canvasStrokes ?? []).map((stroke) => ({
            ...stroke,
            id: idMap.nodes.get(stroke.id) ?? crypto.randomUUID(),
            canvasId,
            topicSessionId: nextSessionId,
            createdAt: at,
            updatedAt: at,
          })),
        ),
        db.canvasTextNodes.bulkPut(
          (payload.canvasTextNodes ?? []).map((node) => ({
            ...node,
            id: idMap.nodes.get(node.id) ?? crypto.randomUUID(),
            canvasId,
            topicSessionId: nextSessionId,
            createdAt: at,
            updatedAt: at,
          })),
        ),
        db.canvasEdges.bulkPut(
          (payload.canvasEdges ?? []).map((edge) => ({
            ...edge,
            id: idMap.edges.get(edge.id) ?? crypto.randomUUID(),
            canvasId,
            topicSessionId: nextSessionId,
            sourceId: mapRequiredId(edge.sourceId, idMap.nodes),
            targetId: mapRequiredId(edge.targetId, idMap.nodes),
            createdAt: at,
            updatedAt: at,
          })),
        ),
        db.promptVersions.bulkPut(
          payload.promptVersions.map((version) => ({
            ...version,
            id: idMap.promptVersions.get(version.id) ?? crypto.randomUUID(),
            promptCardId: mapRequiredId(version.promptCardId, idMap.promptCards),
            createdAt: version.createdAt || at,
          })),
        ),
        db.compareRuns.bulkPut(
          payload.compareRuns.map((run) => ({
            ...run,
            id: idMap.compareRuns.get(run.id) ?? crypto.randomUUID(),
            promptCardId: mapRequiredId(run.promptCardId, idMap.promptCards),
            oldVersionId: mapRequiredId(run.oldVersionId, idMap.promptVersions),
            newVersionId: mapRequiredId(run.newVersionId, idMap.promptVersions),
            createdAt: run.createdAt || at,
          })),
        ),
      ])
      await db.chatSessions.bulkPut([nextSession, ...childChatSessions])
      await db.chatMessages.bulkPut(
        payload.chatMessages.map((message) => ({
          ...message,
          id: idMap.messages.get(message.id) ?? crypto.randomUUID(),
          sessionId: mapRequiredId(message.sessionId, idMap.sessions),
          attachments: cloneChatMessageAttachments(message.attachments),
          promptVersionId: mapOptionalId(
            message.promptVersionId,
            idMap.promptVersions,
          ),
          status: message.status === 'streaming' ? 'complete' : message.status,
          createdAt: message.createdAt || at,
        })),
      )
      await db.canvases.update(canvasId, { updatedAt: at })
    },
  )
  return {
    canvasId,
    sessionId: nextSession.id,
    promptCardId: nextSession.promptCardId,
    promptCardIdMap: Object.fromEntries(idMap.promptCards),
  }
}
