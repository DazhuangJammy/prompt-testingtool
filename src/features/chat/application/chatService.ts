import { requestCompletion } from '@/shared/api/ai'
import type {
  ChatAttachment,
  ChatKnowledgeReference,
  ChatMessage,
  ChatSession,
  CompletionWebSearchToolConfig,
  PromptInjectionMode,
  PromptCard,
  ProviderConfig,
  ThinkingMode,
  WebSearchReference,
} from '@/shared/types'
import { createId } from '@/shared/utils/identity'
import { nowIso } from '@/shared/utils/time'
import {
  buildChatMessages,
  createCompareRun,
  createPromptVersion,
} from '@/features/chat/model/chatCompletion'
import {
  createTopicTitleMessages,
  normalizeGeneratedChatTopicTitle,
  shouldAutoNameChatTopic,
} from '@/features/chat/model/topicTitle'
import { createChatSession } from '@/features/chat/model/chatSession'
import { createReorderedChatSessionSortUpdates } from '@/features/chat/model/chatSessionOrdering'
import { chatRepository } from '@/features/chat/infrastructure/chatRepository'
import { streamAssistantMessage } from './chatAssistantStream'

export interface ResolvedChatContexts {
  knowledgeContext: string
  knowledgeReferences: ChatKnowledgeReference[]
  webSearchContext: string
  webSearchReferences: WebSearchReference[]
}

export async function ensureChatSession(
  canvasId: string,
  effectiveSessionId?: string,
  promptCardId?: string,
  options: {
    comparePaneIndex?: number
    hidden?: boolean
    parentSessionId?: string
  } = {},
) {
  if (effectiveSessionId) return effectiveSessionId
  const session = createChatSession(canvasId, '测试', promptCardId, options)
  await chatRepository.createSession(session)
  return session.id
}

export async function createChatTopic(
  canvasId: string,
  title?: string,
  promptCardId?: string,
) {
  const session = createChatSession(canvasId, title?.trim() || '新话题', promptCardId)
  await chatRepository.createSession(session)
  return session
}

export async function renameChatTopic(sessionId: string, title: string) {
  await chatRepository.updateSessionTitle(sessionId, title)
}

export async function reorderChatTopics(
  sessions: ChatSession[],
  draggedId: string,
  targetId: string,
) {
  const updates = createReorderedChatSessionSortUpdates(
    sessions,
    draggedId,
    targetId,
  )
  if (!updates.length) return
  await chatRepository.updateSessionSortOrders(updates)
}

export async function assignChatSessionPromptCard(
  sessionId: string,
  promptCardId: string,
) {
  await chatRepository.updateSessionPromptCard(sessionId, promptCardId)
}

export async function deleteChatTopicAndPickNext({
  activeSessionId,
  sessions,
  sessionId,
}: {
  activeSessionId?: string
  sessions: { id: string; updatedAt: string }[]
  sessionId: string
}) {
  await chatRepository.deleteSessionCascade(sessionId)
  if (activeSessionId !== sessionId) return activeSessionId
  return sessions.find((session) => session.id !== sessionId)?.id
}

export async function clearChatSession(sessionId?: string) {
  if (!sessionId) return
  await chatRepository.clearMessages(sessionId)
}

export async function editChatMessage(id: string, content: string) {
  await chatRepository.updateMessageContent(id, content)
}

