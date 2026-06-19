import { createPromptCard } from '@/features/prompt-card/model/prompt'
import { DEFAULT_MODEL_SETTINGS_ID } from '@/features/settings/model/defaultModelSettings'
import { db } from '@/shared/storage/db'
import type {
  Canvas,
  ChatTopicExportPayload,
  ExportPayload,
  PromptCard,
} from '@/shared/types'
import { nowIso } from '@/shared/utils/time'

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
  ) {
    const card = createPromptCard(canvasId, index, position)
    await db.promptCards.add(card)
    await this.touchCanvas(canvasId)
    return card
  },

  async savePromptCardCopy(card: PromptCard) {
    await db.promptCards.add(card)
    await this.touchCanvas(card.canvasId)
    return card
  },

  async deletePromptCardCascade(id: string) {
    await Promise.all([
      db.promptCards.delete(id),
      db.canvasEdges.where('sourceId').equals(id).delete(),
      db.canvasEdges.where('targetId').equals(id).delete(),
      db.promptVersions.where('promptCardId').equals(id).delete(),
      db.compareRuns.where('promptCardId').equals(id).delete(),
    ])
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
        const sessionsByCanvas = await db.chatSessions
          .where('canvasId')
          .equals(id)
          .toArray()
        const legacySessions = cardIds.length
          ? await db.chatSessions.where('promptCardId').anyOf(cardIds).toArray()
          : []
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
            ? db.chatMessages
                .where('sessionId')
                .anyOf(sessionIds)
                .delete()
            : Promise.resolve(),
          cardIds.length
            ? db.compareRuns.where('promptCardId').anyOf(cardIds).delete()
            : Promise.resolve(),
        ])
      },
    )
  },

  async exportWorkspace(): Promise<ExportPayload> {
    return {
      version: 6,
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
      defaultModelSettings: await db.defaultModelSettings.get(
        DEFAULT_MODEL_SETTINGS_ID,
      ),
      chatSessions: await db.chatSessions.toArray(),
      chatMessages: await db.chatMessages.toArray(),
      compareRuns: await db.compareRuns.toArray(),
    }
  },

  async importWorkspace(payload: ExportPayload) {
    if (
      payload.version !== 1 &&
      payload.version !== 2 &&
      payload.version !== 3 &&
      payload.version !== 4 &&
      payload.version !== 5 &&
      payload.version !== 6
    ) {
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
          payload.defaultModelSettings
            ? db.defaultModelSettings.put(payload.defaultModelSettings)
            : Promise.resolve(),
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
    const [sourceCanvas, promptCards, messages] = await Promise.all([
      canvasId ? db.canvases.get(canvasId) : Promise.resolve(undefined),
      canvasId
        ? db.promptCards.where('canvasId').equals(canvasId).toArray()
        : Promise.resolve([]),
      db.chatMessages.where('sessionId').equals(sessionId).sortBy('createdAt'),
    ])
    const promptCardIds = promptCards.map((card) => card.id)
    const messagePromptVersionIds = Array.from(
      new Set(messages.map((message) => message.promptVersionId).filter(Boolean)),
    ) as string[]
    const [cardPromptVersions, messagePromptVersions] = await Promise.all([
      promptCardIds.length
        ? db.promptVersions.where('promptCardId').anyOf(promptCardIds).toArray()
        : Promise.resolve([]),
      messagePromptVersionIds.length
        ? db.promptVersions.where('id').anyOf(messagePromptVersionIds).toArray()
        : Promise.resolve([]),
    ])
    const promptVersions = uniqueById([
      ...cardPromptVersions,
      ...messagePromptVersions,
    ])
    const compareRuns = promptCardIds.length
      ? await db.compareRuns.where('promptCardId').anyOf(promptCardIds).toArray()
      : []

    return {
      kind: 'prompt-canvas-chat-topic',
      version: 1,
      exportedAt: nowIso(),
      sourceCanvas,
      chatSession: session,
      chatMessages: messages,
      promptCards,
      canvasShapeNodes: canvasId
        ? await db.canvasShapeNodes.where('canvasId').equals(canvasId).toArray()
        : [],
      canvasImageNodes: canvasId
        ? await db.canvasImageNodes.where('canvasId').equals(canvasId).toArray()
        : [],
      canvasEdges: canvasId
        ? await db.canvasEdges.where('canvasId').equals(canvasId).toArray()
        : [],
      canvasStrokes: canvasId
        ? await db.canvasStrokes.where('canvasId').equals(canvasId).toArray()
        : [],
      canvasTextNodes: canvasId
        ? await db.canvasTextNodes.where('canvasId').equals(canvasId).toArray()
        : [],
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
              createdAt: at,
              updatedAt: at,
            })),
          ),
          db.canvasShapeNodes.bulkPut(
            (payload.canvasShapeNodes ?? []).map((node) => ({
              ...node,
              id: idMap.nodes.get(node.id) ?? crypto.randomUUID(),
              canvasId,
              createdAt: at,
              updatedAt: at,
            })),
          ),
          db.canvasImageNodes.bulkPut(
            (payload.canvasImageNodes ?? []).map((node) => ({
              ...node,
              id: idMap.nodes.get(node.id) ?? crypto.randomUUID(),
              canvasId,
              createdAt: at,
              updatedAt: at,
            })),
          ),
          db.canvasStrokes.bulkPut(
            (payload.canvasStrokes ?? []).map((stroke) => ({
              ...stroke,
              id: idMap.nodes.get(stroke.id) ?? crypto.randomUUID(),
              canvasId,
              createdAt: at,
              updatedAt: at,
            })),
          ),
          db.canvasTextNodes.bulkPut(
            (payload.canvasTextNodes ?? []).map((node) => ({
              ...node,
              id: idMap.nodes.get(node.id) ?? crypto.randomUUID(),
              canvasId,
              createdAt: at,
              updatedAt: at,
            })),
          ),
          db.canvasEdges.bulkPut(
            (payload.canvasEdges ?? []).map((edge) => ({
              ...edge,
              id: idMap.edges.get(edge.id) ?? crypto.randomUUID(),
              canvasId,
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
        await db.chatSessions.add(nextSession)
        await db.chatMessages.bulkPut(
          payload.chatMessages.map((message) => ({
            ...message,
            id: idMap.messages.get(message.id) ?? crypto.randomUUID(),
            sessionId: nextSession.id,
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

    return { canvasId, sessionId: nextSession.id }
  },

  async listCanvasesByUpdatedAt() {
    return db.canvases.reverse().sortBy('updatedAt')
  },

  async listPromptCardsByCanvas(canvasId: string) {
    return db.promptCards.where('canvasId').equals(canvasId).sortBy('updatedAt')
  },

  async listProvidersByUpdatedAt() {
    return db.providerConfigs.reverse().sortBy('updatedAt')
  },
}

function createTopicImportIdMap(payload: ChatTopicExportPayload) {
  const promptCards = new Map(
    payload.promptCards.map((card) => [card.id, crypto.randomUUID()]),
  )
  const nodes = new Map<string, string>([
    ...payload.promptCards.map((card) => [card.id, promptCards.get(card.id)!] as const),
    ...(payload.canvasShapeNodes ?? []).map(
      (node) => [node.id, crypto.randomUUID()] as const,
    ),
    ...(payload.canvasImageNodes ?? []).map(
      (node) => [node.id, crypto.randomUUID()] as const,
    ),
    ...(payload.canvasStrokes ?? []).map(
      (stroke) => [stroke.id, crypto.randomUUID()] as const,
    ),
    ...(payload.canvasTextNodes ?? []).map(
      (node) => [node.id, crypto.randomUUID()] as const,
    ),
  ])

  return {
    promptCards,
    nodes,
    edges: new Map(
      (payload.canvasEdges ?? []).map((edge) => [edge.id, crypto.randomUUID()]),
    ),
    promptVersions: new Map(
      payload.promptVersions.map((version) => [version.id, crypto.randomUUID()]),
    ),
    sessions: new Map([[payload.chatSession.id, crypto.randomUUID()]]),
    messages: new Map(
      payload.chatMessages.map((message) => [message.id, crypto.randomUUID()]),
    ),
    compareRuns: new Map(
      payload.compareRuns.map((run) => [run.id, crypto.randomUUID()]),
    ),
  }
}

function mapOptionalId(id: string | undefined, map: Map<string, string>) {
  return id ? map.get(id) : undefined
}

function mapRequiredId(id: string, map: Map<string, string>) {
  return map.get(id) ?? id
}

function uniqueById<T extends { id: string }>(items: T[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()]
}
