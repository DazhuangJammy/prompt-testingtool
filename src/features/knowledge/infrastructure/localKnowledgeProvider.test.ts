import { beforeEach, describe, expect, it, vi } from 'vitest'
import { requestEmbeddings, requestRerank } from '@/shared/api/ai'
import type { KnowledgeBase, KnowledgeChunk, KnowledgeItem } from '@/shared/types'
import { fetchSitemapUrls, fetchUrlText, parseKnowledgeFile } from './documentParser'
import { LocalKnowledgeProvider } from './localKnowledgeProvider'

const tables = {
  bases: new Map<string, KnowledgeBase>(),
  items: new Map<string, KnowledgeItem>(),
  chunks: new Map<string, KnowledgeChunk>(),
}
let idCounter = 0

vi.mock('@/shared/api/ai', () => ({
  requestEmbeddings: vi.fn(),
  requestRerank: vi.fn(),
}))

vi.mock('./documentParser', () => ({
  fetchSitemapUrls: vi.fn(),
  fetchUrlText: vi.fn(),
  parseKnowledgeFile: vi.fn(),
}))

vi.mock('@/shared/utils/identity', () => ({
  createId: vi.fn(() => `id-${idCounter += 1}`),
}))

vi.mock('@/shared/utils/time', () => ({
  nowIso: () => '2026-01-01T00:00:00.000Z',
}))

vi.mock('@/shared/storage/db', () => ({
  db: {
    knowledgeBases: {
      delete: vi.fn(async (id: string) => tables.bases.delete(id)),
      get: vi.fn(async (id: string) => tables.bases.get(id)),
      put: vi.fn(async (base: KnowledgeBase) => tables.bases.set(base.id, base)),
    },
    knowledgeItems: {
      bulkPut: vi.fn(async (items: KnowledgeItem[]) => {
        items.forEach((item) => tables.items.set(item.id, item))
      }),
      get: vi.fn(async (id: string) => tables.items.get(id)),
      update: vi.fn(async (id: string, updates: Partial<KnowledgeItem>) => {
        const item = tables.items.get(id)
        if (item) tables.items.set(id, { ...item, ...updates })
      }),
      where: vi.fn((field: string) => itemWhere(field)),
    },
    knowledgeChunks: {
      bulkPut: vi.fn(async (chunks: KnowledgeChunk[]) => {
        chunks.forEach((chunk) => tables.chunks.set(chunk.id, chunk))
      }),
      where: vi.fn((field: string) => chunkWhere(field)),
    },
    chatKnowledgeSelections: {
      bulkDelete: vi.fn(),
      bulkPut: vi.fn(),
      toArray: vi.fn(async () => []),
    },
    transaction: vi.fn(async (_mode: string, ...args: unknown[]) => {
      const callback = args.at(-1) as () => Promise<void>
      return callback()
    }),
  },
}))

const provider = {
  id: 'embedding',
  name: 'Embedding',
  baseUrl: 'https://api.example.com',
  apiKey: 'key',
  model: 'text-embedding-v4',
  enabled: true,
  createdAt: 'now',
  updatedAt: 'now',
}

