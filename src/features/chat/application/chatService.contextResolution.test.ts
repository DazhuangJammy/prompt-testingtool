import { beforeEach, describe, expect, it, vi } from 'vitest'
import { requestCompletionStream } from '@/shared/api/ai'
import { chatRepository } from '@/features/chat/infrastructure/chatRepository'
import { sendChatMessage } from './chatService'
import type { PromptCard, ProviderConfig } from '@/shared/types'

vi.mock('@/shared/api/ai', () => ({
  requestCompletion: vi.fn(),
  requestCompletionStream: vi.fn(),
}))

vi.mock('@/features/chat/infrastructure/chatRepository', () => ({
  chatRepository: {
    addMessage: vi.fn(),
    getSession: vi.fn(),
    savePromptVersion: vi.fn(),
    updateAssistantMessage: vi.fn(),
    updateMessageContextReferences: vi.fn(),
    updateSessionAfterReply: vi.fn(),
  },
}))

const card: PromptCard = {
  id: 'card',
  canvasId: 'canvas',
  title: 'T',
  position: { x: 0, y: 0 },
  sections: {
    role: { markdown: '角色' },
    rules: { markdown: '' },
    examples: { markdown: '' },
    workflow: { markdown: '', workflowSteps: [] },
    outputFormat: { markdown: '' },
    starter: { markdown: '开始' },
  },
  createdAt: 'now',
  updatedAt: 'now',
}

const provider: ProviderConfig = {
  id: 'p',
  name: 'P',
  baseUrl: 'https://example.com',
  apiKey: 'key',
  model: 'm',
  createdAt: 'now',
  updatedAt: 'now',
}

describe('chat service context resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(chatRepository.getSession).mockResolvedValue(undefined)
    vi.mocked(requestCompletionStream).mockImplementation(
      async (_provider, _messages, handlers) => {
        handlers.onText('assistant')
        return 'assistant'
      },
    )
  })

  it('resolves contexts after the user message is stored', async () => {
    const webSearchReferences = [
      {
        title: 'AI 新闻',
        content: '新闻摘要',
        url: 'https://example.com/ai',
        sourceInput: 'AI 新闻',
        providerId: 'baidu' as const,
        providerName: 'Baidu',
      },
    ]
    const callOrder: string[] = []
    vi.mocked(chatRepository.addMessage).mockImplementation(async (message) => {
      callOrder.push(`add:${message.role}`)
    })

    await sendChatMessage({
      card,
      history: [],
      provider,
      promptInjectionMode: 'system',
      resolveContexts: async () => {
        callOrder.push('resolve')
        return {
          knowledgeContext: '',
          knowledgeReferences: [],
          webSearchContext: '联网搜索结果',
          webSearchReferences,
        }
      },
      sessionId: 'session',
      text: '今天有什么 ai 新闻',
      thinkingMode: 'off',
    })

    expect(callOrder).toEqual(['add:user', 'resolve', 'add:assistant'])
    expect(chatRepository.updateMessageContextReferences).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ webSearchReferences }),
    )
    expect(chatRepository.addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'assistant',
        webSearchReferences,
      }),
    )
    expect(requestCompletionStream).toHaveBeenCalledWith(
      provider,
      expect.arrayContaining([
        expect.objectContaining({
          content: expect.stringContaining('联网搜索结果'),
        }),
      ]),
      expect.any(Object),
      'off',
      undefined,
      undefined,
    )
  })
})
