import { beforeEach, describe, expect, it, vi } from 'vitest'
import { requestCompletionStream } from '@/shared/api/ai'
import { chatRepository } from '@/features/chat/infrastructure/chatRepository'
import { streamAssistantMessage } from './chatAssistantStream'
import type { CompletionMessage, ProviderConfig } from '@/shared/types'

vi.mock('@/shared/api/ai', () => ({
  requestCompletionStream: vi.fn(),
}))

vi.mock('@/features/chat/infrastructure/chatRepository', () => ({
  chatRepository: {
    updateAssistantMessage: vi.fn(),
  },
}))

const provider: ProviderConfig = {
  id: 'p',
  name: 'P',
  baseUrl: 'https://example.com',
  apiKey: 'key',
  model: 'm',
  createdAt: 'now',
  updatedAt: 'now',
}

const messages: CompletionMessage[] = [{ role: 'user', content: 'hello' }]

describe('chatAssistantStream', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requestCompletionStream).mockReset()
  })

  it('streams assistant replies without thinking metadata', async () => {
    vi.mocked(requestCompletionStream).mockImplementation(
      async (_provider, _messages, handlers) => {
        handlers.onText('plain')
        return 'plain'
      },
    )

    await streamAssistantMessage({
      assistantMessageId: 'assistant',
      messages,
      provider,
      thinkingMode: 'off',
    })

    expect(chatRepository.updateAssistantMessage).toHaveBeenCalledWith(
      'assistant',
      expect.objectContaining({
        content: 'plain',
        thinkingDurationMs: undefined,
        status: 'complete',
      }),
    )
  })

  it('strips think blocks when thinking mode is off', async () => {
    vi.mocked(requestCompletionStream).mockImplementation(
      async (_provider, _messages, handlers) => {
        handlers.onText('<think>hidden</think>answer')
        return 'answer'
      },
    )

    await streamAssistantMessage({
      assistantMessageId: 'assistant',
      messages,
      provider,
      thinkingMode: 'off',
    })

    expect(chatRepository.updateAssistantMessage).toHaveBeenCalledWith(
      'assistant',
      expect.objectContaining({
        content: 'answer',
        thinkingDurationMs: undefined,
      }),
    )
  })

  it('throws when upstream returns an empty stream', async () => {
    vi.mocked(requestCompletionStream).mockResolvedValue('')

    await expect(
      streamAssistantMessage({
        assistantMessageId: 'assistant',
        messages,
        provider,
        thinkingMode: 'off',
      }),
    ).rejects.toThrow('上游返回为空')
  })

  it('keeps partial output when generation is stopped', async () => {
    vi.mocked(requestCompletionStream).mockImplementation(
      async (_provider, _messages, handlers) => {
        handlers.onText('partial')
        throw new DOMException('stopped', 'AbortError')
      },
    )

    await streamAssistantMessage({
      assistantMessageId: 'assistant',
      messages,
      provider,
      signal: new AbortController().signal,
      thinkingMode: 'off',
    })

    expect(chatRepository.updateAssistantMessage).toHaveBeenCalledWith(
      'assistant',
      expect.objectContaining({ content: 'partial', status: 'complete' }),
    )
  })

  it('stores web search references streamed by the proxy', async () => {
    const webSearchReferences = [
      {
        title: 'AI News',
        content: 'Current AI news',
        url: 'https://example.com/ai',
        sourceInput: 'AI news',
        providerId: 'bing' as const,
        providerName: 'Bing',
      },
    ]
    vi.mocked(requestCompletionStream).mockImplementation(
      async (_provider, _messages, handlers) => {
        handlers.onWebSearchReferences?.(webSearchReferences)
        handlers.onText('answer [1]')
        return 'answer [1]'
      },
    )

    await streamAssistantMessage({
      assistantMessageId: 'assistant',
      messages,
      provider,
      thinkingMode: 'off',
      webSearch: { providerId: 'bing' },
    })

    expect(requestCompletionStream).toHaveBeenCalledWith(
      provider,
      messages,
      expect.any(Object),
      'off',
      undefined,
      { providerId: 'bing' },
    )
    expect(chatRepository.updateAssistantMessage).toHaveBeenCalledWith(
      'assistant',
      expect.objectContaining({ webSearchReferences }),
    )
  })

  it('keeps web search sources when the model returns no text after search', async () => {
    const webSearchReferences = [
      {
        title: 'AI News',
        content: 'Current AI news',
        url: 'https://example.com/ai',
        sourceInput: 'AI news',
        providerId: 'bing' as const,
        providerName: 'Bing',
      },
    ]
    vi.mocked(requestCompletionStream).mockImplementation(
      async (_provider, _messages, handlers) => {
        handlers.onWebSearchReferences?.(webSearchReferences)
        return ''
      },
    )

    await streamAssistantMessage({
      assistantMessageId: 'assistant',
      messages,
      provider,
      thinkingMode: 'off',
      webSearch: { providerId: 'bing' },
    })

    expect(chatRepository.updateAssistantMessage).toHaveBeenCalledWith(
      'assistant',
      expect.objectContaining({
        content: expect.stringContaining('已完成联网搜索'),
        status: 'complete',
        webSearchReferences,
      }),
    )
  })

  it('stores web search status while search is running', async () => {
    vi.mocked(requestCompletionStream).mockImplementation(
      async (_provider, _messages, handlers) => {
        handlers.onWebSearchStatus?.({
          phase: 'searching',
          query: 'AI news',
          providerName: 'Bing',
        })
        handlers.onText('answer')
        return 'answer'
      },
    )

    await streamAssistantMessage({
      assistantMessageId: 'assistant',
      messages,
      provider,
      thinkingMode: 'off',
      webSearch: { providerId: 'bing' },
    })

    expect(chatRepository.updateAssistantMessage).toHaveBeenCalledWith(
      'assistant',
      expect.objectContaining({
        webSearchStatus: expect.objectContaining({ phase: 'searching' }),
      }),
    )
  })

  it('filters tool-call markup leaked as assistant text', async () => {
    vi.mocked(requestCompletionStream).mockImplementation(
      async (_provider, _messages, handlers) => {
        handlers.onText(
          '<|DSML| |tool_calls><|DSML| |invoke name="web__search"><|DSML| |parameter name="query" string="true">AI 新闻</|DSML| |parameter></|DSML| |invoke></|DSML| |tool_calls>',
        )
        handlers.onText('总结内容 [1]')
        return '总结内容 [1]'
      },
    )

    await streamAssistantMessage({
      assistantMessageId: 'assistant',
      messages,
      provider,
      thinkingMode: 'off',
    })

    expect(chatRepository.updateAssistantMessage).toHaveBeenCalledWith(
      'assistant',
      expect.objectContaining({
        content: '总结内容 [1]',
        status: 'complete',
      }),
    )
  })
})