export async function sendChatMessage({
  card,
  defaultAssistantPrompt,
  history,
  onAssistantMessage,
  provider,
  promptInjectionMode,
  sessionId,
  signal,
  attachments = [],
  knowledgeContext = '',
  knowledgeReferences = [],
  webSearchContext = '',
  webSearchReferences = [],
  webSearchTool,
  resolveContexts,
  text,
  thinkingMode,
}: {
  attachments?: ChatAttachment[]
  knowledgeContext?: string
  knowledgeReferences?: ChatKnowledgeReference[]
  webSearchContext?: string
  webSearchReferences?: WebSearchReference[]
  webSearchTool?: CompletionWebSearchToolConfig
  resolveContexts?: () => Promise<ResolvedChatContexts>
  card: PromptCard
  defaultAssistantPrompt?: string
  history: ChatMessage[]
  onAssistantMessage?: (message: ChatMessage) => void
  provider: ProviderConfig
  promptInjectionMode: PromptInjectionMode
  sessionId: string
  signal?: AbortSignal
  text: string
  thinkingMode: ThinkingMode
}) {
  const version = createPromptVersion(card, 'chat-send', defaultAssistantPrompt)
  await chatRepository.savePromptVersion(version)

  const userMessage: ChatMessage = {
    id: createId(),
    sessionId,
    role: 'user',
    content: text,
    attachments,
    knowledgeReferences,
    webSearchReferences,
    promptVersionId: version.id,
    createdAt: nowIso(),
  }
  await chatRepository.addMessage(userMessage)

  const contexts = await resolveMessageContexts({
    knowledgeContext,
    knowledgeReferences,
    webSearchContext,
    webSearchReferences,
    resolveContexts,
  })
  if (resolveContexts) {
    await chatRepository.updateMessageContextReferences(userMessage.id, {
      knowledgeReferences: contexts.knowledgeReferences,
      webSearchReferences: contexts.webSearchReferences,
    })
  }

  const assistantMessage: ChatMessage = {
    id: createId(),
    sessionId,
    role: 'assistant',
    content: '',
    knowledgeReferences: contexts.knowledgeReferences,
    webSearchReferences: contexts.webSearchReferences,
    promptVersionId: version.id,
    thinkingMode,
    status: 'streaming',
    createdAt: nowIso(),
  }
  await chatRepository.addMessage(assistantMessage)
  onAssistantMessage?.(assistantMessage)

  await streamAssistantMessage({
    assistantMessageId: assistantMessage.id,
    messages: buildChatMessages(
      version.compiledMarkdown,
      history,
      userMessage.content,
      promptInjectionMode,
      userMessage.attachments,
      contexts.knowledgeContext,
      contexts.webSearchContext,
    ),
    provider,
    signal,
    thinkingMode,
    webSearch: webSearchTool,
  })
  await chatRepository.updateSessionAfterReply(sessionId)
  await autoNameChatTopic(sessionId, userMessage.content, provider)
}

async function resolveMessageContexts({
  knowledgeContext,
  knowledgeReferences,
  webSearchContext,
  webSearchReferences,
  resolveContexts,
}: ResolvedChatContexts & {
  resolveContexts?: () => Promise<ResolvedChatContexts>
}) {
  if (resolveContexts) return resolveContexts()
  return {
    knowledgeContext,
    knowledgeReferences,
    webSearchContext,
    webSearchReferences,
  }
}

async function requestAssistantReply({
  attachments = [],
  knowledgeContext = '',
  knowledgeReferences = [],
  webSearchContext = '',
  webSearchReferences = [],
  card,
  defaultAssistantPrompt,
  history,
  provider,
  promptInjectionMode,
  sessionId,
  signal,
  text,
  thinkingMode,
}: {
  attachments?: ChatAttachment[]
  knowledgeContext?: string
  knowledgeReferences?: ChatKnowledgeReference[]
  webSearchContext?: string
  webSearchReferences?: WebSearchReference[]
  card: PromptCard
  defaultAssistantPrompt?: string
  history: ChatMessage[]
  provider: ProviderConfig
  promptInjectionMode: PromptInjectionMode
  sessionId: string
  signal?: AbortSignal
  text: string
  thinkingMode: ThinkingMode
}) {
  const version = createPromptVersion(card, 'chat-send', defaultAssistantPrompt)
  await chatRepository.savePromptVersion(version)

  const assistantMessage: ChatMessage = {
    id: createId(),
    sessionId,
    role: 'assistant',
    content: '',
    knowledgeReferences,
    webSearchReferences,
    promptVersionId: version.id,
    thinkingMode,
    status: 'streaming',
    createdAt: nowIso(),
  }
  await chatRepository.addMessage(assistantMessage)

  await streamAssistantMessage({
    assistantMessageId: assistantMessage.id,
    messages: buildChatMessages(
      version.compiledMarkdown,
      history,
      text,
      promptInjectionMode,
      attachments,
      knowledgeContext,
      webSearchContext,
    ),
    provider,
    signal,
    thinkingMode,
  })
  await chatRepository.updateSessionAfterReply(sessionId)
  await autoNameChatTopic(sessionId, text, provider)
}

