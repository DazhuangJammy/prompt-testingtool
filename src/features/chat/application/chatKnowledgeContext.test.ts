import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChatKnowledgeReference, KnowledgeBase, ProviderConfig } from '@/shared/types'
import {
  buildKnowledgeReferences,
  formatKnowledgeContext,
} from '@/features/knowledge/application/knowledgeService'
import { resolveChatKnowledgeContext } from './chatKnowledgeContext'

vi.mock('@/features/knowledge/application/knowledgeService', () => ({
  buildKnowledgeReferences: vi.fn(),
  formatKnowledgeContext: vi.fn((references: ChatKnowledgeReference[]) =>
    references.length ? 'knowledge context' : '',
  ),
}))

const base = {
  id: 'base',
  name: '测试库',
} as KnowledgeBase

const provider = {
  id: 'provider',
  name: 'Provider',
} as ProviderConfig

describe('chat knowledge context', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty context when knowledge is unavailable', async () => {
    await expect(resolveChatKnowledgeContext({
      baseIds: [],
      bases: [base],
      getProviders: async () => [provider],
      query: 'question',
    })).resolves.toEqual({ context: '', references: [] })
    await expect(resolveChatKnowledgeContext({
      baseIds: ['base'],
      bases: [base],
      query: 'question',
    })).resolves.toEqual({ context: '', references: [] })
    await expect(resolveChatKnowledgeContext({
      baseIds: ['base'],
      bases: [base],
      getProviders: async () => [provider],
      query: '   ',
    })).resolves.toEqual({ context: '', references: [] })

    expect(buildKnowledgeReferences).not.toHaveBeenCalled()
  })

  it('builds references and formatted context for selected knowledge bases', async () => {
    const reference = {
      baseId: 'base',
      baseName: '测试库',
      itemId: 'item',
      itemTitle: '资料',
      chunkId: 'chunk',
      chunkIndex: 0,
      content: '事实',
      score: 0.9,
    }
    vi.mocked(buildKnowledgeReferences).mockResolvedValue([reference])

    await expect(resolveChatKnowledgeContext({
      baseIds: ['base'],
      bases: [base],
      getProviders: async () => [provider],
      query: 'question',
    })).resolves.toEqual({
      context: 'knowledge context',
      references: [reference],
    })

    expect(buildKnowledgeReferences).toHaveBeenCalledWith(
      ['base'],
      'question',
      [base],
      expect.any(Function),
    )
    expect(formatKnowledgeContext).toHaveBeenCalledWith([reference])
  })
})
