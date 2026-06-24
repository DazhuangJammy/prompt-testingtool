import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchPageSnippet } from './webSearchPageSnippetService.mjs'

describe('webSearchPageSnippetService', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches a readable page snippet and strips scripts and navigation', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        `
          <html>
            <head><title>AI News</title><style>.x{}</style></head>
            <body>
              <nav>菜单</nav>
              <script>window.bad = true</script>
              <article>AI 行业今天发布了多个重要产品更新。</article>
            </body>
          </html>
        `,
        {
          status: 200,
          headers: { 'content-type': 'text/html' },
        },
      ),
    )

    const result = await fetchPageSnippet('https://example.com/news')

    expect(result).toMatchObject({
      content: 'AI 行业今天发布了多个重要产品更新。',
      url: 'https://example.com/news',
    })
  })
})
