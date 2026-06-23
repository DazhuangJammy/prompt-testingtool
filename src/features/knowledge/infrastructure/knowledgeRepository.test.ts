import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/shared/storage/db'
import type {
  ChatKnowledgeSelection,
  KnowledgeBase,
  KnowledgeChunk,
  KnowledgeItem,
} from '@/shared/types'
import { knowledgeRepository } from './knowledgeRepository'

const deleteMock = vi.fn()
const sortByMock = vi.fn()
const toArrayMock = vi.fn()
const chain = {
  delete: deleteMock,
  equals: vi.fn(() => chain),
  first: vi.fn(),
  reverse: vi.fn(() => chain),
  sortBy: sortByMock,
  toArray: toArrayMock,
}

vi.mock('@/shared/storage/db', () => ({
  db: {
    chatKnowledgeSelections: {
      bulkDelete: vi.fn(),
      bulkPut: vi.fn(),
      delete: vi.fn(),
      put: vi.fn(),
      toArray: vi.fn(),
      where: vi.fn(() => chain),
    },
    knowledgeBases: {
      delete: vi.fn(),
      get: vi.fn(),
      orderBy: vi.fn(() => chain),
      put: vi.fn(),
    },
    knowledgeChunks: {
      bulkPut: vi.fn(),
      where: vi.fn(() => chain),
    },
    knowledgeItems: {
      bulkPut: vi.fn(),
      get: vi.fn(),
      toArray: vi.fn(),
      update: vi.fn(),
      where: vi.fn(() => chain),
    },
    transaction: vi.fn(async (_mode, ...args) => args.at(-1)()),
  },
}))

const base = {
  id: 'base',
  config: {
    chunkOverlap: 120,
    chunkSize: 900,
    rerankEnabled: false,
    threshold: 0.18,
    topK: 6,
  },
} as KnowledgeBase
const item = { id: 'item', baseId: 'base' } as KnowledgeItem
const chunk = { id: 'chunk', baseId: 'base', itemId: 'item' } as KnowledgeChunk
const selection = {
  id: 'selection',
  sessionId: 'session',
  baseIds: ['base'],
} as ChatKnowledgeSelection

describe('knowledge repository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sortByMock.mockResolvedValue([])
    toArrayMock.mockResolvedValue([])
  })

  it('delegates base and item persistence to Dexie', async () => {
    await knowledgeRepository.saveBase(base)
    await knowledgeRepository.saveItems([item])
    await knowledgeRepository.updateItem('item', { status: 'completed' })
    await knowledgeRepository.saveChunks([chunk])
    await knowledgeRepository.saveSelection(selection)

    expect(db.knowledgeBases.put).toHaveBeenCalledWith(base)
    expect(db.knowledgeItems.bulkPut).toHaveBeenCalledWith([item])
    expect(db.knowledgeItems.update).toHaveBeenCalledWith('item', { status: 'completed' })
    expect(db.knowledgeChunks.bulkPut).toHaveBeenCalledWith([chunk])
    expect(db.chatKnowledgeSelections.put).toHaveBeenCalledWith(selection)
  })

  it('normalizes legacy knowledge base numeric config fields', async () => {
    const legacyBase = {
      id: 'legacy',
      name: '旧知识库',
      config: { chunkSize: 99, topK: Number.NaN },
    } as unknown as KnowledgeBase
    vi.mocked(db.knowledgeBases.get).mockResolvedValue(legacyBase)
    toArrayMock.mockResolvedValue([legacyBase])

    await expect(knowledgeRepository.getBase('legacy')).resolves.toMatchObject({
      config: {
        chunkOverlap: 120,
        chunkSize: 200,
        rerankEnabled: false,
        threshold: 0.18,
        topK: 6,
      },
    })
    await expect(knowledgeRepository.listBases()).resolves.toEqual([
      expect.objectContaining({
        config: expect.objectContaining({
          chunkSize: 200,
          topK: 6,
        }),
      }),
    ])
  })

  it('queries indexed records', async () => {
    await knowledgeRepository.listBases()
    await knowledgeRepository.listItems('base')
    await knowledgeRepository.listChunks('base', 'item')
    await knowledgeRepository.listChunksByBase('base')
    await knowledgeRepository.getSelection('session')

    expect(db.knowledgeBases.orderBy).toHaveBeenCalledWith('updatedAt')
    expect(db.knowledgeItems.where).toHaveBeenCalledWith('baseId')
    expect(db.knowledgeChunks.where).toHaveBeenCalledWith('[baseId+itemId]')
    expect(db.chatKnowledgeSelections.where).toHaveBeenCalledWith('sessionId')
  })

  it('deletes bases with items, chunks and stale chat selections', async () => {
    vi.mocked(db.chatKnowledgeSelections.toArray).mockResolvedValue([
      { id: 'keep', sessionId: 's1', baseIds: ['base', 'other'], updatedAt: 'old' },
      { id: 'remove', sessionId: 's2', baseIds: ['base'], updatedAt: 'old' },
    ])

    await knowledgeRepository.deleteBaseCascade('base')

    expect(db.knowledgeBases.delete).toHaveBeenCalledWith('base')
    expect(db.knowledgeItems.where).toHaveBeenCalledWith('baseId')
    expect(db.knowledgeChunks.where).toHaveBeenCalledWith('baseId')
    expect(db.chatKnowledgeSelections.bulkPut).toHaveBeenCalledWith([
      { id: 'keep', sessionId: 's1', baseIds: ['other'], updatedAt: 'old' },
    ])
    expect(db.chatKnowledgeSelections.bulkDelete).toHaveBeenCalledWith(['remove'])
  })

  it('skips empty bulk writes and deletes', async () => {
    await knowledgeRepository.saveItems([])
    await knowledgeRepository.saveChunks([])
    await knowledgeRepository.deleteItems('base', [])

    expect(db.knowledgeItems.bulkPut).not.toHaveBeenCalled()
    expect(db.knowledgeChunks.bulkPut).not.toHaveBeenCalled()
    expect(db.transaction).not.toHaveBeenCalled()
  })
})