describe('LocalKnowledgeProvider', () => {
  beforeEach(() => {
    tables.bases.clear()
    tables.items.clear()
    tables.chunks.clear()
    idCounter = 0
    vi.clearAllMocks()
    vi.mocked(requestEmbeddings).mockImplementation(async (_provider, _model, input) =>
      input.map((text) => (text.includes('alpha') ? [1, 0] : [0, 1])),
    )
  })

  it('creates bases, indexes note items and searches vectors', async () => {
    const local = new LocalKnowledgeProvider(async () => [provider])
    const base = await local.createBase({
      name: '测试库',
      config: {
        embeddingProviderId: 'embedding',
        embeddingModel: 'text-embedding-v4',
        chunkSize: 200,
        threshold: 0,
      },
    })

    await local.addItems(base.id, [
      { sourceType: 'note', title: 'A', text: 'alpha marketing method' },
      { sourceType: 'note', title: 'B', text: 'beta sales method' },
    ])
    const results = await local.search({ baseIds: [base.id], query: 'alpha question' })

    expect(results[0]).toMatchObject({ itemTitle: 'A', score: 1 })
    expect(requestEmbeddings).toHaveBeenCalled()
  })

  it('embeds knowledge chunks in batches of at most ten texts', async () => {
    vi.mocked(requestEmbeddings).mockImplementation(async (_provider, _model, input) =>
      input.map((text, index) => [text.length, index]),
    )
    const local = new LocalKnowledgeProvider(async () => [provider])
    const base = await local.createBase({
      name: '测试库',
      config: {
        chunkOverlap: 0,
        chunkSize: 200,
        embeddingProviderId: 'embedding',
        embeddingModel: 'text-embedding-v4',
      },
    })
    const paragraphs = Array.from(
      { length: 23 },
      (_, index) => `alpha paragraph ${index + 1} ${'x'.repeat(160)}`,
    )

    await local.addItems(base.id, [
      { sourceType: 'note', title: 'Long', text: paragraphs.join('\n\n') },
    ])

    expect(requestEmbeddings).toHaveBeenCalledTimes(3)
    expect(vi.mocked(requestEmbeddings).mock.calls.map((call) => call[2])).toEqual([
      expect.arrayContaining([expect.stringContaining('paragraph 1')]),
      expect.arrayContaining([expect.stringContaining('paragraph 11')]),
      expect.arrayContaining([expect.stringContaining('paragraph 21')]),
    ])
    expect(vi.mocked(requestEmbeddings).mock.calls.map((call) => call[2].length)).toEqual([
      10,
      10,
      3,
    ])
    expect([...tables.chunks.values()]).toHaveLength(23)
  })

  it('applies rerank scores when enabled', async () => {
    vi.mocked(requestRerank).mockResolvedValue([{ index: 1, score: 0.99 }])
    const local = new LocalKnowledgeProvider(async () => [
      provider,
      { ...provider, id: 'rerank', model: 'qwen3-rerank' },
    ])
    const base = await local.createBase({
      name: '测试库',
      config: {
        embeddingProviderId: 'embedding',
        embeddingModel: 'text-embedding-v4',
        rerankEnabled: true,
        rerankProviderId: 'rerank',
        rerankModel: 'qwen3-rerank',
        threshold: 0,
      },
    })

    await local.addItems(base.id, [
      { sourceType: 'note', title: 'A', text: 'alpha' },
      { sourceType: 'note', title: 'B', text: 'beta' },
    ])
    const results = await local.search({ baseIds: [base.id], query: 'alpha' })

    expect(results.some((result) => result.rerankScore === 0.99)).toBe(true)
    expect(requestRerank).toHaveBeenCalled()
  })

  it('updates, reindexes selected items and delegates deletions', async () => {
    const local = new LocalKnowledgeProvider(async () => [provider])
    const base = await local.createBase({
      name: '原名',
      config: {
        embeddingProviderId: 'embedding',
        embeddingModel: 'text-embedding-v4',
      },
    })
    const [first, second] = await local.addItems(base.id, [
      { sourceType: 'note', title: 'A', text: 'alpha' },
      { sourceType: 'note', title: 'B', text: 'beta' },
    ])

    const updated = await local.updateBase(base.id, {
      name: '  新名字  ',
      config: {
        chunkOverlap: 20,
        chunkSize: 120,
        rerankEnabled: false,
        threshold: 0.1,
        topK: 2,
      },
    })
    await local.reindexItems(base.id, [first.id])
    await local.deleteItems(base.id, [second.id])

    expect(updated.name).toBe('新名字')
    expect(updated.config.topK).toBe(2)
    expect(tables.items.get(first.id)?.status).toBe('completed')
    expect(tables.items.has(second.id)).toBe(false)

    await local.deleteBase(base.id)

    expect(tables.bases.has(base.id)).toBe(false)
  })

  it('imports files, urls and sitemap websites before indexing', async () => {
    vi.mocked(parseKnowledgeFile).mockResolvedValue('alpha file text')
    vi.mocked(fetchUrlText).mockImplementation(async (url) => `alpha ${url}`)
    vi.mocked(fetchSitemapUrls).mockResolvedValue([
      'https://example.com/a',
      'https://example.com/b',
    ])
    const local = new LocalKnowledgeProvider(async () => [provider])
    const base = await local.createBase({
      name: '测试库',
      config: {
        embeddingProviderId: 'embedding',
        embeddingModel: 'text-embedding-v4',
      },
    })

    await local.addItems(base.id, [
      {
        sourceType: 'file',
        title: 'files',
        files: [new File(['ignored'], 'demo.md', { type: 'text/markdown' })],
      },
      { sourceType: 'url', title: 'URL', sourceUri: 'https://example.com/page' },
      { sourceType: 'website', title: '站点', sourceUri: 'https://example.com/sitemap.xml' },
    ])

    expect(parseKnowledgeFile).toHaveBeenCalled()
    expect(fetchUrlText).toHaveBeenCalledWith('https://example.com/page')
    expect(fetchUrlText).toHaveBeenCalledWith('https://example.com/a')
    expect(fetchUrlText).toHaveBeenCalledWith('https://example.com/b')
    expect([...tables.items.values()].map((item) => item.status)).toEqual([
      'completed',
      'completed',
      'completed',
      'completed',
    ])
  })

  it('marks items failed when no embedding model is available', async () => {
    const local = new LocalKnowledgeProvider(async () => [])
    const base = await local.createBase({
      name: '测试库',
      config: {
        embeddingProviderId: 'missing',
        embeddingModel: 'text-embedding-v4',
      },
    })
    const [item] = await local.addItems(base.id, [
      { sourceType: 'note', title: 'A', text: 'alpha' },
    ])

    expect(tables.items.get(item.id)).toMatchObject({
      status: 'failed',
      error: '请先在知识库设置里选择可用的嵌入模型',
    })
  })

  it('handles empty text, empty queries and missing bases', async () => {
    const local = new LocalKnowledgeProvider(async () => [provider])
    const base = await local.createBase({
      name: '测试库',
      config: {
        embeddingProviderId: 'embedding',
        embeddingModel: 'text-embedding-v4',
      },
    })
    const [item] = await local.addItems(base.id, [
      { sourceType: 'note', title: 'Empty', text: '' },
    ])

    await expect(local.search({ baseIds: [], query: 'alpha' })).resolves.toEqual([])
    await expect(local.search({ baseIds: [base.id], query: '   ' })).resolves.toEqual([])
    await expect(local.updateBase('missing', { name: 'x' })).rejects.toThrow('知识库不存在')
    expect(tables.items.get(item.id)?.status).toBe('completed')
  })

  it('skips rerank calls when there are no results or no rerank model', async () => {
    vi.mocked(requestRerank).mockClear()
    const local = new LocalKnowledgeProvider(async () => [provider])
    const base = await local.createBase({
      name: '测试库',
      config: {
        embeddingProviderId: 'embedding',
        embeddingModel: 'text-embedding-v4',
        rerankEnabled: true,
        threshold: 0,
      },
    })
    await local.addItems(base.id, [
      { sourceType: 'note', title: 'Draft', text: 'alpha' },
    ])
    const item = [...tables.items.values()][0]
    tables.items.set(item.id, { ...item, status: 'failed' })

    await expect(local.search({ baseIds: [base.id], query: 'alpha' })).resolves.toEqual([])
    expect(requestRerank).not.toHaveBeenCalled()
  })
})

