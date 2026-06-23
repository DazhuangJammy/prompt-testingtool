import type {
  WebSearchProviderConfig,
  WebSearchResponse,
  WebSearchSettings,
} from '@/shared/types'

export async function requestWebSearch(
  provider: WebSearchProviderConfig,
  settings: WebSearchSettings,
  query: string,
  signal?: AbortSignal,
): Promise<WebSearchResponse> {
  const response = await fetch('/api/web-search/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      provider,
      query,
      settings: {
        maxResults: settings.maxResults,
        excludeDomains: settings.excludeDomains,
        searchWithTime: settings.searchWithTime,
        compression: settings.compression,
      },
    }),
  })

  const payload = (await response.json().catch(() => null)) as
    | (WebSearchResponse & { error?: string })
    | null

  if (!response.ok || !payload) {
    throw new Error(payload?.error || '联网搜索失败')
  }

  return payload
}

export async function checkWebSearchProvider(
  provider: WebSearchProviderConfig,
  settings: WebSearchSettings,
) {
  const response = await fetch('/api/web-search/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, settings }),
  })

  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; message?: string; error?: string }
    | null

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || '检测失败')
  }

  return payload.message || '检测成功'
}
