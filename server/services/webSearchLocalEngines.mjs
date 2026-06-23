const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36'

export async function searchLocalEngine({ provider, query, maxResults, signal, fetchText }) {
  const searchUrl = buildLocalSearchUrl(provider.id, query)
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

  return { results: parsedResults }
}

export function parseSearchHtml(providerId, html, query) {
  const anchorRegex = /<a\b[^>]*href=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi
  const results = []
  const seen = new Set()
  let match

  while ((match = anchorRegex.exec(html)) !== null) {
    const rawHref = decodeHtml(match[2])
    const title = cleanHtmlText(match[3])
    const url = normalizeSearchUrl(providerId, rawHref)
    if (!isHttpUrl(url) || !title || title.length < 2) continue
    if (isSearchEngineInternalUrl(providerId, url)) continue
    if (seen.has(url)) continue
    seen.add(url)
    results.push({
      title,
      content: title,
      url,
      sourceInput: query,
    })
    if (results.length >= 10) break
  }

  return results
}

function buildLocalSearchUrl(providerId, query) {
  if (providerId === 'google') {
    const url = new URL('https://www.google.com/search')
    url.searchParams.set('q', query)
    return url
  }
  if (providerId === 'baidu') {
    const url = new URL('https://www.baidu.com/s')
    url.searchParams.set('wd', query)
    return url
  }
  const url = new URL('https://www.bing.com/search')
  url.searchParams.set('q', query)
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
    const host = new URL(url).hostname.replace(/^www\./, '')
    if (providerId === 'google') return host === 'google.com'
    if (providerId === 'bing') return host === 'bing.com'
    if (providerId === 'baidu') return host === 'baidu.com'
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

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function isHttpUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}
