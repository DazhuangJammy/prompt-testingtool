import { describe, expect, it, vi } from 'vitest'
import { parseSearchHtml, searchLocalEngine } from './webSearchLocalEngines.mjs'

describe('webSearchLocalEngines', () => {
  it('filters Baidu portal links from parsed search results', () => {
    const html = `
      <a href="https://passport.baidu.com/v2/?login">登录</a>
      <a href="https://voice.baidu.com/act/newpneumonia/newpneumonia">抗击肺炎</a>
      <a href="http://news.baidu.com">新闻</a>
      <a href="https://www.hao123.com">hao123</a>
      <a href="http://map.baidu.com">地图</a>
      <a href="https://www.baidu.com/link?url=real-result">
        <em>AI</em> 新闻 最新动态
      </a>
      <div>这是关于 AI 行业最新融资和产品发布的摘要内容。</div>
      <a href="https://example.com/ai-news">今日 AI 新闻汇总</a>
    `

    const results = parseSearchHtml('baidu', html, 'AI 新闻')

    expect(results.map((result) => result.title)).toEqual([
      'AI 新闻 最新动态',
      '今日 AI 新闻汇总',
    ])
    expect(results[0]).toMatchObject({
      content: '这是关于 AI 行业最新融资和产品发布的摘要内容。',
      sourceInput: 'AI 新闻',
      url: 'https://www.baidu.com/link?url=real-result',
    })
  })

  it('requests local engines with result count and UTF-8 hints', async () => {
    const fetchText = vi.fn(async () => `
      <a href="https://www.baidu.com/link?url=one">第一条结果</a>
    `)
    const fetchPageSnippet = vi.fn(async () => ({
      content: '第一条结果 这是真实页面里的正文摘要，包含足够多的信息可以交给模型总结。',
      url: 'https://example.com/real-page',
    }))

    await expect(
      searchLocalEngine({
        provider: { id: 'baidu', name: 'Baidu' },
        query: 'AI 新闻',
        maxResults: 3,
        fetchPageSnippet,
        fetchText,
      }),
    ).resolves.toMatchObject({
      results: [
        {
          content: '这是真实页面里的正文摘要，包含足够多的信息可以交给模型总结。',
          title: '第一条结果',
          url: 'https://example.com/real-page',
        },
      ],
    })

    const searchUrl = fetchText.mock.calls[0][0]
    expect(searchUrl.searchParams.get('wd')).toBe('AI 新闻')
    expect(searchUrl.searchParams.get('rn')).toBe('3')
    expect(searchUrl.searchParams.get('ie')).toBe('utf-8')
    expect(fetchPageSnippet).toHaveBeenCalledWith(
      'https://www.baidu.com/link?url=one',
      expect.any(Object),
    )
  })

  it('drops captcha pages after local result enrichment', async () => {
    const fetchText = vi.fn(async () => `
      <a href="https://www.baidu.com/link?url=captcha">百度资讯结果</a>
      <a href="https://example.com/real">真实新闻</a>
    `)
    const fetchPageSnippet = vi
      .fn()
      .mockResolvedValueOnce({
        content: '网络不给力，请稍后重试 返回首页 问题反馈',
        url: 'https://wappass.baidu.com/static/captcha/tuxing_v2.html',
      })
      .mockResolvedValueOnce({
        content: '真实新闻正文摘要，说明 AI 行业最新发布和研究动态。',
        url: 'https://example.com/real',
      })

    await expect(
      searchLocalEngine({
        provider: { id: 'baidu', name: 'Baidu' },
        query: 'AI 新闻',
        maxResults: 5,
        fetchPageSnippet,
        fetchText,
      }),
    ).resolves.toMatchObject({
      results: [{ title: '真实新闻', url: 'https://example.com/real' }],
    })
  })
})
