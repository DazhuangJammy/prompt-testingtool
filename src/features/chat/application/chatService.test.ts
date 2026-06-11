import { beforeEach, describe, expect, it, vi } from 'vitest'
import { requestCompletion, requestCompletionStream } from '@/shared/api/ai'
import { chatRepository } from '@/features/chat/infrastructure/chatRepository'
import {
  clearChatSession,
  createChatTopic,
  deleteChatTopicAndPickNext,
  editChatMessage,
  ensureChatSession,
  renameChatTopic,
  resendChatMessage,
  runPromptCompare,
  sendChatMessage,
} from './chatService'
import type { ChatMessage, PromptCard, ProviderConfig } from '@/shared/types'

vi.mock('@/shared/api/ai', () => ({
  requestCompletion: vi.fn(),
  requestCompletionStream: vi.fn(),
}))

vi.mock('@/features/chat/infrastructure/chatRepository', () => ({
  chatRepository: {
    addMessage: vi.fn(),
    clearMessages: vi.fn(),
    createSession: vi.fn(),
    deleteSessionCascade: vi.fn(),
    deleteMessagesAfter: vi.fn(),
    getSession: vi.fn(),
    saveCompareRun: vi.fn(),
    savePromptVersion: vi.fn(),
    updateAssistantMessage: vi.fn(),
    updateMessageContent: vi.fn(),
    updateSessionAfterReply: vi.fn(),
    updateSessionTitle: vi.fn(),
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

describe('chat service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requestCompletion).mockReset()
    vi.mocked(requestCompletionStream).mockReset()
    vi.mocked(chatRepository.getSession).mockResolvedValue(undefined)
  })

  it('uses existing session when provided', async () => {
    await expect(ensureChatSession('canvas', 'session', 'card')).resolves.toBe(
      'session',
    )
    expect(chatRepository.createSession).not.toHaveBeenCalled()
  })

  it('creates a session when missing', async () => {
    const sessionId = await ensureChatSession('canvas', undefined, 'card')

    expect(sessionId).toBeTruthy()
    expect(chatRepository.createSession).toHaveBeenCalledWith(
      expect.objectContaining({ canvasId: 'canvas', promptCardId: 'card' }),
    )
  })

  it('creates and renames chat topics through session records', async () => {
    const topic = await createChatTopic('canvas', '  方案讨论  ', 'card')
    await renameChatTopic(topic.id, '新标题')

    expect(topic.canvasId).toBe('canvas')
    expect(topic.promptCardId).toBe('card')
    expect(topic.title).toBe('方案讨论')
    expect(chatRepository.createSession).toHaveBeenCalledWith(topic)
    expect(chatRepository.updateSessionTitle).toHaveBeenCalledWith(
      topic.id,
      '新标题',
    )
  })

  it('deletes the active topic and picks the next available topic', async () => {
    await expect(
      deleteChatTopicAndPickNext({
        activeSessionId: 'a',
        sessions: [
          { id: 'a', updatedAt: '2' },
          { id: 'b', updatedAt: '1' },
        ],
        sessionId: 'a',
      }),
    ).resolves.toBe('b')

    expect(chatRepository.deleteSessionCascade).toHaveBeenCalledWith('a')
  })

  it('keeps the active topic when deleting another topic', async () => {
    await expect(
      deleteChatTopicAndPickNext({
        activeSessionId: 'a',
        sessions: [
          { id: 'a', updatedAt: '2' },
          { id: 'b', updatedAt: '1' },
        ],
        sessionId: 'b',
      }),
    ).resolves.toBe('a')
  })

  it('sends chat messages and updates session', async () => {
    vi.mocked(requestCompletionStream).mockImplementation(
      async (_provider, _messages, handlers) => {
        handlers.onThinking?.('thinking')
        handlers.onText('assistant')
        return 'assistant'
      },
    )
    vi.mocked(chatRepository.getSession).mockResolvedValue({
      id: 'session',
      canvasId: 'canvas',
      promptCardId: 'card',
      title: '自定义标题',
      createdAt: 'now',
      updatedAt: 'now',
    })
    const history: ChatMessage[] = []

    await sendChatMessage({
      card,
      history,
      provider,
      promptInjectionMode: 'system',
      sessionId: 'session',
      text: 'hello',
      thinkingMode: 'on',
    })

    expect(chatRepository.savePromptVersion).toHaveBeenCalled()
    expect(chatRepository.addMessage).toHaveBeenCalledTimes(2)
    expect(chatRepository.updateAssistantMessage).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        content: expect.stringContaining('assistant'),
      }),
    )
    expect(chatRepository.updateSessionAfterReply).toHaveBeenCalledWith(
      'session',
      'card',
    )
    expect(requestCompletionStream).toHaveBeenCalledWith(
      provider,
      expect.any(Array),
      expect.any(Object),
      'on',
      undefined,
    )
  })

  it('names default chat topics with the active provider after a reply', async () => {
    vi.mocked(requestCompletionStream).mockImplementation(
      async (_provider, _messages, handlers) => {
        handlers.onText('assistant')
        return 'assistant'
      },
    )
    vi.mocked(chatRepository.getSession).mockResolvedValue({
      id: 'session',
      canvasId: 'canvas',
      promptCardId: 'card',
      title: '新话题',
      createdAt: 'now',
      updatedAt: 'now',
    })
    vi.mocked(requestCompletion).mockResolvedValue('标题：整理课程表。')

    await sendChatMessage({
      card,
      history: [],
      provider,
      promptInjectionMode: 'system',
      sessionId: 'session',
      text: '帮我整理一下明天的课程安排',
      thinkingMode: 'off',
    })

    expect(requestCompletion).toHaveBeenCalledWith(
      provider,
      expect.arrayContaining([
        expect.objectContaining({ role: 'system' }),
        expect.objectContaining({
          role: 'user',
          content: '帮我整理一下明天的课程安排',
        }),
      ]),
      'off',
    )
    expect(chatRepository.updateSessionTitle).toHaveBeenCalledWith(
      'session',
      '整理课程表',
    )
  })

  it('falls back to user text when topic naming request fails', async () => {
    vi.mocked(requestCompletionStream).mockImplementation(
      async (_provider, _messages, handlers) => {
        handlers.onText('assistant')
        return 'assistant'
      },
    )
    vi.mocked(chatRepository.getSession).mockResolvedValue({
      id: 'session',
      canvasId: 'canvas',
      promptCardId: 'card',
      title: '测试',
      createdAt: 'now',
      updatedAt: 'now',
    })
    vi.mocked(requestCompletion).mockRejectedValue(new Error('naming failed'))

    await sendChatMessage({
      card,
      history: [],
      provider,
      promptInjectionMode: 'system',
      sessionId: 'session',
      text: '写一个关于乐高机器人的故事',
      thinkingMode: 'off',
    })

    expect(chatRepository.updateSessionTitle).toHaveBeenCalledWith(
      'session',
      '写一个关于乐高机器人的故事',
    )
  })

  it('streams assistant replies without thinking metadata', async () => {
    vi.mocked(requestCompletionStream).mockImplementation(
      async (_provider, _messages, handlers) => {
        handlers.onText('plain')
        return 'plain'
      },
    )

    await sendChatMessage({
      card,
      history: [],
      provider,
      promptInjectionMode: 'system',
      sessionId: 'session',
      text: 'hello',
      thinkingMode: 'off',
    })

    expect(chatRepository.updateAssistantMessage).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        content: 'plain',
        thinkingDurationMs: undefined,
      }),
    )
  })

  it('strips think blocks when thinking mode is off', async () => {
    vi.mocked(requestCompletionStream).mockImplementation(
      async (_provider, _messages, handlers) => {
        handlers.onText('<think>hidden</think>answer')
        return '<think>hidden</think>answer'
      },
    )

    await sendChatMessage({
      card,
      history: [],
      provider,
      promptInjectionMode: 'system',
      sessionId: 'session',
      text: 'hello',
      thinkingMode: 'off',
    })

    expect(chatRepository.addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'assistant',
        thinkingMode: 'off',
      }),
    )
    expect(chatRepository.updateAssistantMessage).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        content: 'answer',
        thinkingDurationMs: undefined,
      }),
    )
  })

  it('throws when upstream returns an empty stream', async () => {
    vi.mocked(requestCompletionStream).mockResolvedValue('')

    await expect(
      sendChatMessage({
        card,
        history: [],
        provider,
        promptInjectionMode: 'system',
        sessionId: 'session',
        text: 'hello',
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

    await sendChatMessage({
      card,
      history: [],
      provider,
      promptInjectionMode: 'system',
      sessionId: 'session',
      signal: new AbortController().signal,
      text: 'hello',
      thinkingMode: 'off',
    })

    expect(chatRepository.updateAssistantMessage).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ content: 'partial', status: 'complete' }),
    )
  })

  it('clears and edits chat messages', async () => {
    await clearChatSession()
    expect(chatRepository.clearMessages).not.toHaveBeenCalled()

    await clearChatSession('session')
    await editChatMessage('message', 'updated')

    expect(chatRepository.clearMessages).toHaveBeenCalledWith('session')
    expect(chatRepository.updateMessageContent).toHaveBeenCalledWith(
      'message',
      'updated',
    )
  })

  it('resends from an edited user message and removes later history', async () => {
    vi.mocked(requestCompletionStream).mockImplementation(
      async (_provider, _messages, handlers) => {
        handlers.onText('again')
        return 'again'
      },
    )
    const history: ChatMessage[] = [
      {
        id: 'before',
        sessionId: 'session',
        role: 'assistant',
        content: 'previous',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'message',
        sessionId: 'session',
        role: 'user',
        content: 'old',
        createdAt: '2026-01-01T00:00:01.000Z',
      },
      {
        id: 'after',
        sessionId: 'session',
        role: 'assistant',
        content: 'stale',
        createdAt: '2026-01-01T00:00:02.000Z',
      },
    ]

    await resendChatMessage({
      card,
      history,
      message: history[1],
      provider,
      promptInjectionMode: 'user',
      sessionId: 'session',
      text: 'new',
      thinkingMode: 'deep',
    })

    expect(chatRepository.updateMessageContent).toHaveBeenCalledWith(
      'message',
      'new',
    )
    expect(chatRepository.deleteMessagesAfter).toHaveBeenCalledWith(
      'session',
      '2026-01-01T00:00:01.000Z',
    )
    expect(requestCompletionStream).toHaveBeenCalledWith(
      provider,
      expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          content: expect.stringContaining('# 角色'),
        }),
        { role: 'assistant', content: 'previous' },
        { role: 'user', content: 'new' },
      ]),
      expect.any(Object),
      'deep',
      undefined,
    )
    expect(chatRepository.updateAssistantMessage).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ content: 'again', status: 'complete' }),
    )
  })

  it('runs prompt compare and saves compare run', async () => {
    vi.mocked(requestCompletion)
      .mockResolvedValueOnce('old')
      .mockResolvedValueOnce('new')
    const rightCard: PromptCard = {
      ...card,
      id: 'right-card',
      sections: {
        ...card.sections,
        role: { markdown: '另一个角色' },
      },
    }

    await runPromptCompare({
      leftCard: card,
      rightCard,
      input: 'same',
      ownerPromptCardId: 'card',
      provider,
      promptInjectionMode: 'system',
    })

    expect(chatRepository.savePromptVersion).toHaveBeenCalledTimes(2)
    expect(requestCompletion).toHaveBeenCalledWith(
      provider,
      expect.arrayContaining([
        expect.objectContaining({
          role: 'system',
          content: expect.stringContaining('角色'),
        }),
        { role: 'user', content: 'same' },
      ]),
    )
    expect(requestCompletion).toHaveBeenCalledWith(
      provider,
      expect.arrayContaining([
        expect.objectContaining({
          role: 'system',
          content: expect.stringContaining('另一个角色'),
        }),
        { role: 'user', content: 'same' },
      ]),
    )
    expect(chatRepository.saveCompareRun).toHaveBeenCalled()
    expect(chatRepository.saveCompareRun).toHaveBeenCalledWith(
      expect.objectContaining({ promptCardId: 'card' }),
    )
  })
})
