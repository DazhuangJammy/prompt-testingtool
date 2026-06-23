export type KnowledgeProviderType = 'local' | 'bailian'
export type KnowledgeSourceType = 'file' | 'note' | 'directory' | 'url' | 'website'
export type KnowledgeItemStatus =
  | 'idle'
  | 'processing'
  | 'reading'
  | 'embedding'
  | 'completed'
  | 'failed'
  | 'deleting'

export interface KnowledgeRagConfig {
  embeddingProviderId?: string
  embeddingModel?: string
  rerankProviderId?: string
  rerankModel?: string
  chunkSize: number
  chunkOverlap: number
  topK: number
  threshold: number
  rerankEnabled: boolean
}

export interface KnowledgeBase {
  id: string
  name: string
  providerType: KnowledgeProviderType
  externalBaseId?: string
  config: KnowledgeRagConfig
  createdAt: string
  updatedAt: string
}

export interface KnowledgeItem {
  id: string
  baseId: string
  sourceType: KnowledgeSourceType
  title: string
  status: KnowledgeItemStatus
  mimeType?: string
  size?: number
  sourceUri?: string
  text?: string
  error?: string
  externalDocumentId?: string
  metadata?: Record<string, string | number | boolean | null>
  createdAt: string
  updatedAt: string
}

export interface KnowledgeChunk {
  id: string
  baseId: string
  itemId: string
  index: number
  content: string
  embedding?: number[]
  tokenEstimate: number
  metadata?: Record<string, string | number | boolean | null>
  createdAt: string
}

export interface KnowledgeSearchResult {
  chunkId: string
  baseId: string
  itemId: string
  itemTitle: string
  content: string
  score: number
  rerankScore?: number
  chunkIndex: number
}

export interface ChatKnowledgeReference {
  baseId: string
  baseName: string
  itemId: string
  itemTitle: string
  chunkId: string
  chunkIndex: number
  content: string
  score: number
}

export interface ChatKnowledgeSelection {
  id: string
  sessionId: string
  baseIds: string[]
  updatedAt: string
}
