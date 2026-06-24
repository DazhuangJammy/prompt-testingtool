export const WEB_SEARCH_PROVIDER_IDS = [
  'tavily',
  'searxng',
  'exa',
  'exa-mcp',
  'bocha',
  'zhipu',
  'querit',
  'jina',
  'google',
  'bing',
  'baidu',
] as const

export type WebSearchProviderId = (typeof WEB_SEARCH_PROVIDER_IDS)[number]
export type WebSearchProviderType = 'api' | 'local' | 'mcp'
export type WebSearchCapability = 'searchKeywords' | 'fetchUrls'
export type WebSearchCompressionMethod = 'none' | 'cutoff'

export interface WebSearchProviderConfig {
  id: WebSearchProviderId
  name: string
  type: WebSearchProviderType
  enabled: boolean
  apiHost: string
  apiKeys: string[]
  engines?: string[]
  basicAuthUsername?: string
  basicAuthPassword?: string
  order?: number
}

export interface WebSearchCompressionConfig {
  method: WebSearchCompressionMethod
  cutoffLimit: number
}

export interface WebSearchSettings {
  id: 'web-search'
  defaultProviderId?: WebSearchProviderId
  searchWithTime: boolean
  maxResults: number
  excludeDomains: string[]
  compression: WebSearchCompressionConfig
  providers: WebSearchProviderConfig[]
  createdAt: string
  updatedAt: string
}

export interface WebSearchResult {
  title: string
  content: string
  url: string
  sourceInput: string
}

export interface WebSearchResponse {
  query: string
  providerId: WebSearchProviderId
  providerName: string
  results: WebSearchResult[]
}

export interface WebSearchReference extends WebSearchResult {
  providerId: WebSearchProviderId
  providerName: string
}

export interface WebSearchStreamStatus {
  phase: 'preparing' | 'searching' | 'complete' | 'error'
  query?: string
  providerName?: string
  count?: number
  message?: string
}

export interface CompletionWebSearchToolConfig {
  providerId?: WebSearchProviderId
  settings?: WebSearchSettings
}
