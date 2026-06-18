import { beforeEach, describe, expect, it, vi } from 'vitest'
import { requestCompletion } from '@/shared/api/ai'
import { chatRepository } from '@/features/chat/infrastructure/chatRepository'
import { runPromptCompare } from './chatService'
import type { PromptCard, ProviderConfig } from '@/shared/types'

vi.mock('@/shared/api/ai', () => ({
  requestCompletion: vi.fn(),
  requestCompletionStream: vi.fn(),
}))

vi.mock('@/features/chat/infrastructure/chatRepository', () => ({
  chatRepository: {
    saveCompareRun: vi.fn(),
    savePromptVersion: vi.fn(),
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

describe('chat service compare', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requestCompletion).mockReset()
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
