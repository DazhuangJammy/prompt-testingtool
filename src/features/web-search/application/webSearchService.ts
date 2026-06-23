import { requestWebSearch } from '@/shared/api/webSearch'
import type {
  WebSearchProviderId,
  WebSearchReference,
  WebSearchResponse,
  WebSearchSettings,
} from '@/shared/types'
import { createWebSearchContext } from '../model/webSearchContext'
import { resolvePreferredWebSearchProvider } from '../model/webSearchSettings'

export async function resolveChatWebSearchContext({
  query,
  providerId,
  settings,
  signal,
}: {
  query: string
  providerId?: WebSearchProviderId
  settings?: WebSearchSettings
  signal?: AbortSignal
}) {
  const trimmedQuery = query.trim()
  if (!trimmedQuery || !settings) return { context: '', references: [] }

  const provider = resolvePreferredWebSearchProvider(
    settings,
    providerId ?? settings.defaultProviderId,
  )
  if (!provider) {
    throw new Error('请先在设置里配置可用的网络搜索服务商')
  }

  const response = await requestWebSearch(provider, settings, trimmedQuery, signal)
  return createWebSearchContext(toReferences(response), settings)
}

function toReferences(response: WebSearchResponse): WebSearchReference[] {
  return response.results.map((result) => ({
    ...result,
    providerId: response.providerId,
    providerName: response.providerName,
  }))
}
