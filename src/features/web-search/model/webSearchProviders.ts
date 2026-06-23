import type {
  WebSearchProviderConfig,
  WebSearchProviderId,
  WebSearchProviderType,
} from '@/shared/types'

interface WebSearchProviderPreset {
  id: WebSearchProviderId
  name: string
  type: WebSearchProviderType
  group: 'api' | 'local'
  apiHost: string
  requiresApiKey: boolean
  supported: boolean
  description: string
}

export const WEB_SEARCH_PROVIDER_PRESETS = [
  {
    id: 'tavily',
    name: 'Tavily',
    type: 'api',
    group: 'api',
    apiHost: 'https://api.tavily.com',
    requiresApiKey: true,
    supported: true,
    description: 'API 密钥',
  },
  {
    id: 'searxng',
    name: 'Searxng',
    type: 'api',
    group: 'api',
    apiHost: 'http://localhost:8080',
    requiresApiKey: false,
    supported: true,
    description: '自托管搜索',
  },
  {
    id: 'exa',
    name: 'Exa',
    type: 'api',
    group: 'api',
    apiHost: 'https://api.exa.ai',
    requiresApiKey: true,
    supported: true,
    description: 'API 密钥',
  },
  {
    id: 'exa-mcp',
    name: 'ExaMCP',
    type: 'mcp',
    group: 'api',
    apiHost: 'https://mcp.exa.ai/mcp',
    requiresApiKey: false,
    supported: false,
    description: '当前项目未接入 MCP 搜索运行时',
  },
  {
    id: 'bocha',
    name: 'Bocha',
    type: 'api',
    group: 'api',
    apiHost: 'https://api.bochaai.com',
    requiresApiKey: true,
    supported: true,
    description: 'API 密钥',
  },
  {
    id: 'zhipu',
    name: 'Zhipu',
    type: 'api',
    group: 'api',
    apiHost: 'https://open.bigmodel.cn/api/paas/v4/web_search',
    requiresApiKey: true,
    supported: true,
    description: 'API 密钥',
  },
  {
    id: 'querit',
    name: 'Querit',
    type: 'api',
    group: 'api',
    apiHost: 'https://api.querit.ai',
    requiresApiKey: true,
    supported: true,
    description: 'API 密钥',
  },
  {
    id: 'jina',
    name: 'Jina',
    type: 'api',
    group: 'api',
    apiHost: 'https://s.jina.ai',
    requiresApiKey: false,
    supported: true,
    description: '搜索 / 读取',
  },
  {
    id: 'google',
    name: 'Google',
    type: 'local',
    group: 'local',
    apiHost: 'https://www.google.com/search',
    requiresApiKey: false,
    supported: true,
    description: '免费，受搜索页可用性影响',
  },
  {
    id: 'bing',
    name: 'Bing',
    type: 'local',
    group: 'local',
    apiHost: 'https://www.bing.com/search',
    requiresApiKey: false,
    supported: true,
    description: '免费，受搜索页可用性影响',
  },
  {
    id: 'baidu',
    name: 'Baidu',
    type: 'local',
    group: 'local',
    apiHost: 'https://www.baidu.com/s',
    requiresApiKey: false,
    supported: true,
    description: '免费，受搜索页可用性影响',
  },
] as const satisfies readonly WebSearchProviderPreset[]

export const WEB_SEARCH_PROVIDER_LABELS = new Map(
  WEB_SEARCH_PROVIDER_PRESETS.map((provider) => [provider.id, provider.name]),
)

export function getWebSearchProviderPreset(id: WebSearchProviderId) {
  return WEB_SEARCH_PROVIDER_PRESETS.find((provider) => provider.id === id)
}

export function createWebSearchProviderConfig(
  preset: WebSearchProviderPreset,
  order: number,
): WebSearchProviderConfig {
  return {
    id: preset.id,
    name: preset.name,
    type: preset.type,
    enabled: preset.supported,
    apiHost: preset.apiHost,
    apiKeys: [],
    engines: preset.id === 'searxng' ? ['google', 'bing'] : undefined,
    basicAuthUsername: '',
    basicAuthPassword: '',
    order,
  }
}

export function providerRequiresApiKey(providerId: WebSearchProviderId) {
  return Boolean(getWebSearchProviderPreset(providerId)?.requiresApiKey)
}

export function isWebSearchProviderSupported(providerId: WebSearchProviderId) {
  return Boolean(getWebSearchProviderPreset(providerId)?.supported)
}

export function getWebSearchProviderGroupLabel(group: 'api' | 'local') {
  return group === 'api' ? 'API 服务商' : '本地搜索'
}
