import { createPromptCard } from '@/features/prompt-card/model/prompt'
import { createInputCard } from '@/features/input-card/model/inputCard'
import { DEFAULT_MODEL_SETTINGS_ID } from '@/features/settings/model/defaultModelSettings'
import { db } from '@/shared/storage/db'
import { sortCanvasesForSidebar } from '@/features/workspace/model/canvasOrdering'
import type {
  Canvas,
  ChatTopicExportPayload,
  ExportPayload,
  InputCard,
  PromptCard,
} from '@/shared/types'
import { nowIso } from '@/shared/utils/time'
import {
  isSupportedWorkspacePayloadVersion,
} from './topicIdMap'
import { getImportedDefaultModelSettings } from './defaultModelSettingsPayload'
import {
  exportChatTopic,
  importChatTopic,
} from './chatTopicTransfer'

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

  async createInputCard(
    canvasId: string,
    index: number,
    position?: InputCard['position'],
    topicSessionId?: string,
  ) {
    const card = createInputCard(canvasId, index, position, topicSessionId)
    await db.inputCards.add(card)
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

  async deleteInputCardNode(id: string, canvasId?: string) {
    await db.inputCards.delete(id)
    if (canvasId) await this.touchCanvas(canvasId)
  },

  async deleteCanvasCascade(id: string) {
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
          db.inputCards.where('canvasId').equals(id).delete(),
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
      version: 10,
      exportedAt: nowIso(),
      canvases: await db.canvases.toArray(),
      promptCards: await db.promptCards.toArray(),
      inputCards: await db.inputCards.toArray(),
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
      knowledgeBases: await db.knowledgeBases.toArray(),
      knowledgeItems: await db.knowledgeItems.toArray(),
      knowledgeChunks: await db.knowledgeChunks.toArray(),
      chatKnowledgeSelections: await db.chatKnowledgeSelections.toArray(),
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
        db.inputCards,
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
        db.chatKnowledgeSelections,
        db.compareRuns,
        db.knowledgeBases,
        db.knowledgeItems,
        db.knowledgeChunks,
      ],
      async () => {
        await Promise.all([
          db.canvases.clear(),
          db.promptCards.clear(),
          db.inputCards.clear(),
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
          db.chatKnowledgeSelections.clear(),
          db.compareRuns.clear(),
          db.knowledgeBases.clear(),
          db.knowledgeItems.clear(),
          db.knowledgeChunks.clear(),
        ])

        await Promise.all([
          db.canvases.bulkPut(payload.canvases ?? []),
          db.promptCards.bulkPut(payload.promptCards ?? []),
          db.inputCards.bulkPut(payload.inputCards ?? []),
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
          db.chatKnowledgeSelections.bulkPut(payload.chatKnowledgeSelections ?? []),
          db.compareRuns.bulkPut(payload.compareRuns ?? []),
          db.knowledgeBases.bulkPut(payload.knowledgeBases ?? []),
          db.knowledgeItems.bulkPut(payload.knowledgeItems ?? []),
          db.knowledgeChunks.bulkPut(payload.knowledgeChunks ?? []),
        ])
      },
    )
  },

  async exportChatTopic(sessionId: string): Promise<ChatTopicExportPayload> {
    return exportChatTopic(sessionId)
  },

  async importChatTopic(
    payload: ChatTopicExportPayload,
    targetCanvasId?: string,
  ) {
    return importChatTopic(payload, targetCanvasId)
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

  async listInputCardsByCanvas(canvasId: string) {
    return db.inputCards.where('canvasId').equals(canvasId).sortBy('updatedAt')
  },

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
