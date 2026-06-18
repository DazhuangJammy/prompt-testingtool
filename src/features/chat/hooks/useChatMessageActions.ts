import {
  ensureChatSession,
  resendChatMessage,
  sendChatMessage,
} from '@/features/chat/application/chatService'
import { useActiveChatRequests } from '@/features/chat/hooks/useActiveChatRequests'
import type {
  ChatAttachment,
  ChatMessage,
  PromptCard,
  PromptInjectionMode,
  ProviderConfig,
  ThinkingMode,
} from '@/shared/types'
import type { ActiveRequest } from '../model/comparePanes'

interface MessageActionBase {
  card: PromptCard
  defaultAssistantPrompt?: string
  history: ChatMessage[]
  provider: ProviderConfig
  promptInjectionMode: PromptInjectionMode
  sessionId?: string
  setSessionId: (id: string) => void
  text: string
  thinkingMode: ThinkingMode
  requestKey: ActiveRequest
}

interface SendMessageAction extends MessageActionBase {
  attachments?: ChatAttachment[]
}

interface ResendMessageAction extends MessageActionBase {
  message: ChatMessage
}

export function useChatMessageActions(setError: (error: string) => void) {
  const chatRequests = useActiveChatRequests()

  const sendMessageForPane = async ({
    card,
    attachments = [],
    defaultAssistantPrompt,
    history,
    provider,
    promptInjectionMode,
    sessionId,
    setSessionId,
    text,
    thinkingMode,
    requestKey,
  }: SendMessageAction) => {
    const controller = chatRequests.startRequest(requestKey)
    setError('')

    try {
      const activeSessionId = await ensureChatSession(
        card.canvasId,
        sessionId,
        card.id,
      )
      if (!sessionId) setSessionId(activeSessionId)
      await sendChatMessage({
        card,
        attachments,
        defaultAssistantPrompt,
        history,
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

  const resendMessageForPane = async ({
    card,
    defaultAssistantPrompt,
    history,
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
      )
      if (!sessionId) setSessionId(activeSessionId)
      await resendChatMessage({
        card,
        defaultAssistantPrompt,
        history,
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
