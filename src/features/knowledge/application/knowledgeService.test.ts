import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  ChatKnowledgeSelection,
  KnowledgeBase,
  KnowledgeSearchResult,
  ProviderConfig,
} from '@/shared/types'
import {
  buildKnowledgeReferences,
  createKnowledgeService,
  formatKnowledgeContext,
  getChatKnowledgeSelection,
  saveChatKnowledgeSelection,
  searchKnowledge,
} from './knowledgeService'
import { LocalKnowledgeProvider } from '../infrastructure/localKnowledgeProvider'
import { knowledgeRepository } from '../infrastructure/knowledgeRepository'

const providerMethods = {
  addItems: vi.fn(),
  createBase: vi.fn(),
  deleteBase: vi.fn(),
  deleteItems: vi.fn(),
  listChunks: vi.fn(),
  reindexItems: vi.fn(),
  search: vi.fn(),
  updateBase: vi.fn(),
}
const bailianProviderMethods = {
  ...providerMethods,
  addItems: vi.fn(),
  createBase: vi.fn(),
  deleteBase: vi.fn(),
  deleteItems: vi.fn(),
  listChunks: vi.fn(),
  reindexItems: vi.fn(),
  search: vi.fn(),
  syncItems: vi.fn(),
  updateBase: vi.fn(),
}

vi.mock('@/shared/utils/identity', () => ({
  createId: vi.fn(() => 'selection-id'),
}))

vi.mock('@/shared/utils/time', () => ({
  nowIso: () => '2026-01-01T00:00:00.000Z',
}))

vi.mock('../infrastructure/localKnowledgeProvider', () => ({
  LocalKnowledgeProvider: vi.fn(function LocalKnowledgeProviderMock() {
    return providerMethods
  }),
}))

vi.mock('../infrastructure/bailianKnowledgeProvider', () => ({
  BailianKnowledgeProvider: vi.fn(function BailianKnowledgeProviderMock() {
    return bailianProviderMethods
  }),
}))

vi.mock('../infrastructure/knowledgeRepository', () => ({
  knowledgeRepository: {
    deleteSelection: vi.fn(),
    getBase: vi.fn(),
    getSelection: vi.fn(),
    listBases: vi.fn(),
    listItems: vi.fn(),
    saveSelection: vi.fn(),
  },
}))

const provider: ProviderConfig = {
  id: 'provider',
  name: 'Provider',
  baseUrl: 'https://api.example.com',
  apiKey: 'key',
  model: 'text-embedding-v4',
  enabled: true,
  createdAt: 'now',
  updatedAt: 'now',
}

const base: KnowledgeBase = {
  id: 'base',
  name: '测试库',
  providerType: 'local',
  config: {
    chunkOverlap: 100,
    chunkSize: 800,
    rerankEnabled: false,
    threshold: 0.2,
    topK: 5,
  },
  createdAt: 'now',
  updatedAt: 'now',
}

describe('knowledge service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    providerMethods.search.mockResolvedValue([])
    bailianProviderMethods.search.mockResolvedValue([])
    vi.mocked(knowledgeRepository.getBase).mockResolvedValue(base)
  })

  it('routes Bailian bases to the Bailian provider', async () => {
    const bailianBase: KnowledgeBase = {
      ...base,
      providerType: 'bailian',
      externalBaseId: 'remote-base',
    }
    vi.mocked(knowledgeRepository.getBase).mockResolvedValue(bailianBase)
    bailianProviderMethods.createBase.mockResolvedValue(bailianBase)
    bailianProviderMethods.search.mockResolvedValue([{ chunkId: 'remote-chunk' }])
    const service = createKnowledgeService(async () => [provider])

    await expect(service.createBase({
      name: '百炼库',
      providerType: 'bailian',
    })).resolves.toBe(bailianBase)
    await expect(service.search({ baseIds: ['base'], query: 'q' })).resolves.toEqual([
      { chunkId: 'remote-chunk' },
    ])

    expect(bailianProviderMethods.search).toHaveBeenCalled()
    expect(providerMethods.search).not.toHaveBeenCalled()
  })

  it('creates a local provider-backed service facade', async () => {
    const service = createKnowledgeService(async () => [provider])
    providerMethods.createBase.mockResolvedValue(base)
    providerMethods.search.mockResolvedValue([{ chunkId: 'chunk' }])

    await expect(service.createBase({ name: '测试库' })).resolves.toBe(base)
    await expect(service.search({ baseIds: ['base'], query: 'q' })).resolves.toEqual([
      { chunkId: 'chunk' },
    ])

    expect(LocalKnowledgeProvider).toHaveBeenCalled()
  })

  it('saves, deduplicates and clears chat knowledge selections', async () => {
    vi.mocked(knowledgeRepository.getSelection).mockResolvedValueOnce(undefined)

    const saved = await saveChatKnowledgeSelection('session', ['base', 'base', 'other'])

    expect(saved).toEqual({
      id: 'selection-id',
      sessionId: 'session',
      baseIds: ['base', 'other'],
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    expect(knowledgeRepository.saveSelection).toHaveBeenCalledWith(saved)

    vi.mocked(knowledgeRepository.getSelection).mockResolvedValueOnce({
      id: 'existing',
      sessionId: 'session',
      baseIds: ['base'],
      updatedAt: 'old',
    } satisfies ChatKnowledgeSelection)

    await expect(saveChatKnowledgeSelection('session', [])).resolves.toBeUndefined()
    expect(knowledgeRepository.deleteSelection).toHaveBeenCalledWith('existing')
  })

  it('reads selections only when a session exists', async () => {
    await expect(getChatKnowledgeSelection()).resolves.toBeUndefined()
    expect(knowledgeRepository.getSelection).not.toHaveBeenCalled()
  })

  it('builds references and formats knowledge context', async () => {
    const results: KnowledgeSearchResult[] = [{
      baseId: 'base',
      itemId: 'item',
      itemTitle: '销售手册',
      chunkId: 'chunk',
      chunkIndex: 1,
      content: '关键事实',
      score: 0.8,
      rerankScore: 0.9,
    }]
    providerMethods.search.mockResolvedValueOnce(results)

    const references = await buildKnowledgeReferences(
      ['base'],
      '怎么卖',
      [base],
      async () => [provider],
    )

    expect(references[0]).toMatchObject({
      baseName: '测试库',
      itemTitle: '销售手册',
      score: 0.9,
    })
    const context = formatKnowledgeContext(references)
    expect(context).toContain('关键事实')
    expect(context).toContain('把对应编号写在相关句子或段落末尾')
    expect(context).toContain('不要把引用编号统一堆在回答结尾')
    expect(context).toContain('未使用的资料不要引用')
  })

  it('skips empty knowledge queries', async () => {
    await expect(buildKnowledgeReferences([], 'q', [base], async () => [provider])).resolves.toEqual([])
    await expect(searchKnowledge({ baseIds: ['base'], query: 'q' }, async () => [provider])).resolves.toEqual([])
    expect(formatKnowledgeContext([])).toBe('')
  })
})
