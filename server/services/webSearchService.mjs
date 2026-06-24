import { searchLocalEngine } from './webSearchLocalEngines.mjs'
import { fetchPageSnippet } from './webSearchPageSnippetService.mjs'

const SEARCH_TIMEOUT_MS = 8000

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36'

export const searchWeb = async ({ provider, query, settings, signal }) => {
  const normalizedQuery = normalizeQuery(query, settings?.searchWithTime)
  const maxResults = clampInteger(settings?.maxResults, 1, 10, 5)
  const excludeDomains = normalizeDomains(settings?.excludeDomains)
  const result = await runProviderSearch({
    provider,
    query: normalizedQuery,
    maxResults,
    signal,
  })
  const filteredResults = result.results
    .filter((item) => item.url && !isExcludedUrl(item.url, excludeDomains))
    .slice(0, maxResults)

  return {
    query: normalizedQuery,
    providerId: provider.id,
    providerName: provider.name,
    results: filteredResults,
  }
}

export const checkWebSearch = async ({ provider, settings, signal }) => {
  const response = await searchWeb({
    provider,
    settings: { ...settings, maxResults: 1, searchWithTime: false },
    query: 'test query',
    signal,
  })

  if (!response.results.length) {
    throw new Error('服务商没有返回搜索结果')
  }
}

async function runProviderSearch({ provider, query, maxResults, signal }) {
  switch (provider?.id) {
    case 'tavily':
      return searchTavily(provider, query, maxResults, signal)
    case 'exa':
      return searchExa(provider, query, maxResults, signal)
    case 'bocha':
      return searchBocha(provider, query, maxResults, signal)
    case 'zhipu':
      return searchZhipu(provider, query, maxResults, signal)
    case 'querit':
      return searchQuerit(provider, query, maxResults, signal)
    case 'jina':
      return searchJina(provider, query, maxResults, signal)
    case 'searxng':
      return searchSearxng(provider, query, maxResults, signal)
    case 'google':
    case 'bing':
    case 'baidu':
      return searchLocalEngine({
        provider,
        query,
        maxResults,
        signal,
        fetchPageSnippet,
        fetchText,
      })
    case 'exa-mcp':
      throw new Error('当前项目未接入 ExaMCP 搜索运行时')
    default:
      throw new Error(`未知搜索服务商：${provider?.id ?? 'unknown'}`)
  }
}

async function searchTavily(provider, query, maxResults, signal) {
  const payload = await fetchJson(resolveProviderUrl(provider, '/search'), {
    method: 'POST',
    signal,
    headers: {
      Authorization: `Bearer ${resolveApiKey(provider)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, max_results: maxResults }),
    errorPrefix: 'Tavily search failed',
  })

  return {
    results: normalizeApiResults(payload.results, query, {
      title: 'title',
      content: 'content',
      url: 'url',
    }),
  }
}

async function searchExa(provider, query, maxResults, signal) {
  const payload = await fetchJson(resolveProviderUrl(provider, '/search'), {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': resolveApiKey(provider),
    },
    body: JSON.stringify({
      query,
      numResults: maxResults,
      contents: { text: true },
    }),
    errorPrefix: 'Exa search failed',
  })

  return {
    results: normalizeApiResults(payload.results, query, {
      title: 'title',
      content: 'text',
      url: 'url',
    }),
  }
}

async function searchBocha(provider, query, maxResults, signal) {
  const payload = await fetchJson(resolveProviderUrl(provider, '/v1/web-search'), {
    method: 'POST',
    signal,
    headers: {
      Authorization: `Bearer ${resolveApiKey(provider)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      count: maxResults,
      exclude: '',
      summary: true,
    }),
    errorPrefix: 'Bocha search failed',
  })

  if (payload.code && payload.code !== 200) {
    throw new Error(`Bocha search failed: ${payload.msg ?? payload.code}`)
  }

  return {
    results: normalizeApiResults(payload.data?.webPages?.value, query, {
      title: 'name',
      content: ['summary', 'snippet'],
      url: 'url',
    }),
  }
}

