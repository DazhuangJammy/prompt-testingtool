import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import {
  assignChatSessionPromptCard,
  clearChatSession,
  editChatMessage,
  ensureChatSession,
} from '@/features/chat/application/chatService'
import { chatRepository } from '@/features/chat/infrastructure/chatRepository'
import { useChatMessageActions } from '@/features/chat/hooks/useChatMessageActions'
import { useScopedComparePanes } from '@/features/chat/hooks/useScopedComparePanes'
import { useChatTopics } from '@/features/chat/hooks/useChatTopics'
import type { InputSegment } from '@/features/input-card/model/inputCard'
import {
  getAttachmentCapability,
  getUnsupportedAttachmentReason,
} from '@/features/chat/model/attachments'
import {
  getThinkingCapability,
  normalizeThinkingMode,
} from '@/shared/model/thinking'
import {
  MAX_COMPARE_PANES,
  canRemoveComparePane,
  createComparePane,
  getPaneThinkingMode,
  getProviderThinkingMode,
  pickCardForPane,
  removeComparePaneById,
  resolvePaneCard,
  type ComparePaneId,
  type ComparePaneState,
  type ComparePaneView,
} from '@/features/chat/model/comparePanes'
import type {
  ChatAttachment,
  ChatMessage,
  ChatSession,
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
  comparePaneCardIds: string[] = [],
  persistedComparePanes: ComparePaneState[] = [],
  activeSessionId?: string,
  onActiveSessionChange?: (id?: string) => void,
  onCompareOpenChange?: (open: boolean) => void,
  onComparePaneCardIdsChange?: (cardIds: string[]) => void,
  onComparePanesChange?: (
    panes: ComparePaneState[] | ((current: ComparePaneState[]) => ComparePaneState[]),
  ) => void,
  onActiveCardChange?: (id: string) => void,
) {
  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState<ChatAttachment[]>([])
  const [error, setError] = useState('')
  const chatActions = useChatMessageActions(setError)
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
  const messagesRef = useRef(messages)
  const childSessions = useChildSessions(effectiveSessionId)
  const { comparePanes, setComparePanes } = useScopedComparePanes({
    activeCard: card,
    activeSessionId: effectiveSessionId,
    childSessions,
    compareOpen,
    comparePaneCardIds,
    persistedComparePanes,
    promptCards,
    onComparePaneCardIdsChange,
    onComparePanesChange,
  })

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

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

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
      index,
      input: pane.input,
      messages: paneMessagesById[pane.id] ?? [],
      parentSessionId: pane.parentSessionId,
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
    await chatActions.sendMessageForPane({
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

  const runInputSegments = async (segments: InputSegment[], startSegmentId?: string) => {
    if (!card || !provider || chatActions.busy || !segments.length) return
    const startIndex = Math.max(
      0,
      segments.findIndex((segment) => segment.id === startSegmentId),
    )
    const runnableSegments = segments
      .slice(startIndex)
      .filter((segment) => segment.content.trim())
    if (!runnableSegments.length) {
      setError('没有可发送的输入正文')
      return
    }

    setInput('')
    setAttachments([])
    let currentSessionId = effectiveSessionId
    for (const segment of runnableSegments) {
      const result = await chatActions.sendMessageForPane({
        attachments: [],
        card,
        history: messagesRef.current,
        provider,
        promptInjectionMode,
        sessionId: currentSessionId,
        setSessionId: (nextSessionId) => {
          currentSessionId = nextSessionId
          setMainSessionId(nextSessionId)
        },
        text: segment.content,
        thinkingMode: effectiveThinkingMode,
        requestKey: 'main',
      })
      if (result.sessionId) {
        currentSessionId = result.sessionId
        setMainSessionId(result.sessionId)
        messagesRef.current = await chatRepository.listMessagesBySession(result.sessionId)
      }
      if (!result.completed) break
    }
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

    const parentSessionId = await ensureMainSessionForCompare()
    if (!parentSessionId) return
    const paneBelongsToCurrentTopic = pane.parentSessionId === parentSessionId
    const sessionId = paneBelongsToCurrentTopic ? pane.sessionId : undefined
    const history = paneBelongsToCurrentTopic ? pane.messages : []

    updateComparePane(paneId, { attachments: [], input: '', parentSessionId })
    await chatActions.sendMessageForPane({
      attachments: nextAttachments,
      card: pane.card,
      comparePaneIndex: pane.index,
      history,
      parentSessionId,
      provider: pane.provider,
      promptInjectionMode: pane.promptInjectionMode,
      sessionId,
      setSessionId: (next) => updateComparePane(paneId, { sessionId: next }),
      text,
      thinkingMode: pane.thinkingMode,
      requestKey: paneId,
    })
  }

  const resendMainMessage = async (message: ChatMessage, content: string) => {
    if (!card || !provider) return
    await chatActions.resendMessageForPane({
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
    const parentSessionId = await ensureMainSessionForCompare()
    if (!parentSessionId) return
    const paneBelongsToCurrentTopic = pane.parentSessionId === parentSessionId
    const sessionId = paneBelongsToCurrentTopic ? pane.sessionId : undefined
    const history = paneBelongsToCurrentTopic ? pane.messages : []

    updateComparePane(paneId, { parentSessionId })

    await chatActions.resendMessageForPane({
      card: pane.card,
      comparePaneIndex: pane.index,
      history,
      message,
      parentSessionId,
      provider: pane.provider,
      promptInjectionMode: pane.promptInjectionMode,
      sessionId,
      setSessionId: (next) => updateComparePane(paneId, { sessionId: next }),
      text: content,
      thinkingMode: pane.thinkingMode,
      requestKey: paneId,
    })
  }

  const clearMainMessages = async () => {
    await clearChatSession(effectiveSessionId)
  }

  const clearCompareMessages = async (paneId: ComparePaneId) => {
    const pane = comparePanes.find((item) => item.id === paneId)
    if (!pane || pane.parentSessionId !== effectiveSessionId) return
    await clearChatSession(pane.sessionId)
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
    const pane = comparePanes.find((item) => item.id === paneId)
    updateComparePane(paneId, { cardId })
    if (pane?.sessionId && pane.parentSessionId === effectiveSessionId) {
      void assignChatSessionPromptCard(pane.sessionId, cardId)
    }
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

  const ensureMainSessionForCompare = async () => {
    if (effectiveSessionId) return effectiveSessionId
    if (!card?.canvasId) return undefined

    const nextSessionId = await ensureChatSession(card.canvasId, undefined, card.id)
    setMainSessionId(nextSessionId)
    return nextSessionId
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

    chatActions.stopGeneration(paneId)
    setComparePanes(result.panes)

    if (result.shouldExitCompare) {
      onCompareOpenChange?.(false)
      const remaining = result.panes[0]
      const remainingCardId =
        remaining?.cardId ?? paneViews.find((pane) => pane.id === remaining?.id)?.card?.id
      if (remainingCardId) onActiveCardChange?.(remainingCardId)
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
    activeRequest: chatActions.activeRequest,
    addComparePane,
    attachmentCapability,
    attachments,
    busy: chatActions.busy,
    canAddComparePane: comparePanes.length < MAX_COMPARE_PANES,
    canRemoveComparePane: canRemoveComparePane(comparePanes),
    clearCompareMessages,
    clearMainMessages,
    comparePaneStates: comparePanes,
    comparePanes: paneViews,
    createMainTopic,
    deleteMainTopic,
    editMessage,
    error,
    mainSessionId: effectiveSessionId,
    input,
    isRequestActive: chatActions.isRequestActive,
    mainMessages: messages,
    mainSessions: sessions ?? [],
    promptInjectionMode,
    removeComparePane,
    resendCompareMessage,
    resendMainMessage,
    runInputSegments,
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
    stopGeneration: chatActions.stopGeneration,
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

function useChildSessions(parentSessionId?: string) {
  return useLiveQuery<ChatSession[], ChatSession[]>(
    () => parentSessionId
      ? chatRepository.listChildSessions(parentSessionId)
      : Promise.resolve([] as ChatSession[]),
    [parentSessionId],
    [],
  )
}
