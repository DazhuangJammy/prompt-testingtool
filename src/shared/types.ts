import type {
  ChatKnowledgeReference,
  ChatKnowledgeSelection,
  KnowledgeBase,
  KnowledgeChunk,
  KnowledgeItem,
} from './knowledge.types'
import type {
  WebSearchReference,
  WebSearchSettings,
  WebSearchStreamStatus,
} from './webSearch.types'

export type PromptSectionKey = string
export type {
  ChatKnowledgeReference,
  ChatKnowledgeSelection,
  KnowledgeBase,
  KnowledgeChunk,
  KnowledgeItem,
  KnowledgeItemStatus,
  KnowledgeProviderType,
  KnowledgeRagConfig,
  KnowledgeSearchResult,
  KnowledgeSourceType,
} from './knowledge.types'
export type {
  WebSearchCapability,
  WebSearchCompressionConfig,
  WebSearchCompressionMethod,
  WebSearchProviderConfig,
  WebSearchProviderId,
  WebSearchProviderType,
  WebSearchReference,
  CompletionWebSearchToolConfig,
  WebSearchResponse,
  WebSearchResult,
  WebSearchSettings,
  WebSearchStreamStatus,
} from './webSearch.types'
export type ThemeMode = 'light' | 'dark'
export type WorkspaceMode = 'prompt' | 'knowledge' | 'skills'

export interface Canvas {
  id: string
  title: string
  sortOrder?: number
  createdAt: string
  updatedAt: string
}

export interface CanvasNodeFrameStyle {
  borderColor?: string
  highlighted?: boolean
}

export interface PromptCard {
  id: string
  canvasId: string
  topicSessionId?: string
  title: string
  position: { x: number; y: number }
  groupId?: string
  frameStyle?: CanvasNodeFrameStyle
  markdown?: string
  defaultCollapsed?: boolean
  collapsedMarkdownHeadingIds?: string[]
  sections: Record<PromptSectionKey, PromptSection>
  createdAt: string
  updatedAt: string
}

export interface InputCard {
  id: string
  canvasId: string
  topicSessionId?: string
  title: string
  position: { x: number; y: number }
  groupId?: string
  markdown: string
  collapsedMarkdownHeadingIds?: string[]
  frameStyle?: CanvasNodeFrameStyle
  createdAt: string
  updatedAt: string
}

export type CanvasShapeKind = 'step' | 'decision' | 'text'

export interface CanvasPoint {
  x: number
  y: number
}

export interface CanvasShapeNode {
  id: string
  canvasId: string
  topicSessionId?: string
  kind: CanvasShapeKind
  title: string
  body: string
  position: CanvasPoint
  width: number
  height: number
  groupId?: string
  frameStyle?: CanvasNodeFrameStyle
  createdAt: string
  updatedAt: string
}

export interface CanvasEdge {
  id: string
  canvasId: string
  topicSessionId?: string
  sourceId: string
  targetId: string
  sourceHandle?: string
  targetHandle?: string
  createdAt: string
  updatedAt: string
}

export interface CanvasStroke {
  id: string
  canvasId: string
  topicSessionId?: string
  points: CanvasPoint[]
  color: string
  strokeWidth: number
  groupId?: string
  createdAt: string
  updatedAt: string
}

export interface CanvasTextNode {
  id: string
  canvasId: string
  topicSessionId?: string
  text: string
  position: CanvasPoint
  width: number
  color: string
  fontSize: number
  backgroundColor: string
  groupId?: string
  frameStyle?: CanvasNodeFrameStyle
  createdAt: string
  updatedAt: string
}

export interface CanvasImageNode {
  id: string
  canvasId: string
  topicSessionId?: string
  name: string
  mimeType: string
  dataUrl: string
  position: CanvasPoint
  width: number
  height: number
  groupId?: string
  createdAt: string
  updatedAt: string
}

export interface PromptSection {
  markdown: string
  workflowSteps?: WorkflowStep[]
}

export interface WorkflowStep {
  id: string
  title: string
  markdown: string
  order: number
}

