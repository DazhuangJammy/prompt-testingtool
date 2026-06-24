import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('./webSearchLocalEngines.mjs', () => ({
  searchLocalEngine: vi.fn(async ({ query }) => ({
    results: [
      {
        title: 'Result',
        content: 'Content',
        url: 'https://example.com',
        sourceInput: query,
      },
    ],
  })),
}))

const { buildSearchKeywords, normalizeQuery, searchWeb } = await import('./webSearchService.mjs')

describe('webSearchService', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('turns conversational AI news requests into concise search keywords', () => {
    expect(buildSearchKeywords('今天有什么 ai 新闻？')).toBe('AI 人工智能 新闻 最新')
    expect(buildSearchKeywords('帮我搜索一下关于 DeepSeek 的最新消息')).toBe('DeepSeek 的最新消息')
  })

  it('adds the current local date after keyword normalization when enabled', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 24, 12, 0, 0))

    expect(normalizeQuery('今天有什么 ai 新闻？', true)).toBe(
      'AI 人工智能 新闻 最新 2026-06-24',
    )
  })

  it('searches local providers with normalized keywords', async () => {
    const result = await searchWeb({
      provider: {
        id: 'baidu',
        name: 'Baidu',
      },
      query: '今天有什么 ai 新闻？',
      settings: {
        maxResults: 5,
        searchWithTime: false,
        excludeDomains: [],
      },
    })

    expect(result.query).toBe('AI 人工智能 新闻 最新')
    expect(result.results[0]?.sourceInput).toBe('AI 人工智能 新闻 最新')
  })
})
