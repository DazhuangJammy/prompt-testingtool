import { useState } from 'react'
import { resolveChatKnowledgeContext } from '@/features/chat/application/chatKnowledgeContext'
import type {
  ChatMessage,
  KnowledgeBase,
  ProviderConfig,
} from '@/shared/types'

interface UseChatContextResolutionOptions {
  getKnowledgeProviders?: () => Promise<ProviderConfig[]>
  knowledgeBases: KnowledgeBase[]
  selectedKnowledgeBaseIds: string[]
  setError: (error: string) => void
}

export function useChatContextResolution({
  getKnowledgeProviders,
  knowledgeBases,
  selectedKnowledgeBaseIds,
  setError,
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

  const prepareContextsOrThrow = async (
    query: string,
    fallbackKnowledgeReferences: ChatMessage['knowledgeReferences'] = [],
    fallbackWebSearchReferences: ChatMessage['webSearchReferences'] = [],
  ) => {
    setPreflightBusy(true)
    setError('')
    try {
      const knowledge = await resolveSelectedKnowledge(
        query,
        fallbackKnowledgeReferences,
      )
      const webSearch = { context: '', references: fallbackWebSearchReferences ?? [] }
      return { knowledge, webSearch }
    } catch (event) {
      if (event instanceof Error) {
        setError(event.message)
        throw event
      }
      setError('准备上下文失败')
      throw new Error('准备上下文失败', { cause: event })
    } finally {
      setPreflightBusy(false)
    }
  }

  const prepareContexts = async (
    query: string,
    fallbackKnowledgeReferences: ChatMessage['knowledgeReferences'] = [],
    fallbackWebSearchReferences: ChatMessage['webSearchReferences'] = [],
  ) => {
    try {
      return await prepareContextsOrThrow(
        query,
        fallbackKnowledgeReferences,
        fallbackWebSearchReferences,
      )
    } catch {
      return undefined
    }
  }

  return { preflightBusy, prepareContexts, prepareContextsOrThrow }
}
