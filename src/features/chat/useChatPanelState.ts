import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import {
  clearChatSession,
  editChatMessage,
  ensureChatSession,
  resendChatMessage,
  sendChatMessage,
} from '@/features/chat/application/chatService'
import { chatRepository } from '@/features/chat/infrastructure/chatRepository'
import { useActiveChatRequests } from '@/features/chat/hooks/useActiveChatRequests'
import { useChatTopics } from '@/features/chat/hooks/useChatTopics'
import {
  getAttachmentCapability,
  getUnsupportedAttachmentReason,
} from '@/features/chat/model/attachments'
import {
  getThinkingCapability,
  normalizeThinkingMode,
} from '@/features/chat/model/thinking'
import {
  MAX_COMPARE_PANES,
  canRemoveComparePane,
  createComparePane,
  createInitialComparePanes,
  getPaneThinkingMode,
  getProviderThinkingMode,
  pickCardForPane,
  removeComparePaneById,
  resolvePaneCard,
  syncComparePanes,
  type ActiveRequest,
  type ComparePaneId,
  type ComparePaneState,
  type ComparePaneView,
} from '@/features/chat/model/comparePanes'
import type {
  ChatAttachment,
  ChatMessage,
  PromptCard,
  PromptInjectionMode,
  ProviderConfig,
  ThinkingMode,
} from '@/shared/types'
export type { ComparePaneView } from '@/features/chat/model/comparePanes'

