import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkWebSearchProvider, requestWebSearch } from './webSearch'
import type { WebSearchProviderConfig, WebSearchSettings } from '@/shared/types'

const provider: WebSearchProviderConfig = {
  id: 'bing',
  name: 'Bing',
  type: 'local',
  enabled: true,
  apiHost: 'https://www.bing.com/search',
  apiKeys: [],
}

const settings: WebSearchSettings = {
  id: 'web-search',
  defaultProviderId: 'bing',
  searchWithTime: true,
  maxResults: 5,
  excludeDomains: [],
  compression: { method: 'none', cutoffLimit: 2000 },
  providers: [provider],
  createdAt: 'now',
  updatedAt: 'now',
}

describe('web search api', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requests web search through the local proxy', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          query: 'hello',
          providerId: 'bing',
          providerName: 'Bing',
          results: [
            {
              title: 'Result',
              content: 'Content',
              url: 'https://example.com',
              sourceInput: 'hello',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(requestWebSearch(provider, settings, 'hello')).resolves.toMatchObject({
      providerId: 'bing',
      results: [{ title: 'Result' }],
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/web-search/search',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('surfaces web search proxy errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ error: 'Search failed' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(requestWebSearch(provider, settings, 'hello')).rejects.toThrow(
      'Search failed',
    )
  })

  it('checks a web search provider', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ ok: true, message: '检测成功' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(checkWebSearchProvider(provider, settings)).resolves.toBe('检测成功')
  })

  it('throws provider check errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ ok: false, error: 'bad key' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(checkWebSearchProvider(provider, settings)).rejects.toThrow('bad key')
  })
})
