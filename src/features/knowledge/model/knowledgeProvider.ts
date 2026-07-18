import type {
  KnowledgeBase,
  KnowledgeProviderType,
  KnowledgeChunk,
  KnowledgeItem,
  KnowledgeRagConfig,
  KnowledgeSearchResult,
  KnowledgeSourceType,
} from '@/shared/types'

export interface KnowledgeAddItemInput {
  sourceType: KnowledgeSourceType
  title: string
  mimeType?: string
  size?: number
  sourceUri?: string
  text?: string
  file?: File
  files?: File[]
  metadata?: KnowledgeItem['metadata']
}

export interface KnowledgeSearchInput {
  baseIds: string[]
  query: string
  config?: Partial<Pick<KnowledgeRagConfig, 'topK' | 'threshold' | 'rerankEnabled'>>
}

export interface KnowledgeCreateBaseInput {
  name: string
  providerType?: KnowledgeProviderType
  externalBaseId?: string
  bailian?: KnowledgeBase['bailian']
  config?: Partial<KnowledgeRagConfig>
}

export interface KnowledgeProvider {
  createBase(input: KnowledgeCreateBaseInput): Promise<KnowledgeBase>
  updateBase(
    baseId: string,
    updates: Partial<Pick<KnowledgeBase, 'name' | 'config' | 'externalBaseId' | 'bailian'>>,
  ): Promise<KnowledgeBase>
  deleteBase(baseId: string): Promise<void>
  addItems(baseId: string, items: KnowledgeAddItemInput[]): Promise<KnowledgeItem[]>
  deleteItems(baseId: string, itemIds: string[]): Promise<void>
  reindexItems(baseId: string, itemIds?: string[]): Promise<void>
  search(input: KnowledgeSearchInput): Promise<KnowledgeSearchResult[]>
  listChunks(baseId: string, itemId: string): Promise<KnowledgeChunk[]>
  syncItems?(baseId: string): Promise<KnowledgeItem[]>
}
