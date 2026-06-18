import { createPromptCard } from '@/features/prompt-card/model/prompt'
import { DEFAULT_MODEL_SETTINGS_ID } from '@/features/settings/model/defaultModelSettings'
import { db } from '@/shared/storage/db'
import type { Canvas, ExportPayload, PromptCard } from '@/shared/types'
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
