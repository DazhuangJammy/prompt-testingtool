import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchKnowledgeRemoteText } from './knowledge'

describe('knowledge api', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches remote text through the local proxy', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          url: 'https://example.com/page',
          contentType: 'text/html',
          text: '<main>Hello</main>',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchKnowledgeRemoteText('https://example.com/page')).resolves.toEqual({
      url: 'https://example.com/page',
      contentType: 'text/html',
      text: '<main>Hello</main>',
    })
    expect(fetchMock).toHaveBeenCalledWith('/api/knowledge/fetch-url', expect.objectContaining({
      method: 'POST',
    }))
  })

  it('surfaces proxy errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ error: 'Fetch failed' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(fetchKnowledgeRemoteText('https://example.com')).rejects.toThrow('Fetch failed')
  })
})