async function searchZhipu(provider, query, _maxResults, signal) {
  const payload = await fetchJson(resolveProviderUrl(provider), {
    method: 'POST',
    signal,
    headers: {
      Authorization: `Bearer ${resolveApiKey(provider)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      search_query: query,
      search_engine: 'search_std',
      search_intent: false,
    }),
    errorPrefix: 'Zhipu search failed',
  })

  return {
    results: normalizeApiResults(payload.search_result, query, {
      title: 'title',
      content: 'content',
      url: 'link',
    }),
  }
}

async function searchQuerit(provider, query, maxResults, signal) {
  const payload = await fetchJson(resolveProviderUrl(provider, '/v1/search'), {
    method: 'POST',
    signal,
    headers: {
      Authorization: `Bearer ${resolveApiKey(provider)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, count: maxResults }),
    errorPrefix: 'Querit search failed',
  })

  if (payload.error_code && payload.error_code !== 200) {
    throw new Error(`Querit search failed: ${payload.error_msg ?? payload.error_code}`)
  }

  return {
    results: normalizeApiResults(payload.results?.result, query, {
      title: 'title',
      content: 'snippet',
      url: 'url',
    }),
  }
}

async function searchJina(provider, query, maxResults, signal) {
  const requestUrl = `${withoutTrailingSlash(resolveProviderUrl(provider))}/${encodeURIComponent(query)}`
  const headers = { Accept: 'application/json' }
  const apiKey = firstApiKey(provider)
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`

  const payload = await fetchJson(requestUrl, {
    method: 'GET',
    signal,
    headers,
    errorPrefix: 'Jina search failed',
  })
  const source = Array.isArray(payload.data) ? payload.data : payload.results

  return {
    results: normalizeApiResults(source, query, {
      title: 'title',
      content: ['content', 'description'],
      url: 'url',
    }).slice(0, maxResults),
  }
}

async function searchSearxng(provider, query, maxResults, signal) {
  const baseUrl = resolveProviderUrl(provider, '/search')
  const searchUrl = new URL(baseUrl)
  searchUrl.searchParams.set('q', query)
  searchUrl.searchParams.set('language', 'auto')
  searchUrl.searchParams.set('format', 'json')
  const engines = normalizeStringList(provider.engines)
  if (engines.length) searchUrl.searchParams.set('engines', engines.join(','))

  const payload = await fetchJson(searchUrl, {
    method: 'GET',
    signal,
    headers: getSearxngHeaders(provider),
    errorPrefix: 'Searxng search failed',
  })

  return {
    results: normalizeApiResults(payload.results, query, {
      title: 'title',
      content: ['content', 'snippet'],
      url: 'url',
    }).slice(0, maxResults),
  }
}

async function fetchJson(url, options) {
  const text = await fetchText(url, options)
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`${options.errorPrefix}: 返回不是 JSON`)
  }
}

async function fetchText(url, options) {
  const timeoutController = new AbortController()
  const timeout = setTimeout(() => timeoutController.abort(), SEARCH_TIMEOUT_MS)
  const signal = anySignal([options.signal, timeoutController.signal])

  try {
    const response = await fetch(url, {
      method: options.method,
      signal,
      redirect: 'follow',
      headers: {
        'user-agent': USER_AGENT,
        ...options.headers,
      },
      body: options.body,
    })
    const text = await response.text()
    if (!response.ok) {
      throw new Error(`${options.errorPrefix}: ${response.status} ${parseApiError(text) || response.statusText}`)
    }
    return text
  } finally {
    clearTimeout(timeout)
  }
}

function anySignal(signals) {
  const activeSignals = signals.filter(Boolean)
  if (!activeSignals.length) return undefined
  const controller = new AbortController()
  const abort = () => controller.abort()
  activeSignals.forEach((signal) => {
    if (signal.aborted) abort()
    else signal.addEventListener('abort', abort, { once: true })
  })
  return controller.signal
}

function normalizeApiResults(values, query, fields) {
  if (!Array.isArray(values)) return []
  return values
    .map((item) => ({
      title: normalizeText(readField(item, fields.title)),
      content: normalizeText(readField(item, fields.content)),
      url: normalizeText(readField(item, fields.url)),
      sourceInput: query,
    }))
    .filter((item) => item.url)
}

function readField(item, field) {
  if (Array.isArray(field)) {
    for (const key of field) {
      const value = readField(item, key)
      if (value) return value
    }
    return ''
  }
  return item?.[field] ?? ''
}

function resolveApiKey(provider) {
  const apiKey = firstApiKey(provider)
  if (!apiKey) throw new Error(`${provider.name} 缺少 API 密钥`)
  return apiKey
}

function firstApiKey(provider) {
  return normalizeStringList(provider?.apiKeys)[0] ?? ''
}

function resolveProviderUrl(provider, path = '') {
  const host = provider?.apiHost?.trim()
  if (!host) throw new Error(`${provider?.name ?? '搜索服务商'} 缺少 API 地址`)
  if (!path) return host
  return `${withoutTrailingSlash(host)}${path}`
}

function withoutTrailingSlash(value) {
  return String(value).replace(/\/+$/, '')
}

function getSearxngHeaders(provider) {
  const username = provider.basicAuthUsername?.trim()
  if (!username) return {}
  const password = provider.basicAuthPassword?.trim() ?? ''
  return {
    Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
  }
}

export function normalizeQuery(query, searchWithTime) {
  const trimmed = String(query ?? '').trim()
  if (!trimmed) throw new Error('搜索关键词不能为空')
  const keywords = buildSearchKeywords(trimmed)
  if (!searchWithTime) return keywords
  return `${keywords} ${formatLocalDate(new Date())}`
}

export function buildSearchKeywords(query) {
  const trimmed = normalizeText(query)
  const withoutIntent = stripSearchIntent(trimmed)
  const cleaned = withoutIntent
    .replace(/[?？!！。；;，,、]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (isAiNewsQuery(cleaned)) return 'AI 人工智能 新闻 最新'

  const currentQuery = cleaned
    .replace(/今天|今日/g, '最新')
    .replace(/现在|目前|当前/g, '')
    .replace(/有什么|有哪些|有没有|是什么|是啥|一下|一下子/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  const fallback = currentQuery || cleaned || trimmed
  return fallback.slice(0, 200)
}

function stripSearchIntent(value) {
  return value
    .replace(/^(请|麻烦)?(你)?(帮我|帮忙|给我|替我)?(搜索|搜一下|搜|查询|查一下|查查|查|找一下|找找|了解一下)\s*/i, '')
    .replace(/^(一下|下)\s*/i, '')
    .replace(/^关于\s*/i, '')
    .trim()
}

function isAiNewsQuery(value) {
  return /(\bai\b|人工智能|大模型)/i.test(value) && /(今天|今日|最新|最近|新闻|资讯|动态)/.test(value)
}

function formatLocalDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeDomains(values) {
  return normalizeStringList(values).map((value) =>
    value.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase(),
  )
}

function isExcludedUrl(url, excludeDomains) {
  if (!excludeDomains.length) return false
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    return excludeDomains.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    )
  } catch {
    return false
  }
}

function normalizeStringList(values) {
  if (!Array.isArray(values)) return []
  return values
    .filter((value) => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean)
}

function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function parseApiError(text) {
  try {
    const payload = JSON.parse(text)
    if (typeof payload.error === 'string') return payload.error
    if (payload.error?.message) return payload.error.message
    if (payload.message) return payload.message
  } catch {
    return text.slice(0, 160)
  }
  return ''
}

function clampInteger(value, min, max, fallback) {
  const number = Math.round(Number(value))
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, number))
}
