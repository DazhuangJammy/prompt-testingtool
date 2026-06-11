export type PromptSectionKey = string

export type ThemeMode = 'light' | 'dark'

export interface Canvas {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export interface PromptCard {
  id: string
  canvasId: string
  title: string
  position: { x: number; y: number }
  markdown?: string
  sections: Record<PromptSectionKey, PromptSection>
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
  kind: CanvasShapeKind
  title: string
  body: string
  position: CanvasPoint
  width: number
  height: number
  createdAt: string
  updatedAt: string
}

export interface CanvasEdge {
  id: string
  canvasId: string
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
  points: CanvasPoint[]
  color: string
  strokeWidth: number
  createdAt: string
  updatedAt: string
}

export interface CanvasTextNode {
  id: string
  canvasId: string
  text: string
  position: CanvasPoint
  width: number
  color: string
  fontSize: number
  backgroundColor: string
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

export interface ProviderConfig {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  model: string
  createdAt: string
  updatedAt: string
}

export interface ChatSession {
  id: string
  canvasId?: string
  promptCardId?: string
  title: string
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
  version: 1 | 2 | 3 | 4
  exportedAt: string
  canvases: Canvas[]
  promptCards: PromptCard[]
  canvasShapeNodes?: CanvasShapeNode[]
  canvasEdges?: CanvasEdge[]
  canvasStrokes?: CanvasStroke[]
  canvasTextNodes?: CanvasTextNode[]
  promptVersions: PromptVersion[]
  providerConfigs: ProviderConfig[]
  chatSessions: ChatSession[]
  chatMessages: ChatMessage[]
  compareRuns: CompareRun[]
}