export function useChatPanelState(
  card: PromptCard | undefined,
  provider: ProviderConfig | undefined,
  promptCards: PromptCard[],
  providers: ProviderConfig[],
  compareOpen = false,
  activeSessionId?: string,
  onActiveSessionChange?: (id?: string) => void,
  onCompareOpenChange?: (open: boolean) => void,
  onActiveCardChange?: (id: string) => void,
) {
  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState<ChatAttachment[]>([])
  const [comparePanes, setComparePanes] = useState<ComparePaneState[]>(() =>
    createInitialComparePanes(),
  )
  const [error, setError] = useState('')
  const chatRequests = useActiveChatRequests()
  const [thinkingModesByProvider, setThinkingModesByProvider] = useState<
    Record<string, ThinkingMode>
  >({})
  const [promptInjectionMode, setPromptInjectionMode] = useState<PromptInjectionMode>('system')

  const {
    createMainTopic,
    deleteMainTopic,
    effectiveSessionId,
    renameMainTopic,
    sessions,
    setMainSessionId,
  } = useChatTopics(
    card?.canvasId,
    activeSessionId,
    onActiveSessionChange,
    card?.id,
  )
  const messages = useMessages(effectiveSessionId)

  const paneSessionKey = comparePanes
    .map((pane) => `${pane.id}:${pane.sessionId ?? ''}`)
    .join('|')
  const paneMessagesById = useLiveQuery<
    Record<ComparePaneId, ChatMessage[]>,
    Record<ComparePaneId, ChatMessage[]>
  >(
    async () => {
      const entries = await Promise.all(
        comparePanes.map(async (pane) => [
          pane.id,
          pane.sessionId
            ? await chatRepository.listMessagesBySession(pane.sessionId)
            : [],
        ]),
      )
      return Object.fromEntries(entries)
    },
    [paneSessionKey],
    {},
  )

  const thinkingCapability = getThinkingCapability(provider)
  const attachmentCapability = getAttachmentCapability(provider)
  const effectiveThinkingMode = getProviderThinkingMode(
    provider,
    thinkingCapability.defaultMode,
    thinkingModesByProvider,
  )
  const paneViews = comparePanes.map<ComparePaneView>((pane, index) => {
    const paneCard = resolvePaneCard(pane, index, card, promptCards, comparePanes)
    const paneProvider =
      providers.find((item) => item.id === pane.providerId) ?? provider
    const paneThinkingCapability = getThinkingCapability(paneProvider)

    return {
      id: pane.id,
      attachments: pane.attachments,
      card: paneCard,
      input: pane.input,
      messages: paneMessagesById[pane.id] ?? [],
      promptInjectionMode: pane.promptInjectionMode,
      provider: paneProvider,
      sessionId: pane.sessionId,
      attachmentCapability: getAttachmentCapability(paneProvider),
      thinkingCapability: paneThinkingCapability,
      thinkingMode: getPaneThinkingMode(
        paneProvider,
        pane.thinkingMode ?? paneThinkingCapability.defaultMode,
      ),
    }
  })

  useEffect(() => {
    if (!card && !promptCards.length) return
    const syncId = window.setTimeout(() => {
      setComparePanes((current) =>
        syncComparePanes(current, card, promptCards, compareOpen),
      )
    }, 0)

    return () => window.clearTimeout(syncId)
  }, [card, compareOpen, promptCards])

  const sendMainMessage = async () => {
    const text = input.trim()
    const nextAttachments = attachments
    if (!card || !provider || (!text && !nextAttachments.length)) return
    const unsupportedReason = getUnsupportedAttachmentReason(
      nextAttachments,
      attachmentCapability,
    )
    if (unsupportedReason) {
      setError(unsupportedReason)
      return
    }
    setInput('')
    setAttachments([])
    await sendMessageForPane({
      attachments: nextAttachments,
      card,
      history: messages,
      provider,
      promptInjectionMode,
      sessionId: effectiveSessionId,
      setSessionId: setMainSessionId,
      text,
      thinkingMode: effectiveThinkingMode,
      requestKey: 'main',
    })
  }

  const sendCompareMessage = async (paneId: ComparePaneId) => {
    const pane = paneViews.find((item) => item.id === paneId)
    const text = pane?.input.trim() ?? ''
    const nextAttachments = pane?.attachments ?? []
    if (!pane?.card || !pane.provider || (!text && !nextAttachments.length)) return
    const unsupportedReason = getUnsupportedAttachmentReason(
      nextAttachments,
      pane.attachmentCapability,
    )
    if (unsupportedReason) {
      setError(unsupportedReason)
      return
    }

    updateComparePane(paneId, { attachments: [], input: '' })
    await sendMessageForPane({
      attachments: nextAttachments,
      card: pane.card,
      history: pane.messages,
      provider: pane.provider,
      promptInjectionMode: pane.promptInjectionMode,
      sessionId: pane.sessionId,
      setSessionId: (next) => updateComparePane(paneId, { sessionId: next }),
      text,
      thinkingMode: pane.thinkingMode,
      requestKey: paneId,
    })
  }

  const resendMainMessage = async (message: ChatMessage, content: string) => {
    if (!card || !provider) return
    await resendMessageForPane({
      card,
      history: messages,
      message,
      provider,
      promptInjectionMode,
      sessionId: effectiveSessionId,
      setSessionId: setMainSessionId,
      text: content,
      thinkingMode: effectiveThinkingMode,
      requestKey: 'main',
    })
  }

  const resendCompareMessage = async (
    paneId: ComparePaneId,
    message: ChatMessage,
    content: string,
  ) => {
    const pane = paneViews.find((item) => item.id === paneId)
    if (!pane?.card || !pane.provider) return

    await resendMessageForPane({
      card: pane.card,
      history: pane.messages,
      message,
      provider: pane.provider,
      promptInjectionMode: pane.promptInjectionMode,
      sessionId: pane.sessionId,
      setSessionId: (next) => updateComparePane(paneId, { sessionId: next }),
      text: content,
      thinkingMode: pane.thinkingMode,
      requestKey: paneId,
    })
  }

  const sendMessageForPane = async ({
    card,
    attachments = [],
    history,
    provider,
    sessionId,
    setSessionId,
    text,
    thinkingMode,
    promptInjectionMode,
    requestKey,
  }: {
    attachments?: ChatAttachment[]
    card: PromptCard
    history: ChatMessage[]
    provider: ProviderConfig
    promptInjectionMode: PromptInjectionMode
    sessionId?: string
    setSessionId: (id: string) => void
    text: string
    thinkingMode: ThinkingMode
    requestKey: ActiveRequest
  }) => {
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
    history,
    message,
    provider,
    sessionId,
    setSessionId,
    text,
    thinkingMode,
    promptInjectionMode,
    requestKey,
  }: {
    card: PromptCard
    history: ChatMessage[]
    message: ChatMessage
    provider: ProviderConfig
    promptInjectionMode: PromptInjectionMode
    sessionId?: string
    setSessionId: (id: string) => void
    text: string
    thinkingMode: ThinkingMode
    requestKey: ActiveRequest
  }) => {
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

  const clearMainMessages = async () => {
    await clearChatSession(effectiveSessionId)
  }

  const clearCompareMessages = async (paneId: ComparePaneId) => {
    const pane = comparePanes.find((item) => item.id === paneId)
    await clearChatSession(pane?.sessionId)
  }

  const editMessage = async (message: ChatMessage, content: string) => {
    await editChatMessage(message.id, content)
  }

  const updateComparePane = (
    paneId: ComparePaneId,
    updates: Partial<ComparePaneState>,
  ) => {
    setComparePanes((current) =>
      current.map((pane) =>
        pane.id === paneId
          ? {
              ...pane,
              ...updates,
            }
          : pane,
      ),
    )
  }

  const setComparePaneCard = (paneId: ComparePaneId, cardId: string) => {
    updateComparePane(paneId, {
      cardId,
      sessionId: undefined,
    })
  }

  const setComparePaneProvider = (paneId: ComparePaneId, providerId: string) => {
    updateComparePane(paneId, { attachments: [], providerId })
  }

  const setComparePaneThinkingMode = (
    paneId: ComparePaneId,
    mode: ThinkingMode,
  ) => {
    const pane = paneViews.find((item) => item.id === paneId)
    updateComparePane(paneId, {
      thinkingMode: normalizeThinkingMode(pane?.provider, mode),
    })
  }

  const setComparePanePromptInjectionMode = (
    paneId: ComparePaneId,
    mode: PromptInjectionMode,
  ) => {
    updateComparePane(paneId, { promptInjectionMode: mode })
  }

  const addComparePane = () => {
    setComparePanes((current) => {
      if (current.length >= MAX_COMPARE_PANES) return current
      const activeCardId = card?.id ?? promptCards[0]?.id
      return [
        ...current,
        createComparePane({
          cardId: pickCardForPane(current.length, current, promptCards, activeCardId),
          providerId: provider?.id,
        }),
      ]
    })
  }

  const removeComparePane = (paneId: ComparePaneId) => {
    const result = removeComparePaneById(comparePanes, paneId)
    if (!result.removed) return

    chatRequests.stopGeneration(paneId)
    setComparePanes(result.panes)

    if (result.shouldExitCompare) {
      onCompareOpenChange?.(false)
      const remaining = result.panes[0]
      const remainingCardId =
        remaining?.cardId ?? paneViews.find((pane) => pane.id === remaining?.id)?.card?.id
      if (remainingCardId) onActiveCardChange?.(remainingCardId)
      if (remaining?.sessionId) setMainSessionId(remaining.sessionId)
    }
  }

  const setThinkingModeForProvider = (
    targetProvider: ProviderConfig | undefined,
    mode: ThinkingMode,
  ) => {
    if (!targetProvider) return
    setThinkingModesByProvider((current) => ({
      ...current,
      [targetProvider.id]: normalizeThinkingMode(targetProvider, mode),
    }))
  }

  return {
    activeRequest: chatRequests.activeRequest,
    addComparePane,
    attachmentCapability,
    attachments,
    busy: chatRequests.busy,
    canAddComparePane: comparePanes.length < MAX_COMPARE_PANES,
    canRemoveComparePane: canRemoveComparePane(comparePanes),
    clearCompareMessages,
    clearMainMessages,
    comparePanes: paneViews,
    createMainTopic,
    deleteMainTopic,
    editMessage,
    error,
    mainSessionId: effectiveSessionId,
    input,
    isRequestActive: chatRequests.isRequestActive,
    mainMessages: messages,
    mainSessions: sessions ?? [],
    promptInjectionMode,
    removeComparePane,
    resendCompareMessage,
    resendMainMessage,
    renameMainTopic,
    sendCompareMessage,
    sendMainMessage,
    setMainSessionId,
    setComparePaneCard,
    setComparePaneAttachments: (paneId: ComparePaneId, value: ChatAttachment[]) =>
      updateComparePane(paneId, { attachments: value }),
    setComparePaneInput: (paneId: ComparePaneId, value: string) =>
      updateComparePane(paneId, { input: value }),
    setComparePanePromptInjectionMode,
    setComparePaneProvider,
    setComparePaneThinkingMode,
    setInput,
    setAttachments,
    setPromptInjectionMode,
    setThinkingModeForProvider,
    stopGeneration: chatRequests.stopGeneration,
    supportsDeepThinking: thinkingCapability.supportsDeepMode,
    supportsThinking: thinkingCapability.supportsThinking,
    thinkingMode: effectiveThinkingMode,
  }
}

function useMessages(sessionId?: string) {
  return useLiveQuery<ChatMessage[], ChatMessage[]>(
    () => sessionId
      ? chatRepository.listMessagesBySession(sessionId)
      : Promise.resolve([] as ChatMessage[]),
    [sessionId],
    [],
  )
}
