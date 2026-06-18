import Dexie, { type Table } from 'dexie'
import type {
  Canvas,
  CanvasEdge,
  CanvasImageNode,
  CanvasShapeNode,
  CanvasStroke,
  CanvasTextNode,
  ChatMessage,
  ChatSession,
  CompareRun,
  DefaultModelSettings,
  PromptCard,
  PromptVersion,
  ProviderConfig,
} from '@/shared/types'

class PromptCanvasDatabase extends Dexie {
  canvases!: Table<Canvas, string>
  promptCards!: Table<PromptCard, string>
  canvasShapeNodes!: Table<CanvasShapeNode, string>
  canvasEdges!: Table<CanvasEdge, string>
  canvasImageNodes!: Table<CanvasImageNode, string>
  canvasStrokes!: Table<CanvasStroke, string>
  canvasTextNodes!: Table<CanvasTextNode, string>
  promptVersions!: Table<PromptVersion, string>
  providerConfigs!: Table<ProviderConfig, string>
  defaultModelSettings!: Table<DefaultModelSettings, string>
  chatSessions!: Table<ChatSession, string>
  chatMessages!: Table<ChatMessage, string>
  compareRuns!: Table<CompareRun, string>

  constructor() {
    super('prompt-canvas-tool')
    this.version(1).stores({
      canvases: 'id, updatedAt',
      promptCards: 'id, canvasId, updatedAt',
      promptVersions: 'id, promptCardId, createdAt',
      providerConfigs: 'id, updatedAt',
      chatSessions: 'id, promptCardId, updatedAt',
      chatMessages: 'id, sessionId, createdAt, promptVersionId',
      compareRuns: 'id, promptCardId, createdAt',
    })
    this.version(2).stores({
      canvases: 'id, updatedAt',
      promptCards: 'id, canvasId, updatedAt',
      canvasShapeNodes: 'id, canvasId, updatedAt',
      canvasEdges: 'id, canvasId, sourceId, targetId, updatedAt',
      canvasStrokes: 'id, canvasId, updatedAt',
      promptVersions: 'id, promptCardId, createdAt',
      providerConfigs: 'id, updatedAt',
      chatSessions: 'id, promptCardId, updatedAt',
      chatMessages: 'id, sessionId, createdAt, promptVersionId',
      compareRuns: 'id, promptCardId, createdAt',
    })
    this.version(3).stores({
      canvases: 'id, updatedAt',
      promptCards: 'id, canvasId, updatedAt',
      canvasShapeNodes: 'id, canvasId, updatedAt',
      canvasEdges: 'id, canvasId, sourceId, targetId, updatedAt',
      canvasStrokes: 'id, canvasId, updatedAt',
      canvasTextNodes: 'id, canvasId, updatedAt',
      promptVersions: 'id, promptCardId, createdAt',
      providerConfigs: 'id, updatedAt',
      chatSessions: 'id, promptCardId, updatedAt',
      chatMessages: 'id, sessionId, createdAt, promptVersionId',
      compareRuns: 'id, promptCardId, createdAt',
    })
    this.version(4)
      .stores({
        canvases: 'id, updatedAt',
        promptCards: 'id, canvasId, updatedAt',
        canvasShapeNodes: 'id, canvasId, updatedAt',
        canvasEdges: 'id, canvasId, sourceId, targetId, updatedAt',
        canvasStrokes: 'id, canvasId, updatedAt',
        canvasTextNodes: 'id, canvasId, updatedAt',
        promptVersions: 'id, promptCardId, createdAt',
        providerConfigs: 'id, updatedAt',
        chatSessions: 'id, canvasId, promptCardId, updatedAt',
        chatMessages: 'id, sessionId, createdAt, promptVersionId',
        compareRuns: 'id, promptCardId, createdAt',
      })
      .upgrade(async (transaction) => {
        const promptCards = transaction.table<PromptCard, string>('promptCards')
        const chatSessions = transaction.table<ChatSession, string>('chatSessions')
        const cards = await promptCards.toArray()
        const canvasIdByCardId = new Map(cards.map((card) => [card.id, card.canvasId]))

        await chatSessions.toCollection().modify((session) => {
          if (session.canvasId || !session.promptCardId) return
          session.canvasId = canvasIdByCardId.get(session.promptCardId)
        })
      })
    this.version(5).stores({
      canvases: 'id, updatedAt',
      promptCards: 'id, canvasId, updatedAt',
      canvasShapeNodes: 'id, canvasId, updatedAt',
      canvasEdges: 'id, canvasId, sourceId, targetId, updatedAt',
      canvasStrokes: 'id, canvasId, updatedAt',
      canvasTextNodes: 'id, canvasId, updatedAt',
      canvasImageNodes: 'id, canvasId, updatedAt',
      promptVersions: 'id, promptCardId, createdAt',
      providerConfigs: 'id, updatedAt',
      chatSessions: 'id, canvasId, promptCardId, updatedAt',
      chatMessages: 'id, sessionId, createdAt, promptVersionId',
      compareRuns: 'id, promptCardId, createdAt',
    })
    this.version(6).stores({
      canvases: 'id, updatedAt',
      promptCards: 'id, canvasId, updatedAt',
      canvasShapeNodes: 'id, canvasId, updatedAt',
      canvasEdges: 'id, canvasId, sourceId, targetId, updatedAt',
      canvasStrokes: 'id, canvasId, updatedAt',
      canvasTextNodes: 'id, canvasId, updatedAt',
      canvasImageNodes: 'id, canvasId, updatedAt',
      promptVersions: 'id, promptCardId, createdAt',
      providerConfigs: 'id, updatedAt',
      defaultModelSettings: 'id, updatedAt',
      chatSessions: 'id, canvasId, promptCardId, updatedAt',
      chatMessages: 'id, sessionId, createdAt, promptVersionId',
      compareRuns: 'id, promptCardId, createdAt',
    })
  }
}

export const db = new PromptCanvasDatabase()