export interface PromptVersion {
  id: string
  promptCardId: string
  compiledMarkdown: string
  createdAt: string
  reason: 'chat-send' | 'compare' | 'manual'
}

export type ProviderType =
  | 'openai'
  | 'deepseek'
  | 'volcengine'
  | 'moonshot'
  | 'minimax'
  | 'dashscope'
  | 'zai'
  | 'siliconflow'
  | 'custom'

export interface ProviderModelConfig {
  id: string
  group?: string
  capabilities?: ProviderModelCapability[]
  name?: string
  enabled: boolean
}

export type ProviderModelCapability =
  | 'chat'
  | 'reasoning'
  | 'embedding'
  | 'rerank'
  | 'vision'
  | 'function-call'

export interface ProviderConfig {
  id: string
  sourceProviderId?: string
  name: string
  type?: ProviderType
  baseUrl: string
  apiKey: string
  model: string
  models?: ProviderModelConfig[]
  enabled?: boolean
  order?: number
  createdAt: string
  updatedAt: string
}

export interface DefaultModelSettings {
  id: string
  providerId?: string
  modelId?: string
  assistantName: string
  prompt: string
  thinkingMode?: ThinkingMode
  createdAt: string
  updatedAt: string
}

export type SkillAgentTool = 'codex' | 'claude-code' | 'openclaw' | 'mock'
export type SkillAgentPermissionMode = 'read-only' | 'allow-write'

export interface SkillsLabSettings {
  id: 'skills-lab'
  defaultTool: SkillAgentTool
  toolCommand: string
  defaultSkillsDirectory: string
  autoRunChecks: boolean
  requireChangeConfirmation: boolean
  permissionMode: SkillAgentPermissionMode
  createdAt: string
  updatedAt: string
}

export interface QuickPhraseGroup {
  id: string
  name: string
  sortOrder?: number
  createdAt: string
  updatedAt: string
}

export interface QuickPhrase {
  id: string
  title: string
  content: string
  groupId?: string
  sortOrder?: number
  createdAt: string
  updatedAt: string
}

export type SkillGraphNodeType =
  | 'main'
  | 'reference'
  | 'asset'
  | 'script'
  | 'test'
  | 'rule'
  | 'folder'
  | 'unknown'

export type SkillGraphConfidence = 'explicit' | 'rule' | 'inferred'
export type SkillGraphEdgeRelation =
  | 'reads'
  | 'uses'
  | 'runs'
  | 'triggers'
  | 'generates'
  | 'contains'
  | 'tests'
  | 'suggests'

export interface SkillGraphNode {
  id: string
  type: SkillGraphNodeType
  label: string
  body?: string
  file?: string
  evidence?: string
  confidence: SkillGraphConfidence
}

export interface SkillGraphEdge {
  id: string
  from: string
  to: string
  relation: SkillGraphEdgeRelation
  label?: string
  evidence?: string
  confidence: SkillGraphConfidence
}

export interface SkillGraphIssue {
  id: string
  severity: 'info' | 'warning' | 'error'
  title: string
  detail: string
  nodeId?: string
}

export interface SkillGraph {
  skill: {
    name: string
    description: string
    sourcePath: string
    sourceFile?: string
  }
  summary: string
  nodes: SkillGraphNode[]
  edges: SkillGraphEdge[]
  issues: SkillGraphIssue[]
  testSuggestions: string[]
  generatedAt: string
}

export interface SkillTopic {
  id: string
  title: string
  skillPath?: string
  agentSessionId?: string
  graph?: SkillGraph
  lastAnalysisAt?: string
  lastFileSignature?: string
  status?: 'idle' | 'analyzing' | 'error'
  error?: string
  sortOrder?: number
  createdAt: string
  updatedAt: string
}

export interface SkillAnalysisSnapshot {
  id: string
  topicId: string
  graph: SkillGraph
  fileSignature?: string
  createdAt: string
}

export interface SkillFileStatusItem {
  path: string
  size: number
  mtimeMs: number
}

