import {
  ensureChatSession,
  resendChatMessage,
  type ResolvedChatContexts,
  sendChatMessage,
} from '@/features/chat/application/chatService'
import { useActiveChatRequests } from '@/features/chat/hooks/useActiveChatRequests'
import type {
  ChatAttachment,
  ChatKnowledgeReference,
  ChatMessage,
  CompletionWebSearchToolConfig,
  PromptCard,
  PromptInjectionMode,
  ProviderConfig,
  ThinkingMode,
  WebSearchReference,
} from '@/shared/types'
import type { ActiveRequest } from '../model/comparePanes'

interface MessageActionBase {
  card: PromptCard
  comparePaneIndex?: number
  defaultAssistantPrompt?: string
  history: ChatMessage[]
  knowledgeContext?: string
  knowledgeReferences?: ChatKnowledgeReference[]
  webSearchContext?: string
  webSearchReferences?: WebSearchReference[]
  parentSessionId?: string
  provider: ProviderConfig
  promptInjectionMode: PromptInjectionMode
  resolveContexts?: () => Promise<ResolvedChatContexts>
  sessionId?: string
  setSessionId: (id: string) => void
  text: string
  thinkingMode: ThinkingMode
  webSearchTool?: CompletionWebSearchToolConfig
  requestKey: ActiveRequest
}

interface SendMessageAction extends MessageActionBase {
  attachments?: ChatAttachment[]
}

interface ResendMessageAction extends MessageActionBase {
  message: ChatMessage
}

interface SendMessageResult {
  completed: boolean
  sessionId?: string
}

export function useChatMessageActions(setError: (error: string) => void) {
  const chatRequests = useActiveChatRequests()

  const sendMessageForPane = async ({
    card,
    comparePaneIndex,
    attachments = [],
    defaultAssistantPrompt,
    history,
    knowledgeContext,
    knowledgeReferences,
    webSearchContext,
    webSearchReferences,
    parentSessionId,
    provider,
    promptInjectionMode,
    resolveContexts,
    sessionId,
    setSessionId,
    text,
    thinkingMode,
    webSearchTool,
    requestKey,
  }: SendMessageAction): Promise<SendMessageResult> => {
    const controller = chatRequests.startRequest(requestKey)
    setError('')

    try {
      const activeSessionId = await ensureChatSession(
        card.canvasId,
        sessionId,
        card.id,
        {
          hidden: Boolean(parentSessionId),
          comparePaneIndex,
          parentSessionId,
        },
      )
      if (!sessionId) setSessionId(activeSessionId)
      await sendChatMessage({
        card,
        attachments,
        defaultAssistantPrompt,
        history,
        knowledgeContext,
        knowledgeReferences,
        webSearchContext,
        webSearchReferences,
        provider,
        promptInjectionMode,
        resolveContexts,
        sessionId: activeSessionId,
        signal: controller.signal,
        text,
        thinkingMode,
        webSearchTool,
      })
      return { completed: !controller.signal.aborted, sessionId: activeSessionId }
    } catch (event) {
      setError(event instanceof Error ? event.message : 'Request failed')
      return { completed: false }
    } finally {
      chatRequests.finishRequest(requestKey, controller)
    }
  }

  const resendMessageForPane = async ({
    card,
    comparePaneIndex,
    defaultAssistantPrompt,
    history,
    knowledgeContext,
    knowledgeReferences,
    webSearchContext,
    webSearchReferences,
    parentSessionId,
    message,
    provider,
    promptInjectionMode,
    sessionId,
    setSessionId,
    text,
    thinkingMode,
    requestKey,
  }: ResendMessageAction) => {
    const controller = chatRequests.startRequest(requestKey)
    setError('')

    try {
      const activeSessionId = await ensureChatSession(
        card.canvasId,
        sessionId,
        card.id,
        {
          hidden: Boolean(parentSessionId),
          comparePaneIndex,
          parentSessionId,
        },
      )
      if (!sessionId) setSessionId(activeSessionId)
      await resendChatMessage({
        card,
        defaultAssistantPrompt,
        history,
        knowledgeContext,
        knowledgeReferences,
        webSearchContext,
        webSearchReferences,
        message,
        provider,
        promptInjectionMode,
        sessionId: activeSessionId,
        signal: controller.signal,
        text,
        thinkingMode,
      })
    } catch (event) {
      setError(event instanceof Error ? event.message : 'Request failed')
    } finally {
      chatRequests.finishRequest(requestKey, controller)
    }
  }

  return {
    activeRequest: chatRequests.activeRequest,
    busy: chatRequests.busy,
    isRequestActive: chatRequests.isRequestActive,
    resendMessageForPane,
    sendMessageForPane,
    stopGeneration: chatRequests.stopGeneration,
  }
}
