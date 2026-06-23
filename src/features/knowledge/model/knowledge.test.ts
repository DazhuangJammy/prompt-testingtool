import { describe, expect, it, vi } from 'vitest'
import {
  cleanKnowledgeText,
  cosineSimilarity,
  createKnowledgeBase,
  createKnowledgeChunks,
  createKnowledgeItem,
  filterKnowledgeModelProviders,
  isSupportedKnowledgeFile,
  normalizeKnowledgeConfig,
  rankKnowledgeResults,
  splitKnowledgeText,
} from './knowledge'

vi.mock('@/shared/utils/identity', () => ({ createId: () => 'id' }))
vi.mock('@/shared/utils/time', () => ({ nowIso: () => '2026-01-01T00:00:00.000Z' }))

describe('knowledge model', () => {
  it('creates bases and normalizes config bounds', () => {
    const base = createKnowledgeBase({
      name: '  商业测试  ',
      config: { chunkSize: 20_000, chunkOverlap: 20_000, topK: 0, threshold: 2 },
    })

    expect(base.name).toBe('商业测试')
    expect(base.providerType).toBe('local')
    expect(base.config).toMatchObject({
      chunkSize: 4000,
      chunkOverlap: 3999,
      topK: 1,
      threshold: 1,
    })
  })

  it('cleans and chunks knowledge text with overlap', () => {
    expect(cleanKnowledgeText('a\r\n\r\n\r\nb   c')).toBe('a\n\nb c')
    expect(splitKnowledgeText('第一段内容\n\n第二段内容\n\n第三段内容', 8, 2)).toEqual([
      '第一段内容',
      '第二段内容',
      '第三段内容',
    ])
    expect(splitKnowledgeText('abcdefghijkl', 5, 2)).toEqual([
      'abcde',
      'defgh',
      'ghijk',
      'jkl',
    ])
  })

  it('creates chunks for items', () => {
    const item = createKnowledgeItem({
      baseId: 'base',
      sourceType: 'note',
      title: '测试',
      text: 'hello world',
    })
    const chunks = createKnowledgeChunks(item, 'hello world', normalizeKnowledgeConfig())

    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toMatchObject({
      baseId: 'base',
      itemId: 'id',
      content: 'hello world',
      index: 0,
    })
  })

  it('scores, filters and ranks search results', () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBe(1)
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0)

    const ranked = rankKnowledgeResults(
      [
        result('a', 0.1),
        result('b', 0.8),
        result('c', 0.5, 0.9),
      ],
      { topK: 2, threshold: 0.2 },
    )

    expect(ranked.map((item) => item.chunkId)).toEqual(['c', 'b'])
  })

  it('recognizes supported file extensions', () => {
    expect(isSupportedKnowledgeFile('demo.docx')).toBe(true)
    expect(isSupportedKnowledgeFile('demo.exe')).toBe(false)
  })

  it('filters model providers by knowledge capabilities', () => {
    const providers = [
      provider('chat', 'qwen3.7-plus', ['chat', 'reasoning']),
      provider('embedding', 'text-embedding-v4', ['embedding']),
      provider('rerank', 'gte-rerank-v2', ['embedding', 'rerank']),
    ]

    expect(
      filterKnowledgeModelProviders(providers, 'embedding').map((item) => item.id),
    ).toEqual(['embedding', 'rerank'])
    expect(
      filterKnowledgeModelProviders(providers, 'rerank').map((item) => item.id),
    ).toEqual(['rerank'])
  })
})

function result(chunkId: string, score: number, rerankScore?: number) {
  return {
    baseId: 'base',
    chunkId,
    chunkIndex: 0,
    content: chunkId,
    itemId: 'item',
    itemTitle: 'Item',
    score,
    rerankScore,
  }
}

function provider(
  id: string,
  model: string,
  capabilities: Array<'chat' | 'reasoning' | 'embedding' | 'rerank'>,
) {
  return {
    id,
    name: id,
    baseUrl: 'https://api.example.com',
    apiKey: 'key',
    model,
    models: [{ id: model, enabled: true, capabilities }],
    createdAt: 'now',
    updatedAt: 'now',
  }
}