export interface SkillFileStatus {
  fileSignature?: string
  files: SkillFileStatusItem[]
}

export interface SkillFileChangeSummary {
  added: string[]
  modified: string[]
  removed: string[]
}

export interface SkillLabMessage {
  id: string
  topicId: string
  role: 'user' | 'assistant' | 'system'
  kind: 'question' | 'suggestion' | 'test' | 'analysis'
  content: string
  format?: 'markdown' | 'terminal'
  stream?: 'stdout' | 'stderr'
  agentSessionId?: string
  nodeId?: string
  status?: 'streaming' | 'complete' | 'error'
  createdAt: string
}

export interface ChatSession {
  id: string
  canvasId?: string
  promptCardId?: string
  parentSessionId?: string
  comparePaneIndex?: number
  title: string
  hidden?: boolean
  sortOrder?: number
  createdAt: string
  updatedAt: string
}

export type ChatTopic = ChatSession

export interface ChatMessage {
  id: string
  sessionId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  attachments?: ChatAttachment[]
  knowledgeReferences?: ChatKnowledgeReference[]
  webSearchReferences?: WebSearchReference[]
  webSearchStatus?: WebSearchStreamStatus
  promptVersionId?: string
  thinkingMode?: ThinkingMode
  thinkingDurationMs?: number
  status?: 'streaming' | 'complete'
  createdAt: string
}

export type ChatAttachmentKind = 'image' | 'text' | 'document'

export interface ChatAttachment {
  id: string
  name: string
  mimeType: string
  size: number
  kind: ChatAttachmentKind
  dataUrl?: string
  text?: string
}

export type CompletionContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }
  | { type: 'file'; file: { filename: string; file_data: string } }

export interface CompletionMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | CompletionContentPart[]
}

export type ThinkingMode = 'auto' | 'off' | 'light' | 'on' | 'deep'
export type PromptInjectionMode = 'system' | 'user'

export interface CompareRun {
  id: string
  promptCardId: string
  oldVersionId: string
  newVersionId: string
  input: string
  oldOutput: string
  newOutput: string
  createdAt: string
}

export interface ExportPayload {
  version: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
  exportedAt: string
  canvases: Canvas[]
  promptCards: PromptCard[]
  inputCards?: InputCard[]
  canvasShapeNodes?: CanvasShapeNode[]
  canvasEdges?: CanvasEdge[]
  canvasStrokes?: CanvasStroke[]
  canvasTextNodes?: CanvasTextNode[]
  canvasImageNodes?: CanvasImageNode[]
  promptVersions: PromptVersion[]
  providerConfigs: ProviderConfig[]
  defaultModelSettings?: DefaultModelSettings
  defaultModelSettingsList?: DefaultModelSettings[]
  chatSessions: ChatSession[]
  chatMessages: ChatMessage[]
  compareRuns: CompareRun[]
  knowledgeBases?: KnowledgeBase[]
  knowledgeItems?: KnowledgeItem[]
  knowledgeChunks?: KnowledgeChunk[]
  chatKnowledgeSelections?: ChatKnowledgeSelection[]
  webSearchSettings?: WebSearchSettings
  quickPhraseGroups?: QuickPhraseGroup[]
  quickPhrases?: QuickPhrase[]
}

export interface ChatTopicExportPayload {
  kind: 'prompt-canvas-chat-topic'
  version: 1
  exportedAt: string
  sourceCanvas?: Canvas
  chatSession: ChatSession
  childChatSessions?: ChatSession[]
  chatMessages: ChatMessage[]
  promptCards: PromptCard[]
  inputCards?: InputCard[]
  canvasShapeNodes?: CanvasShapeNode[]
  canvasEdges?: CanvasEdge[]
  canvasStrokes?: CanvasStroke[]
  canvasTextNodes?: CanvasTextNode[]
  canvasImageNodes?: CanvasImageNode[]
  promptVersions: PromptVersion[]
  compareRuns: CompareRun[]
}
