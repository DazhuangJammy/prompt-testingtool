import { beforeEach, describe, expect, it, vi } from 'vitest'
import { requestCompletion, requestCompletionStream } from '@/shared/api/ai'
import { chatRepository } from '@/features/chat/infrastructure/chatRepository'
import {
  assignChatSessionPromptCard,
  clearChatSession,
  createChatTopic,
  deleteChatTopicAndPickNext,
  editChatMessage,
  ensureChatSession,
  renameChatTopic,
  resendChatMessage,
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
    updateSessionPromptCard: vi.fn(),
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

function mockAssistantStream(text: string, thinking?: string) {
  vi.mocked(requestCompletionStream).mockImplementation(
    async (_provider, _messages, handlers) => {
      if (thinking) handlers.onThinking?.(thinking)
      handlers.onText(text)
      return text
    },
  )
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

  it('creates hidden compare sessions with pane index metadata', async () => {
    const sessionId = await ensureChatSession('canvas', undefined, 'card', {
      comparePaneIndex: 2,
      hidden: true,
      parentSessionId: 'parent',
    })

    expect(sessionId).toBeTruthy()
    expect(chatRepository.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        canvasId: 'canvas',
        comparePaneIndex: 2,
        hidden: true,
        parentSessionId: 'parent',
        promptCardId: 'card',
      }),
    )
  })

  it('creates and renames chat topics through session records', async () => {
    const topic = await createChatTopic('canvas', '  方案讨论  ', 'card')
    await renameChatTopic(topic.id, '新标题')
    await assignChatSessionPromptCard(topic.id, 'card-2')

    expect(topic.canvasId).toBe('canvas')
    expect(topic.promptCardId).toBe('card')
    expect(topic.title).toBe('方案讨论')
    expect(chatRepository.createSession).toHaveBeenCalledWith(topic)
    expect(chatRepository.updateSessionTitle).toHaveBeenCalledWith(
      topic.id,
      '新标题',
    )
    expect(chatRepository.updateSessionPromptCard).toHaveBeenCalledWith(
      topic.id,
      'card-2',
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
    mockAssistantStream('assistant', 'thinking')
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
    expect(chatRepository.updateSessionAfterReply).toHaveBeenCalledWith('session')
    expect(requestCompletionStream).toHaveBeenCalledWith(
      provider,
      expect.any(Array),
      expect.any(Object),
      'on',
      undefined,
      undefined,
    )
  })

  it('stores knowledge references on both user and assistant messages', async () => {
    mockAssistantStream('assistant')
    const knowledgeReferences = [
      {
        baseId: 'base',
        baseName: '测试知识库',
        itemId: 'item',
        itemTitle: '资料.docx',
        chunkId: 'chunk',
        chunkIndex: 0,
        content: '事实',
        score: 0.9,
      },
    ]

    await sendChatMessage({
      card,
      history: [],
      knowledgeContext: 'knowledge context',
      knowledgeReferences,
      provider,
      promptInjectionMode: 'system',
      sessionId: 'session',
      text: 'hello',
      thinkingMode: 'off',
    })

    expect(chatRepository.addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'user',
        knowledgeReferences,
      }),
    )
    expect(chatRepository.addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'assistant',
        knowledgeReferences,
      }),
    )
  })

  it('sends default assistant prompt before the card prompt', async () => {
    mockAssistantStream('assistant')

    await sendChatMessage({
      card,
      defaultAssistantPrompt: '你是默认助手',
      history: [],
      provider,
      promptInjectionMode: 'system',
      sessionId: 'session',
      text: 'hello',
      thinkingMode: 'off',
    })

    expect(requestCompletionStream).toHaveBeenCalledWith(
      provider,
      expect.arrayContaining([
        expect.objectContaining({
          role: 'system',
          content: expect.stringMatching(/^你是默认助手\n\n/),
        }),
      ]),
      expect.any(Object),
      'off',
      undefined,
      undefined,
    )
  })

  it('names default chat topics with the active provider after a reply', async () => {
    mockAssistantStream('assistant')
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

  it('does not auto-name hidden compare sessions', async () => {
    mockAssistantStream('assistant')
    vi.mocked(chatRepository.getSession).mockResolvedValue({
      id: 'child-session',
      canvasId: 'canvas',
      hidden: true,
      parentSessionId: 'session',
      promptCardId: 'card',
      title: '测试',
      createdAt: 'now',
      updatedAt: 'now',
    })

    await sendChatMessage({
      card,
      history: [],
      provider,
      promptInjectionMode: 'system',
      sessionId: 'child-session',
      text: '帮我整理一下明天的课程安排',
      thinkingMode: 'off',
    })

    expect(requestCompletion).not.toHaveBeenCalled()
    expect(chatRepository.updateSessionTitle).not.toHaveBeenCalled()
  })

  it('falls back to user text when topic naming request fails', async () => {
    mockAssistantStream('assistant')
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
    mockAssistantStream('again')
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
      undefined,
    )
    expect(chatRepository.updateAssistantMessage).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ content: 'again', status: 'complete' }),
    )
  })

})