function itemWhere(field: string) {
  const itemField = field as keyof KnowledgeItem
  return {
    equals: (value: string) => ({
      delete: async () => {
        [...tables.items.values()]
          .filter((item) => item[itemField] === value)
          .forEach((item) => tables.items.delete(item.id))
      },
      sortBy: async (sortField: string) =>
        [...tables.items.values()]
          .filter((item) => item[itemField] === value)
          .sort((left, right) =>
            String(left[sortField as keyof KnowledgeItem]).localeCompare(
              String(right[sortField as keyof KnowledgeItem]),
            ),
          ),
      toArray: async () => [...tables.items.values()].filter((item) => item[itemField] === value),
    }),
    anyOf: (ids: string[]) => ({
      delete: async () => ids.forEach((id) => tables.items.delete(id)),
    }),
  }
}

function chunkWhere(field: string) {
  return {
    equals: (value: string | [string, string]) => ({
      delete: async () => {
        [...tables.chunks.values()]
          .filter((chunk) => matchesChunk(chunk, field, value))
          .forEach((chunk) => tables.chunks.delete(chunk.id))
      },
      sortBy: async (sortField: string) =>
        [...tables.chunks.values()]
          .filter((chunk) => matchesChunk(chunk, field, value))
          .sort((left, right) =>
            Number(left[sortField as keyof KnowledgeChunk]) -
            Number(right[sortField as keyof KnowledgeChunk]),
          ),
      toArray: async () => [...tables.chunks.values()].filter((chunk) => matchesChunk(chunk, field, value)),
    }),
  }
}

function matchesChunk(chunk: KnowledgeChunk, field: string, value: string | [string, string]) {
  if (field === '[baseId+itemId]' && Array.isArray(value)) {
    return chunk.baseId === value[0] && chunk.itemId === value[1]
  }
  return chunk[field as keyof KnowledgeChunk] === value
}
