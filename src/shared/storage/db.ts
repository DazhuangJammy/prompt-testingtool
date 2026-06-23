import Dexie, { type Table } from 'dexie'
import type {
  Canvas,
  CanvasEdge,
  CanvasImageNode,
  InputCard,
  CanvasShapeNode,
  CanvasStroke,
  CanvasTextNode,
  ChatMessage,
  ChatSession,
  ChatKnowledgeSelection,
  CompareRun,
  DefaultModelSettings,
  KnowledgeBase,
  KnowledgeChunk,
  KnowledgeItem,
  PromptCard,
  PromptVersion,
  ProviderConfig,
  SkillLabMessage,
  SkillAnalysisSnapshot,
  SkillsLabSettings,
  SkillTopic,
} from '@/shared/types'

class PromptCanvasDatabase extends Dexie {
  canvases!: Table<Canvas, string>
  promptCards!: Table<PromptCard, string>
  inputCards!: Table<InputCard, string>
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
  chatKnowledgeSelections!: Table<ChatKnowledgeSelection, string>
  compareRuns!: Table<CompareRun, string>
  knowledgeBases!: Table<KnowledgeBase, string>
  knowledgeItems!: Table<KnowledgeItem, string>
  knowledgeChunks!: Table<KnowledgeChunk, string>
  skillTopics!: Table<SkillTopic, string>
  skillLabMessages!: Table<SkillLabMessage, string>
  skillAnalysisSnapshots!: Table<SkillAnalysisSnapshot, string>
  skillsLabSettings!: Table<SkillsLabSettings, string>

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
    this.version(7).stores({
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
      chatSessions: 'id, canvasId, promptCardId, parentSessionId, hidden, updatedAt',
      chatMessages: 'id, sessionId, createdAt, promptVersionId',
      compareRuns: 'id, promptCardId, createdAt',
    })
    this.version(8).stores({
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
      chatSessions: 'id, canvasId, promptCardId, parentSessionId, hidden, updatedAt',
      chatMessages: 'id, sessionId, createdAt, promptVersionId',
      compareRuns: 'id, promptCardId, createdAt',
      skillTopics: 'id, skillPath, updatedAt',
      skillLabMessages: 'id, topicId, createdAt',
      skillsLabSettings: 'id, updatedAt',
    })
    this.version(9).stores({
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
      chatSessions: 'id, canvasId, promptCardId, parentSessionId, hidden, updatedAt',
      chatMessages: 'id, sessionId, createdAt, promptVersionId',
      compareRuns: 'id, promptCardId, createdAt',
      skillTopics: 'id, skillPath, updatedAt',
      skillLabMessages: 'id, topicId, createdAt',
      skillAnalysisSnapshots: 'id, topicId, createdAt',
      skillsLabSettings: 'id, updatedAt',
    })
    this.version(10).stores({
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
      chatSessions: 'id, canvasId, promptCardId, parentSessionId, hidden, updatedAt',
      chatMessages: 'id, sessionId, createdAt, promptVersionId',
      compareRuns: 'id, promptCardId, createdAt',
      skillTopics: 'id, skillPath, agentSessionId, updatedAt',
      skillLabMessages: 'id, topicId, agentSessionId, createdAt',
      skillAnalysisSnapshots: 'id, topicId, createdAt',
      skillsLabSettings: 'id, updatedAt',
    })
    this.version(11).stores({
      canvases: 'id, updatedAt',
      promptCards: 'id, canvasId, updatedAt',
      inputCards: 'id, canvasId, updatedAt',
      canvasShapeNodes: 'id, canvasId, updatedAt',
      canvasEdges: 'id, canvasId, sourceId, targetId, updatedAt',
      canvasStrokes: 'id, canvasId, updatedAt',
      canvasTextNodes: 'id, canvasId, updatedAt',
      canvasImageNodes: 'id, canvasId, updatedAt',
      promptVersions: 'id, promptCardId, createdAt',
      providerConfigs: 'id, updatedAt',
      defaultModelSettings: 'id, updatedAt',
      chatSessions: 'id, canvasId, promptCardId, parentSessionId, hidden, updatedAt',
      chatMessages: 'id, sessionId, createdAt, promptVersionId',
      compareRuns: 'id, promptCardId, createdAt',
      skillTopics: 'id, skillPath, agentSessionId, updatedAt',
      skillLabMessages: 'id, topicId, agentSessionId, createdAt',
      skillAnalysisSnapshots: 'id, topicId, createdAt',
      skillsLabSettings: 'id, updatedAt',
    })
    this.version(12).stores({
      canvases: 'id, updatedAt',
      promptCards: 'id, canvasId, updatedAt',
      inputCards: 'id, canvasId, updatedAt',
      canvasShapeNodes: 'id, canvasId, updatedAt',
      canvasEdges: 'id, canvasId, sourceId, targetId, updatedAt',
      canvasStrokes: 'id, canvasId, updatedAt',
      canvasTextNodes: 'id, canvasId, updatedAt',
      canvasImageNodes: 'id, canvasId, updatedAt',
      promptVersions: 'id, promptCardId, createdAt',
      providerConfigs: 'id, updatedAt',
      defaultModelSettings: 'id, updatedAt',
      chatSessions: 'id, canvasId, promptCardId, parentSessionId, hidden, updatedAt',
      chatMessages: 'id, sessionId, createdAt, promptVersionId',
      chatKnowledgeSelections: 'id, sessionId, updatedAt',
      compareRuns: 'id, promptCardId, createdAt',
      skillTopics: 'id, skillPath, agentSessionId, updatedAt',
      skillLabMessages: 'id, topicId, agentSessionId, createdAt',
      skillAnalysisSnapshots: 'id, topicId, createdAt',
      skillsLabSettings: 'id, updatedAt',
      knowledgeBases: 'id, providerType, updatedAt',
      knowledgeItems: 'id, baseId, sourceType, status, updatedAt',
      knowledgeChunks: 'id, baseId, itemId, [baseId+itemId], createdAt',
    })
  }
}

export const db = new PromptCanvasDatabase()
