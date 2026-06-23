import type {
  WebSearchProviderConfig,
  WebSearchProviderId,
  WebSearchSettings,
} from '@/shared/types'
import { nowIso } from '@/shared/utils/time'
import {
  WEB_SEARCH_PROVIDER_PRESETS,
  createWebSearchProviderConfig,
  getWebSearchProviderPreset,
  isWebSearchProviderSupported,
} from './webSearchProviders'

export const WEB_SEARCH_SETTINGS_ID = 'web-search'
export const DEFAULT_WEB_SEARCH_MAX_RESULTS = 5
export const MIN_WEB_SEARCH_MAX_RESULTS = 1
export const MAX_WEB_SEARCH_MAX_RESULTS = 10
export const DEFAULT_WEB_SEARCH_CUTOFF_LIMIT = 2000

export function createDefaultWebSearchSettings(): WebSearchSettings {
  const createdAt = nowIso()
  return {
    id: WEB_SEARCH_SETTINGS_ID,
    defaultProviderId: 'bing',
    searchWithTime: true,
    maxResults: DEFAULT_WEB_SEARCH_MAX_RESULTS,
    excludeDomains: [],
    compression: {
      method: 'none',
      cutoffLimit: DEFAULT_WEB_SEARCH_CUTOFF_LIMIT,
    },
    providers: WEB_SEARCH_PROVIDER_PRESETS.map(createWebSearchProviderConfig),
    createdAt,
    updatedAt: createdAt,
  }
}

export function normalizeWebSearchSettings(
  settings?: Partial<WebSearchSettings>,
): WebSearchSettings {
  const fallback = createDefaultWebSearchSettings()
  const incomingProviders = settings?.providers ?? []
  const providerById = new Map(incomingProviders.map((provider) => [provider.id, provider]))
  const providers = WEB_SEARCH_PROVIDER_PRESETS.map((preset, order) =>
    normalizeWebSearchProvider(
      {
        ...createWebSearchProviderConfig(preset, order),
        ...providerById.get(preset.id),
        id: preset.id,
        name: preset.name,
        type: preset.type,
        order: providerById.get(preset.id)?.order ?? order,
      },
      order,
    ),
  ).sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
  const defaultProviderId = normalizeDefaultProviderId(
    settings?.defaultProviderId,
    providers,
  )

  return {
    id: WEB_SEARCH_SETTINGS_ID,
    defaultProviderId,
    searchWithTime: settings?.searchWithTime ?? fallback.searchWithTime,
    maxResults: clampInteger(
      settings?.maxResults,
      MIN_WEB_SEARCH_MAX_RESULTS,
      MAX_WEB_SEARCH_MAX_RESULTS,
      DEFAULT_WEB_SEARCH_MAX_RESULTS,
    ),
    excludeDomains: normalizeDomainList(settings?.excludeDomains),
    compression: {
      method: settings?.compression?.method === 'cutoff' ? 'cutoff' : 'none',
      cutoffLimit: clampInteger(
        settings?.compression?.cutoffLimit,
        200,
        12000,
        DEFAULT_WEB_SEARCH_CUTOFF_LIMIT,
      ),
    },
    providers,
    createdAt: settings?.createdAt ?? fallback.createdAt,
    updatedAt: settings?.updatedAt ?? fallback.updatedAt,
  }
}

export function resolveActiveWebSearchProvider(settings: WebSearchSettings) {
  const normalized = normalizeWebSearchSettings(settings)
  return resolvePreferredWebSearchProvider(normalized, normalized.defaultProviderId)
}

export function resolvePreferredWebSearchProvider(
  settings: WebSearchSettings,
  preferredProviderId?: WebSearchProviderId,
) {
  const normalized = normalizeWebSearchSettings(settings)
  const preferred = normalized.providers.find(
    (provider) => provider.id === preferredProviderId,
  )
  if (isRunnableProvider(preferred)) return preferred
  const localFallbackOrder: WebSearchProviderId[] = ['bing', 'google', 'baidu']
  const localProvider = localFallbackOrder
    .map((providerId) =>
      normalized.providers.find((provider) => provider.id === providerId),
    )
    .find(isRunnableProvider)
  if (localProvider) return localProvider
  return normalized.providers.find(isRunnableProvider)
}

export function isRunnableProvider(provider?: WebSearchProviderConfig) {
  if (!provider?.enabled || !isWebSearchProviderSupported(provider.id)) return false
  const preset = getWebSearchProviderPreset(provider.id)
  if (!preset?.requiresApiKey) return true
  return provider.apiKeys.some((key) => key.trim())
}

function normalizeWebSearchProvider(
  provider: WebSearchProviderConfig,
  fallbackOrder: number,
): WebSearchProviderConfig {
  const preset = getWebSearchProviderPreset(provider.id)
  return {
    id: provider.id,
    name: preset?.name ?? provider.name,
    type: preset?.type ?? provider.type,
    enabled: preset?.supported ? Boolean(provider.enabled) : false,
    apiHost: provider.apiHost?.trim() || preset?.apiHost || '',
    apiKeys: Array.from(
      new Set((provider.apiKeys ?? []).map((key) => key.trim()).filter(Boolean)),
    ),
    engines: normalizeStringList(provider.engines),
    basicAuthUsername: provider.basicAuthUsername?.trim() ?? '',
    basicAuthPassword: provider.basicAuthPassword?.trim() ?? '',
    order: Number.isFinite(provider.order) ? provider.order : fallbackOrder,
  }
}

function normalizeDefaultProviderId(
  providerId: WebSearchProviderId | undefined,
  providers: WebSearchProviderConfig[],
) {
  if (providerId && providers.some((provider) => provider.id === providerId)) {
    return providerId
  }
  return providers.find((provider) => provider.id === 'bing')?.id ?? providers[0]?.id
}

function clampInteger(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
) {
  const number = typeof value === 'number' ? Math.round(value) : Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, number))
}

function normalizeDomainList(values: unknown) {
  if (!Array.isArray(values)) return []
  return normalizeStringList(values).map((value) =>
    value.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase(),
  )
}

function normalizeStringList(values: unknown) {
  if (!Array.isArray(values)) return []
  return values
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean)
}
