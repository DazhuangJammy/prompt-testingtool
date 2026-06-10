import Dexie, { type Table } from 'dexie'
import type {
  Canvas,
  CanvasEdge,
  CanvasShapeNode,
  CanvasStroke,
  CanvasTextNode,
  ChatMessage,
  ChatSession,
  CompareRun,
  PromptCard,
  PromptVersion,
  ProviderConfig,
} from '@/shared/types'

class PromptCanvasDatabase extends Dexie {
  canvases!: Table<Canvas, string>
  promptCards!: Table<PromptCard, string>
  canvasShapeNodes!: Table<CanvasShapeNode, string>
  canvasEdges!: Table<CanvasEdge, string>
  canvasStrokes!: Table<CanvasStroke, string>
  canvasTextNodes!: Table<CanvasTextNode, string>
  promptVersions!: Table<PromptVersion, string>
  providerConfigs!: Table<ProviderConfig, string>
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
  }
}

export const db = new PromptCanvasDatabase()
