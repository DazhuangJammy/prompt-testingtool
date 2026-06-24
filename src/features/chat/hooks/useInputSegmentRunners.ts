import type { RefObject } from 'react'
import type { PreparedInputSegmentContexts } from '@/features/chat/application/inputSegmentRunService'
import {
  resolveRunnableInputSegments,
  runInputSegmentSequence,
} from '@/features/chat/application/inputSegmentRunService'
import { chatRepository } from '@/features/chat/infrastructure/chatRepository'
import type { InputSegment } from '@/features/input-card/model/inputCard'
import type { useChatMessageActions } from './useChatMessageActions'
import type { useComparePaneActions } from './useComparePaneActions'
import type { ComparePaneId, ComparePaneView } from '../model/comparePanes'
import type {
  ChatAttachment,
  ChatMessage,
  PromptCard,
  PromptInjectionMode,
  ProviderConfig,
  ThinkingMode,
} from '@/shared/types'

interface UseInputSegmentRunnersOptions {
  card?: PromptCard
  chatActions: ReturnType<typeof useChatMessageActions>
  comparePaneActions: ReturnType<typeof useComparePaneActions>
  effectiveSessionId?: string
  effectiveThinkingMode: ThinkingMode
  messagesRef: RefObject<ChatMessage[]>
  paneViews: ComparePaneView[]
  prepareContexts: (
    text: string,
  ) => Promise<PreparedInputSegmentContexts | undefined>
  promptInjectionMode: PromptInjectionMode
  provider?: ProviderConfig
  setAttachments: (attachments: ChatAttachment[]) => void
  setError: (error: string) => void
  setInput: (input: string) => void
  setMainSessionId: (sessionId: string) => void
  ensureMainSessionForCompare: () => Promise<string | undefined>
}

export function useInputSegmentRunners({
  card,
  chatActions,
  comparePaneActions,
  effectiveSessionId,
  effectiveThinkingMode,
  ensureMainSessionForCompare,
  messagesRef,
  paneViews,
  prepareContexts,
  promptInjectionMode,
  provider,
  setAttachments,
  setError,
  setInput,
  setMainSessionId,
}: UseInputSegmentRunnersOptions) {
  const runInputSegments = async (
    segments: InputSegment[],
    startSegmentId?: string,
  ) => {
    if (!card || !provider || chatActions.busy || !segments.length) return
    const runnableSegments = resolveRunnableInputSegments(segments, startSegmentId)
    if (!runnableSegments.length) {
      setError('没有可发送的输入正文')
      return
    }

    setInput('')
    setAttachments([])
    let currentSessionId = effectiveSessionId
    await runInputSegmentSequence({
      segments: runnableSegments,
      prepareContexts,
      sendSegment: (segment, prepared) =>
        chatActions.sendMessageForPane({
          attachments: [],
          card,
          history: messagesRef.current,
          knowledgeContext: prepared.knowledge.context,
          knowledgeReferences: prepared.knowledge.references,
          promptInjectionMode,
          provider,
          requestKey: 'main',
          sessionId: currentSessionId,
          setSessionId: (nextSessionId) => {
            currentSessionId = nextSessionId
            setMainSessionId(nextSessionId)
          },
          text: segment.content,
          thinkingMode: effectiveThinkingMode,
          webSearchContext: prepared.webSearch.context,
          webSearchReferences: prepared.webSearch.references,
        }),
      onSessionChange: async (sessionId) => {
        currentSessionId = sessionId
        setMainSessionId(sessionId)
        messagesRef.current = await chatRepository.listMessagesBySession(sessionId)
      },
    })
  }

  const runCompareInputSegments = async (
    paneId: ComparePaneId,
    segments: InputSegment[],
    startSegmentId?: string,
  ) => {
    const pane = paneViews.find((item) => item.id === paneId)
    if (
      !pane?.card ||
      !pane.provider ||
      chatActions.isRequestActive(paneId) ||
      !segments.length
    ) {
      return
    }
    const paneCard = pane.card
    const paneProvider = pane.provider
    const paneThinkingMode = pane.thinkingMode
    const runnableSegments = resolveRunnableInputSegments(segments, startSegmentId)
    if (!runnableSegments.length) {
      setError('没有可发送的输入正文')
      return
    }

    const parentSessionId = await ensureMainSessionForCompare()
    if (!parentSessionId) return
    const paneBelongsToCurrentTopic = pane.parentSessionId === parentSessionId
    let currentSessionId = paneBelongsToCurrentTopic ? pane.sessionId : undefined
    let history = paneBelongsToCurrentTopic ? pane.messages : []

    comparePaneActions.updateComparePane(paneId, {
      attachments: [],
      input: '',
      parentSessionId,
    })

    await runInputSegmentSequence({
      segments: runnableSegments,
      prepareContexts,
      sendSegment: (segment, prepared) =>
        chatActions.sendMessageForPane({
          attachments: [],
          card: paneCard,
          comparePaneIndex: pane.index,
          history,
          knowledgeContext: prepared.knowledge.context,
          knowledgeReferences: prepared.knowledge.references,
          parentSessionId,
          provider: paneProvider,
          promptInjectionMode: pane.promptInjectionMode,
          requestKey: paneId,
          sessionId: currentSessionId,
          setSessionId: (next) => {
            currentSessionId = next
            comparePaneActions.updateComparePane(paneId, { sessionId: next })
          },
          text: segment.content,
          thinkingMode: paneThinkingMode,
          webSearchContext: prepared.webSearch.context,
          webSearchReferences: prepared.webSearch.references,
        }),
      onSessionChange: async (sessionId) => {
        currentSessionId = sessionId
        comparePaneActions.updateComparePane(paneId, { sessionId })
        history = await chatRepository.listMessagesBySession(sessionId)
      },
    })
  }

  return { runCompareInputSegments, runInputSegments }
}
