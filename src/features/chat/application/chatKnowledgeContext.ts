import {
  buildKnowledgeReferences,
  formatKnowledgeContext,
} from '@/features/knowledge/application/knowledgeService'
import type {
  ChatKnowledgeReference,
  KnowledgeBase,
  ProviderConfig,
} from '@/shared/types'

interface ChatKnowledgeContextInput {
  baseIds: string[]
  query: string
  bases: KnowledgeBase[]
  getProviders?: () => Promise<ProviderConfig[]>
}

export async function resolveChatKnowledgeContext({
  baseIds,
  bases,
  getProviders,
  query,
}: ChatKnowledgeContextInput): Promise<{
  context: string
  references: ChatKnowledgeReference[]
}> {
  if (!getProviders || !baseIds.length || !query.trim()) {
    return { context: '', references: [] }
  }

  const references = await buildKnowledgeReferences(baseIds, query, bases, getProviders)
  return {
    context: formatKnowledgeContext(references),
    references,
  }
}
