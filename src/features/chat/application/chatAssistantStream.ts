import { requestCompletionStream } from '@/shared/api/ai'
import { chatRepository } from '@/features/chat/infrastructure/chatRepository'
import { splitThinkingBlock } from '@/shared/model/thinking'
import type {
  CompletionMessage,
  CompletionWebSearchToolConfig,
  ProviderConfig,
  ThinkingMode,
  WebSearchReference,
} from '@/shared/types'

export async function streamAssistantMessage({
  assistantMessageId,
  messages,
  provider,
  signal,
  thinkingMode,
  webSearch,
}: {
  assistantMessageId: string
  messages: CompletionMessage[]
  provider: ProviderConfig
  signal?: AbortSignal
  thinkingMode: ThinkingMode
  webSearch?: CompletionWebSearchToolConfig
}) {
  const startedAt = performance.now()
  let assistantText = ''
  let thinkingText = ''
  const webSearchReferences: WebSearchReference[] = []
  const aborted = await streamAssistantReply({
    assistantMessageId,
    getAssistantText: () => assistantText,
    getThinkingText: () => thinkingText,
    messages,
    provider,
    setAssistantText: (value) => {
      assistantText = value
    },
    setThinkingText: (value) => {
      thinkingText = value
    },
    signal,
    startedAt,
    thinkingMode,
    webSearch,
    webSearchReferences,
  })
  const finalCleanText = stripToolCallMarkup(assistantText)
  const finalAssistantText = finalCleanText.trim()
    ? finalCleanText
    : createSearchOnlyFallbackText(webSearchReferences)
  if (!aborted && !finalAssistantText.trim() && !thinkingText.trim()) {
    throw new Error('上游返回为空')
  }
  await chatRepository.updateAssistantMessage(assistantMessageId, {
    content: mergeThinkingContent(thinkingText, finalAssistantText, thinkingMode),
    thinkingDurationMs: thinkingText && thinkingMode !== 'off'
      ? Math.round(performance.now() - startedAt)
      : undefined,
    status: 'complete',
    webSearchReferences,
  })
}

function createSearchOnlyFallbackText(references: WebSearchReference[]) {
  if (!references.length) return ''
  return [
    '已完成联网搜索，但上游模型没有生成回答。先把可用来源列给你：',
    '',
    ...references.map(
      (reference, index) =>
        `${index + 1}. ${reference.title || reference.url} [${index + 1}]\n${reference.url}`,
    ),
  ].join('\n')
}

function mergeThinkingContent(
  thinking: string,
  text: string,
  thinkingMode: ThinkingMode,
) {
  if (thinkingMode === 'off') return splitThinkingBlock(text).answer || text
  return thinking ? `<think>${thinking}</think>${text}` : text
}

async function streamAssistantReply({
  assistantMessageId,
  getAssistantText,
  getThinkingText,
  messages,
  provider,
  setAssistantText,
  setThinkingText,
  signal,
  startedAt,
  thinkingMode,
  webSearch,
  webSearchReferences,
}: {
  assistantMessageId: string
  getAssistantText: () => string
  getThinkingText: () => string
  messages: CompletionMessage[]
  provider: ProviderConfig
  setAssistantText: (value: string) => void
  setThinkingText: (value: string) => void
  signal?: AbortSignal
  startedAt: number
  thinkingMode: ThinkingMode
  webSearch?: CompletionWebSearchToolConfig
  webSearchReferences: WebSearchReference[]
}) {
  try {
    await requestCompletionStream(
      provider,
      messages,
      {
        onText: async (chunk) => {
          const nextText = stripToolCallMarkup(getAssistantText() + chunk)
          setAssistantText(nextText)
          await chatRepository.updateAssistantMessage(assistantMessageId, {
            content: mergeThinkingContent(
              getThinkingText(),
              getAssistantText(),
              thinkingMode,
            ),
          })
        },
        onThinking: async (chunk) => {
          setThinkingText(getThinkingText() + chunk)
          await chatRepository.updateAssistantMessage(assistantMessageId, {
            content: mergeThinkingContent(
              getThinkingText(),
              getAssistantText(),
              thinkingMode,
            ),
            thinkingDurationMs: Math.round(performance.now() - startedAt),
          })
        },
        onWebSearchReferences: async (references) => {
          webSearchReferences.splice(0, webSearchReferences.length, ...references)
          await chatRepository.updateAssistantMessage(assistantMessageId, {
            content: mergeThinkingContent(
              getThinkingText(),
              getAssistantText(),
              thinkingMode,
            ),
            webSearchReferences,
          })
        },
        onWebSearchStatus: async (status) => {
          await chatRepository.updateAssistantMessage(assistantMessageId, {
            content: mergeThinkingContent(
              getThinkingText(),
              getAssistantText(),
              thinkingMode,
            ),
            webSearchStatus: status,
          })
        },
      },
      thinkingMode,
      signal,
      webSearch,
    )
    return false
  } catch (error) {
    if (!isAbortError(error)) throw error
    return true
  }
}

function stripToolCallMarkup(content: string) {
  return content
    .replace(/<\|\s*DSML\s*\|[\s\S]*?(?:<\/\|\s*DSML\s*\|\s*tool_calls>|<\/\|\s*DSML\s*\|\s*invoke>|$)/gi, '')
    .replace(/<\|\s*tool_calls\s*\|[\s\S]*?(?:<\|\s*\/tool_calls\s*\|>|$)/gi, '')
    .replace(/<tool_calls>[\s\S]*?<\/tool_calls>/gi, '')
    .replace(/<invoke\b[\s\S]*?<\/invoke>/gi, '')
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}
