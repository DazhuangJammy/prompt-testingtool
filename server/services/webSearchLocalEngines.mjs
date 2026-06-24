const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36'

export async function searchLocalEngine({
  provider,
  query,
  maxResults,
  signal,
  fetchPageSnippet,
  fetchText,
}) {
  const searchUrl = buildLocalSearchUrl(provider.id, query, maxResults)
  const html = await fetchText(searchUrl, {
    signal,
    headers: {
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'zh-CN,zh;q=0.9,en;q=0.7',
      'user-agent': USER_AGENT,
    },
    errorPrefix: `${provider.name} search failed`,
  })

  const parsedResults = parseSearchHtml(provider.id, html, query).slice(0, maxResults)
  if (!parsedResults.length) {
    throw new Error(`${provider.name} 当前没有返回可解析的搜索结果`)
  }

  return {
    results: await enrichThinResults(parsedResults, { fetchPageSnippet, signal }),
  }
}

export function parseSearchHtml(providerId, html, query) {
  return parseAnchorResults(providerId, html, query)
}

function parseAnchorResults(providerId, html, query) {
  const anchorRegex = /<a\b[^>]*href=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi
  const results = []
  const seen = new Set()
  let match

  while ((match = anchorRegex.exec(html)) !== null) {
    const rawHref = decodeHtml(match[2])
    const title = cleanHtmlText(match[3])
    const url = normalizeSearchUrl(providerId, rawHref)
    if (!isHttpUrl(url) || !title || title.length < 2) continue
    if (isLikelyNavigationResult(providerId, title, url)) continue
    if (isSearchEngineInternalUrl(providerId, url)) continue
    if (seen.has(url)) continue
    seen.add(url)
    const snippet = extractNearbySnippet(html, anchorRegex.lastIndex, title)
    results.push({
      title,
      content: snippet || title,
      url,
      sourceInput: query,
    })
    if (results.length >= 10) break
  }

  return results
}

async function enrichThinResults(results, { fetchPageSnippet, signal }) {
  if (typeof fetchPageSnippet !== 'function') return results

  const enriched = await Promise.all(
    results.map(async (result, index) => {
      if (!shouldFetchPageSnippet(result, index)) return result
      try {
        const page = await fetchPageSnippet(result.url, { signal })
        const content = cleanSnippetText(page.content, result.title)
        return {
          ...result,
          content: content || result.content,
          url: page.url || result.url,
        }
      } catch {
        return result
      }
    }),
  )

  return enriched.filter((result) => !isBlockedSearchResult(result))
}

function shouldFetchPageSnippet(result, index) {
  if (index >= 5) return false
  return normalizeForCompare(result.content) === normalizeForCompare(result.title) ||
    result.content.length < 80 ||
    /baidu\.com\/link\?/i.test(result.url)
}

function isBlockedSearchResult(result) {
  try {
    const parsedUrl = new URL(result.url)
    const host = parsedUrl.hostname.replace(/^www\./, '').toLowerCase()
    const path = parsedUrl.pathname.toLowerCase()
    if (
      host === 'wappass.baidu.com' ||
      host === 'passport.baidu.com' ||
      path.includes('captcha') ||
      path.includes('login')
    ) {
      return true
    }
  } catch {
    return true
  }

  const normalizedContent = normalizeForCompare(result.content)
  return (
    normalizedContent.includes('网络不给力请稍后重试') ||
    normalizedContent.includes('登录') && normalizedContent.includes('验证码')
  )
}

function extractNearbySnippet(html, anchorEndIndex, title) {
  const nextAnchorIndex = html.indexOf('<a', anchorEndIndex)
  const endIndex = nextAnchorIndex === -1
    ? anchorEndIndex + 1200
    : Math.min(nextAnchorIndex, anchorEndIndex + 1200)
  const nearbyText = cleanHtmlText(html.slice(anchorEndIndex, endIndex))
  return cleanSnippetText(nearbyText, title)
}

function buildLocalSearchUrl(providerId, query, maxResults) {
  if (providerId === 'google') {
    const url = new URL('https://www.google.com/search')
    url.searchParams.set('q', query)
    url.searchParams.set('num', String(Math.min(maxResults ?? 10, 10)))
    return url
  }
  if (providerId === 'baidu') {
    const url = new URL('https://www.baidu.com/s')
    url.searchParams.set('wd', query)
    url.searchParams.set('rn', String(Math.min(maxResults ?? 10, 10)))
    url.searchParams.set('ie', 'utf-8')
    return url
  }
  const url = new URL('https://www.bing.com/search')
  url.searchParams.set('q', query)
  url.searchParams.set('count', String(Math.min(maxResults ?? 10, 10)))
  url.searchParams.set('cc', 'CN')
  return url
}

function normalizeSearchUrl(providerId, href) {
  try {
    if (providerId === 'google' && href.startsWith('/url?')) {
      const url = new URL(`https://www.google.com${href}`)
      return url.searchParams.get('q') ?? href
    }
    if (providerId === 'bing' && href.startsWith('/')) {
      return `https://www.bing.com${href}`
    }
    if (providerId === 'baidu' && href.startsWith('/')) {
      return `https://www.baidu.com${href}`
    }
    return href
  } catch {
    return href
  }
}

function isSearchEngineInternalUrl(providerId, url) {
  try {
    const parsedUrl = new URL(url)
    const host = parsedUrl.hostname.replace(/^www\./, '')
    if (providerId === 'google') return host === 'google.com'
    if (providerId === 'bing') return host === 'bing.com'
    if (providerId === 'baidu') {
      if (host !== 'baidu.com') return false
      return !parsedUrl.pathname.startsWith('/link')
    }
    return false
  } catch {
    return true
  }
}

function isLikelyNavigationResult(providerId, title, url) {
  const normalizedTitle = title.replace(/\s+/g, '').toLowerCase()
  if (!normalizedTitle) return true

  const navigationTitles = new Set([
    '登录',
    '新闻',
    '地图',
    '图片',
    '视频',
    '贴吧',
    '知道',
    '文库',
    '百科',
    '学术',
    '更多',
    '设置',
    '帮助',
    '企业推广',
    'hao123',
  ])
  if (navigationTitles.has(normalizedTitle)) return true

  try {
    const parsedUrl = new URL(url)
    const host = parsedUrl.hostname.replace(/^www\./, '').toLowerCase()
    if (providerId === 'baidu') {
      return (
        host === 'hao123.com' ||
        host === 'passport.baidu.com' ||
        host === 'map.baidu.com' ||
        host === 'news.baidu.com' ||
        host === 'voice.baidu.com' ||
        host === 'help.baidu.com' ||
        host === 'e.baidu.com' ||
        host === 'top.baidu.com' ||
        host === 'image.baidu.com' ||
        host === 'tieba.baidu.com' ||
        host === 'wenku.baidu.com'
      )
    }
    if (providerId === 'google') {
      return host === 'accounts.google.com' || host === 'support.google.com'
    }
    if (providerId === 'bing') {
      return host === 'login.live.com' || host === 'account.microsoft.com'
    }
    return false
  } catch {
    return true
  }
}

function cleanHtmlText(value) {
  return decodeHtml(
    String(value ?? '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ').trim()
}

function cleanSnippetText(value, title) {
  const normalizedTitle = title.trim()
  const text = String(value ?? '')
    .replace(normalizedTitle, '')
    .replace(/网页快照|百度快照|翻译此页|Cached|Translate this page/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (text.length < 8) return ''
  return text.slice(0, 360)
}

function normalizeForCompare(value) {
  return String(value ?? '').replace(/\s+/g, '').toLowerCase()
}

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
}

function isHttpUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}