async function autoNameChatTopic(
  sessionId: string,
  userText: string,
  provider: ProviderConfig,
) {
  if (!userText.trim()) return
  const session = await chatRepository.getSession(sessionId)
  if (!session || session.hidden || !shouldAutoNameChatTopic(session.title)) return

  try {
    const title = normalizeGeneratedChatTopicTitle(
      await requestCompletion(
        provider,
        createTopicTitleMessages(userText),
        'off',
      ),
    )
    if (title) await chatRepository.updateSessionTitle(sessionId, title)
  } catch {
    await chatRepository.updateSessionTitle(
      sessionId,
      normalizeGeneratedChatTopicTitle(userText) || '新话题',
    )
  }
}

export async function resendChatMessage({
  card,
  defaultAssistantPrompt,
  history,
  knowledgeContext = '',
  knowledgeReferences,
  webSearchContext = '',
  webSearchReferences,
  message,
  provider,
  promptInjectionMode,
  sessionId,
  signal,
  text,
  thinkingMode,
}: {
  card: PromptCard
  defaultAssistantPrompt?: string
  history: ChatMessage[]
  knowledgeContext?: string
  knowledgeReferences?: ChatKnowledgeReference[]
  webSearchContext?: string
  webSearchReferences?: WebSearchReference[]
  message: ChatMessage
  provider: ProviderConfig
  promptInjectionMode: PromptInjectionMode
  sessionId: string
  signal?: AbortSignal
  text: string
  thinkingMode: ThinkingMode
}) {
  await editChatMessage(message.id, text)
  await chatRepository.deleteMessagesAfter(sessionId, message.createdAt)
  await requestAssistantReply({
    attachments: message.attachments,
    card,
    defaultAssistantPrompt,
    history: history.filter((item) => item.createdAt < message.createdAt),
    knowledgeContext,
    knowledgeReferences: knowledgeReferences ?? message.knowledgeReferences ?? [],
    webSearchContext,
    webSearchReferences: webSearchReferences ?? message.webSearchReferences ?? [],
    provider,
    promptInjectionMode,
    sessionId,
    signal,
    text,
    thinkingMode,
  })
}

export async function runPromptCompare({
  leftCard,
  rightCard,
  input,
  ownerPromptCardId,
  provider,
  defaultAssistantPrompt,
  promptInjectionMode,
}: {
  leftCard: PromptCard
  rightCard: PromptCard
  input: string
  ownerPromptCardId: string
  provider: ProviderConfig
  defaultAssistantPrompt?: string
  promptInjectionMode: PromptInjectionMode
}) {
  const leftVersion = createPromptVersion(
    leftCard,
    'compare',
    defaultAssistantPrompt,
  )
  const rightVersion = createPromptVersion(
    rightCard,
    'compare',
    defaultAssistantPrompt,
  )
  await Promise.all([
    chatRepository.savePromptVersion(leftVersion),
    chatRepository.savePromptVersion(rightVersion),
  ])
  const baseMessages = (prompt: string) => [
    {
      role: promptInjectionMode === 'system' ? ('system' as const) : ('user' as const),
      content: prompt,
    },
    { role: 'user' as const, content: input },
  ]
  const [oldOutput, newOutput] = await Promise.all([
    requestCompletion(provider, baseMessages(leftVersion.compiledMarkdown)),
    requestCompletion(provider, baseMessages(rightVersion.compiledMarkdown)),
  ])
  const run = createCompareRun(
    ownerPromptCardId,
    leftVersion,
    rightVersion,
    input,
    oldOutput,
    newOutput,
  )
  await chatRepository.saveCompareRun(run)
}
