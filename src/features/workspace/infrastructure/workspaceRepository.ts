import { createPromptCard } from '@/features/prompt-card/model/prompt'
import { DEFAULT_MODEL_SETTINGS_ID } from '@/features/settings/model/defaultModelSettings'
import { selectActiveCompareChildSessions } from '@/features/chat/model/comparePanes'
import { db } from '@/shared/storage/db'
import { filterCanvasRecordsForTopic } from '@/shared/model/canvasTopicScope'
import { sortCanvasesForSidebar } from '@/features/workspace/model/canvasOrdering'
import type { Canvas, ChatTopicExportPayload, ExportPayload, PromptCard } from '@/shared/types'
import { nowIso } from '@/shared/utils/time'
import {
  cloneChatMessageAttachments,
  createTopicImportIdMap,
  isSupportedWorkspacePayloadVersion,
  mapOptionalId,
  mapRequiredId,
  uniqueById,
} from './topicIdMap'
import { getImportedDefaultModelSettings } from './defaultModelSettingsPayload'

export const workspaceRepository = {
  async createCanvas(title?: string) {
    const at = nowIso()
    const canvas: Canvas = {
      id: crypto.randomUUID(),
      title: title?.trim() || '未命名',
      createdAt: at,
      updatedAt: at,
    }
    await db.canvases.add(canvas)
    return canvas
  },

  async updateCanvas(id: string, updates: Partial<Canvas>) {
    await db.canvases.update(id, { ...updates, updatedAt: nowIso() })
  },

  async touchCanvas(canvasId: string) {
    await db.canvases.update(canvasId, { updatedAt: nowIso() })
  },

  async createPromptCard(
    canvasId: string,
    index: number,
    position?: PromptCard['position'],
    topicSessionId?: string,
  ) {
    const card = createPromptCard(canvasId, index, position, topicSessionId)
    await db.promptCards.add(card)
    await this.touchCanvas(canvasId)
    return card
  },

  async savePromptCardCopy(card: PromptCard) {
    await db.promptCards.add(card)
    await this.touchCanvas(card.canvasId)
    return card
  },

  async deletePromptCardNode(id: string, canvasId?: string) {
    await db.promptCards.delete(id)
    if (canvasId) await this.touchCanvas(canvasId)
  },

  async deleteCanvasCascade(id: string) {
    await db.transaction(
      'rw',
      [
        db.canvases,
        db.promptCards,
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
        const cards = await db.promptCards.where('canvasId').equals(id).toArray()
        const cardIds = cards.map((card) => card.id)
        const sessionsByCanvas = await db.chatSessions.where('canvasId').equals(id).toArray()
        const legacySessions = cardIds.length ? await db.chatSessions.where('promptCardId').anyOf(cardIds).toArray() : []
        const sessionIds = Array.from(
          new Set(
            [...sessionsByCanvas, ...legacySessions].map((session) => session.id),
          ),
        )
        await Promise.all([
          db.canvases.delete(id),
          db.promptCards.where('canvasId').equals(id).delete(),
          db.canvasShapeNodes.where('canvasId').equals(id).delete(),
          db.canvasImageNodes.where('canvasId').equals(id).delete(),
          db.canvasEdges.where('canvasId').equals(id).delete(),
          db.canvasStrokes.where('canvasId').equals(id).delete(),
          db.canvasTextNodes.where('canvasId').equals(id).delete(),
          cardIds.length
            ? db.promptVersions.where('promptCardId').anyOf(cardIds).delete()
            : Promise.resolve(),
          db.chatSessions.where('canvasId').equals(id).delete(),
          cardIds.length
            ? db.chatSessions.where('promptCardId').anyOf(cardIds).delete()
            : Promise.resolve(),
          sessionIds.length
            ? db.chatMessages.where('sessionId').anyOf(sessionIds).delete()
            : Promise.resolve(),
          cardIds.length
            ? db.compareRuns.where('promptCardId').anyOf(cardIds).delete()
            : Promise.resolve(),
        ])
      },
    )
  },

  async exportWorkspace(): Promise<ExportPayload> {
    const defaultModelSettings = await db.defaultModelSettings.toArray()

    return {
      version: 8,
      exportedAt: nowIso(),
      canvases: await db.canvases.toArray(),
      promptCards: await db.promptCards.toArray(),
      canvasShapeNodes: await db.canvasShapeNodes.toArray(),
      canvasImageNodes: await db.canvasImageNodes.toArray(),
      canvasEdges: await db.canvasEdges.toArray(),
      canvasStrokes: await db.canvasStrokes.toArray(),
      canvasTextNodes: await db.canvasTextNodes.toArray(),
      promptVersions: await db.promptVersions.toArray(),
      providerConfigs: await db.providerConfigs.toArray(),
      defaultModelSettings: defaultModelSettings.find(
        (settings) => settings.id === DEFAULT_MODEL_SETTINGS_ID,
      ),
      defaultModelSettingsList: defaultModelSettings,
      chatSessions: await db.chatSessions.toArray(),
      chatMessages: await db.chatMessages.toArray(),
      compareRuns: await db.compareRuns.toArray(),
    }
  },

  async importWorkspace(payload: ExportPayload) {
    if (!isSupportedWorkspacePayloadVersion(payload.version)) {
      throw new Error('Unsupported file')
    }
    await db.transaction(
      'rw',
      [
        db.canvases,
        db.promptCards,
        db.canvasShapeNodes,
        db.canvasImageNodes,
        db.canvasEdges,
        db.canvasStrokes,
        db.canvasTextNodes,
        db.promptVersions,
        db.providerConfigs,
        db.defaultModelSettings,
        db.chatSessions,
        db.chatMessages,
        db.compareRuns,
      ],
      async () => {
        await Promise.all([
          db.canvases.clear(),
          db.promptCards.clear(),
          db.canvasShapeNodes.clear(),
          db.canvasImageNodes.clear(),
          db.canvasEdges.clear(),
          db.canvasStrokes.clear(),
          db.canvasTextNodes.clear(),
          db.promptVersions.clear(),
          db.providerConfigs.clear(),
          db.defaultModelSettings.clear(),
          db.chatSessions.clear(),
          db.chatMessages.clear(),
          db.compareRuns.clear(),
        ])

        await Promise.all([
          db.canvases.bulkPut(payload.canvases ?? []),
          db.promptCards.bulkPut(payload.promptCards ?? []),
          db.canvasShapeNodes.bulkPut(payload.canvasShapeNodes ?? []),
          db.canvasImageNodes.bulkPut(payload.canvasImageNodes ?? []),
          db.canvasEdges.bulkPut(payload.canvasEdges ?? []),
          db.canvasStrokes.bulkPut(payload.canvasStrokes ?? []),
          db.canvasTextNodes.bulkPut(payload.canvasTextNodes ?? []),
          db.promptVersions.bulkPut(payload.promptVersions ?? []),
          db.providerConfigs.bulkPut(payload.providerConfigs ?? []),
          db.defaultModelSettings.bulkPut(getImportedDefaultModelSettings(payload)),
          db.chatSessions.bulkPut(payload.chatSessions ?? []),
          db.chatMessages.bulkPut(payload.chatMessages ?? []),
          db.compareRuns.bulkPut(payload.compareRuns ?? []),
        ])
      },
    )
  },

  async exportChatTopic(sessionId: string): Promise<ChatTopicExportPayload> {
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
      canvasShapeNodes: scopedRecords.canvasShapeNodes,
      canvasImageNodes: scopedRecords.canvasImageNodes,
      canvasEdges: scopedRecords.canvasEdges,
      canvasStrokes: scopedRecords.canvasStrokes,
      canvasTextNodes: scopedRecords.canvasTextNodes,
      promptVersions,
      compareRuns,
    }
  },

  async importChatTopic(
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
  },

  async listCanvasesByUpdatedAt() {
    return sortCanvasesForSidebar(await db.canvases.toArray())
  },

  async updateCanvasSortOrders(updates: { id: string; sortOrder: number }[]) {
    if (!updates.length) return
    const at = nowIso()
    await db.transaction('rw', db.canvases, async () => {
      await Promise.all(
        updates.map((update) =>
          db.canvases.update(update.id, {
            sortOrder: update.sortOrder,
            updatedAt: at,
          }),
        ),
      )
    })
  },

  async listPromptCardsByCanvas(canvasId: string) {
    return db.promptCards.where('canvasId').equals(canvasId).sortBy('updatedAt')
  },

  async listPromptCards() { return db.promptCards.toArray() },

  async assignPromptCardToTopic(promptCardId: string, topicSessionId: string) {
    const at = nowIso()
    await Promise.all([
      db.promptCards.update(promptCardId, {
        topicSessionId,
        updatedAt: at,
      }),
      db.chatSessions.update(topicSessionId, {
        promptCardId,
        updatedAt: at,
      }),
    ])
  },

  async listProvidersByUpdatedAt() {
    return db.providerConfigs.reverse().sortBy('updatedAt')
  },
}
