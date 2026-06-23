import { useState } from 'react'
import { resolveChatKnowledgeContext } from '@/features/chat/application/chatKnowledgeContext'
import { resolveChatWebSearchContext } from '@/features/web-search/application/webSearchService'
import type {
  ChatMessage,
  KnowledgeBase,
  ProviderConfig,
  WebSearchProviderId,
  WebSearchSettings,
} from '@/shared/types'

interface UseChatContextResolutionOptions {
  getKnowledgeProviders?: () => Promise<ProviderConfig[]>
  knowledgeBases: KnowledgeBase[]
  selectedKnowledgeBaseIds: string[]
  setError: (error: string) => void
  webSearchEnabled: boolean
  webSearchProviderId?: WebSearchProviderId
  webSearchSettings?: WebSearchSettings
}

export function useChatContextResolution({
  getKnowledgeProviders,
  knowledgeBases,
  selectedKnowledgeBaseIds,
  setError,
  webSearchEnabled,
  webSearchProviderId,
  webSearchSettings,
}: UseChatContextResolutionOptions) {
  const [preflightBusy, setPreflightBusy] = useState(false)

  const resolveSelectedKnowledge = async (
    query: string,
    fallbackReferences: ChatMessage['knowledgeReferences'] = [],
  ) => {
    if (!selectedKnowledgeBaseIds.length) {
      return { context: '', references: fallbackReferences ?? [] }
    }
    return resolveChatKnowledgeContext({
      baseIds: selectedKnowledgeBaseIds,
      bases: knowledgeBases,
      getProviders: getKnowledgeProviders,
      query,
    })
  }

  const resolveSelectedWebSearch = async (
    query: string,
    fallbackReferences: ChatMessage['webSearchReferences'] = [],
  ) => {
    if (!webSearchEnabled) {
      return { context: '', references: fallbackReferences ?? [] }
    }
    return resolveChatWebSearchContext({
      providerId: webSearchProviderId,
      query,
      settings: webSearchSettings,
    })
  }

  const prepareContexts = async (
    query: string,
    fallbackKnowledgeReferences: ChatMessage['knowledgeReferences'] = [],
    fallbackWebSearchReferences: ChatMessage['webSearchReferences'] = [],
  ) => {
    setPreflightBusy(true)
    setError('')
    try {
      const [knowledge, webSearch] = await Promise.all([
        resolveSelectedKnowledge(query, fallbackKnowledgeReferences),
        resolveSelectedWebSearch(query, fallbackWebSearchReferences),
      ])
      return { knowledge, webSearch }
    } catch (event) {
      setError(event instanceof Error ? event.message : '准备上下文失败')
      return undefined
    } finally {
      setPreflightBusy(false)
    }
  }

  return { preflightBusy, prepareContexts }
}
