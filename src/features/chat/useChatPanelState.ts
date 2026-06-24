import { useEffect, useRef, useState } from 'react'
import {
  clearChatSession,
  editChatMessage,
  ensureChatSession,
} from '@/features/chat/application/chatService'
import { chatRepository } from '@/features/chat/infrastructure/chatRepository'
import { useComparePaneActions } from '@/features/chat/hooks/useComparePaneActions'
import { useChatMessageActions } from '@/features/chat/hooks/useChatMessageActions'
import { useScopedComparePanes } from '@/features/chat/hooks/useScopedComparePanes'
import { useChatTopics } from '@/features/chat/hooks/useChatTopics'
import { useProviderThinkingModes } from '@/features/chat/hooks/useProviderThinkingModes'
import {
  useChildSessions,
  useMessages,
  usePaneMessagesById,
} from '@/features/chat/hooks/useChatPanelMessages'
import { useChatContextResolution } from '@/features/chat/hooks/useChatContextResolution'
import type { InputSegment } from '@/features/input-card/model/inputCard'
import {
  getAttachmentCapability,
  getUnsupportedAttachmentReason,
} from '@/features/chat/model/attachments'
import {
  getThinkingCapability,
} from '@/shared/model/thinking'
import {
  getPaneThinkingMode,
  getProviderThinkingMode,
  resolvePaneCard,
  type ComparePaneId,
  type ComparePaneState,
  type ComparePaneView,
} from '@/features/chat/model/comparePanes'
import type {
  ChatAttachment,
  ChatMessage,
  KnowledgeBase,
  PromptCard,
  PromptInjectionMode,
  ProviderConfig,
  WebSearchProviderId,
  WebSearchSettings,
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
  knowledgeBases: KnowledgeBase[] = [],
  selectedKnowledgeBaseIds: string[] = [],
  getKnowledgeProviders?: () => Promise<ProviderConfig[]>,
  webSearchSettings?: WebSearchSettings,
) {
  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState<ChatAttachment[]>([])
  const [error, setError] = useState('')
  const [webSearchEnabled, setWebSearchEnabled] = useState(false)
  const [webSearchProviderId, setWebSearchProviderId] = useState<WebSearchProviderId>()
  const chatActions = useChatMessageActions(setError)
  const { setThinkingModeForProvider, thinkingModesByProvider } =
    useProviderThinkingModes()
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

  const paneMessagesById = usePaneMessagesById(comparePanes)

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
  const comparePaneActions = useComparePaneActions({
    activeCard: card,
    activeSessionId: effectiveSessionId,
    comparePanes,
    paneViews,
    promptCards,
    provider,
    setComparePanes,
    stopGeneration: chatActions.stopGeneration,
    onActiveCardChange,
    onCompareOpenChange,
  })

  const { preflightBusy, prepareContexts, prepareContextsOrThrow } =
    useChatContextResolution({
      getKnowledgeProviders,
      knowledgeBases,
      selectedKnowledgeBaseIds,
      setError,
    })
  const activeWebSearchTool = webSearchEnabled
    ? { providerId: webSearchProviderId, settings: webSearchSettings }
    : undefined

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
      resolveContexts: async () => {
        const prepared = await prepareContextsOrThrow(text)
        return {
          knowledgeContext: prepared.knowledge.context,
          knowledgeReferences: prepared.knowledge.references,
          webSearchContext: prepared.webSearch.context,
          webSearchReferences: prepared.webSearch.references,
        }
      },
      provider,
      promptInjectionMode,
      sessionId: effectiveSessionId,
      setSessionId: setMainSessionId,
      text,
      thinkingMode: effectiveThinkingMode,
      webSearchTool: activeWebSearchTool,
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
      const prepared = await prepareContexts(segment.content)
      if (!prepared) break
      const result = await chatActions.sendMessageForPane({
        attachments: [],
        card,
        history: messagesRef.current,
        provider,
        knowledgeContext: prepared.knowledge.context,
        knowledgeReferences: prepared.knowledge.references,
        webSearchContext: prepared.webSearch.context,
        webSearchReferences: prepared.webSearch.references,
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

    comparePaneActions.updateComparePane(paneId, {
      attachments: [],
      input: '',
      parentSessionId,
    })
    const prepared = await prepareContexts(text)
    if (!prepared) {
      comparePaneActions.updateComparePane(paneId, {
        attachments: nextAttachments,
        input: text,
        parentSessionId,
      })
      return
    }
    await chatActions.sendMessageForPane({
      attachments: nextAttachments,
      card: pane.card,
      comparePaneIndex: pane.index,
      history,
      knowledgeContext: prepared.knowledge.context,
      knowledgeReferences: prepared.knowledge.references,
      parentSessionId,
      provider: pane.provider,
      webSearchContext: prepared.webSearch.context,
      webSearchReferences: prepared.webSearch.references,
      promptInjectionMode: pane.promptInjectionMode,
      sessionId,
      setSessionId: (next) =>
        comparePaneActions.updateComparePane(paneId, { sessionId: next }),
      text,
      thinkingMode: pane.thinkingMode,
      requestKey: paneId,
    })
  }

  const resendMainMessage = async (message: ChatMessage, content: string) => {
    if (!card || !provider) return
    const prepared = await prepareContexts(
      content,
      message.knowledgeReferences,
      message.webSearchReferences,
    )
    if (!prepared) return
    await chatActions.resendMessageForPane({
      card,
      history: messages,
      knowledgeContext: prepared.knowledge.context,
      knowledgeReferences: prepared.knowledge.references,
      webSearchContext: prepared.webSearch.context,
      webSearchReferences: prepared.webSearch.references,
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
    comparePaneActions.updateComparePane(paneId, { parentSessionId })

    const prepared = await prepareContexts(
      content,
      message.knowledgeReferences,
      message.webSearchReferences,
    )
    if (!prepared) return
    await chatActions.resendMessageForPane({
      card: pane.card,
      comparePaneIndex: pane.index,
      history,
      knowledgeContext: prepared.knowledge.context,
      knowledgeReferences: prepared.knowledge.references,
      webSearchContext: prepared.webSearch.context,
      webSearchReferences: prepared.webSearch.references,
      message,
      parentSessionId,
      provider: pane.provider,
      promptInjectionMode: pane.promptInjectionMode,
      sessionId,
      setSessionId: (next) =>
        comparePaneActions.updateComparePane(paneId, { sessionId: next }),
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

  const ensureMainSessionForCompare = async () => {
    if (effectiveSessionId) return effectiveSessionId
    if (!card?.canvasId) return undefined

    const nextSessionId = await ensureChatSession(card.canvasId, undefined, card.id)
    setMainSessionId(nextSessionId)
    return nextSessionId
  }

  return {
    activeRequest: chatActions.activeRequest,
    addComparePane: comparePaneActions.addComparePane,
    attachmentCapability,
    attachments,
    busy: chatActions.busy || preflightBusy,
    canAddComparePane: comparePaneActions.canAddComparePane,
    canRemoveComparePane: comparePaneActions.canRemoveComparePane,
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
    removeComparePane: comparePaneActions.removeComparePane,
    resendCompareMessage,
    resendMainMessage,
    runInputSegments,
    renameMainTopic,
    sendCompareMessage,
    sendMainMessage,
    setMainSessionId,
    setComparePaneCard: comparePaneActions.setComparePaneCard,
    setComparePaneAttachments: comparePaneActions.setComparePaneAttachments,
    setComparePaneInput: comparePaneActions.setComparePaneInput,
    setComparePanePromptInjectionMode:
      comparePaneActions.setComparePanePromptInjectionMode,
    setComparePaneProvider: comparePaneActions.setComparePaneProvider,
    setComparePaneThinkingMode: comparePaneActions.setComparePaneThinkingMode,
    setInput,
    setAttachments,
    setPromptInjectionMode,
    setWebSearchEnabled,
    setWebSearchProviderId,
    setThinkingModeForProvider,
    stopGeneration: chatActions.stopGeneration,
    supportsDeepThinking: thinkingCapability.supportsDeepMode,
    supportsThinking: thinkingCapability.supportsThinking,
    thinkingMode: effectiveThinkingMode,
    webSearchEnabled,
    webSearchProviderId,
  }
}
