import { describe, expect, it } from 'vitest'
import {
  createDefaultWebSearchSettings,
  isRunnableProvider,
  normalizeWebSearchSettings,
  resolveActiveWebSearchProvider,
} from './webSearchSettings'
import {
  getWebSearchProviderGroupLabel,
  isWebSearchProviderSupported,
  providerRequiresApiKey,
} from './webSearchProviders'

describe('webSearchSettings', () => {
  it('creates all preset providers with Bing as the default free provider', () => {
    const settings = createDefaultWebSearchSettings()

    expect(settings.defaultProviderId).toBe('bing')
    expect(settings.providers.some((provider) => provider.id === 'tavily')).toBe(true)
    expect(settings.providers.some((provider) => provider.id === 'baidu')).toBe(true)
  })

  it('falls back to a runnable provider when the default requires a missing key', () => {
    const settings = normalizeWebSearchSettings({
      defaultProviderId: 'tavily',
      providers: [
        {
          id: 'tavily',
          name: 'Tavily',
          type: 'api',
          enabled: true,
          apiHost: 'https://api.tavily.com',
          apiKeys: [],
        },
        {
          id: 'bing',
          name: 'Bing',
          type: 'local',
          enabled: true,
          apiHost: 'https://www.bing.com/search',
          apiKeys: [],
        },
      ],
    })

    expect(resolveActiveWebSearchProvider(settings)?.id).toBe('bing')
  })

  it('normalizes domains, compression and unsupported providers', () => {
    const settings = normalizeWebSearchSettings({
      defaultProviderId: 'exa-mcp',
      excludeDomains: ['https://Example.com/path', '  '],
      compression: { method: 'cutoff', cutoffLimit: 50 },
      providers: [
        {
          id: 'exa-mcp',
          name: 'ExaMCP',
          type: 'mcp',
          enabled: true,
          apiHost: 'https://mcp.exa.ai/mcp',
          apiKeys: [],
        },
      ],
    })

    expect(settings.excludeDomains).toEqual(['example.com'])
    expect(settings.compression.cutoffLimit).toBe(200)
    expect(settings.providers.find((provider) => provider.id === 'exa-mcp')?.enabled)
      .toBe(false)
  })

  it('exposes provider metadata helpers', () => {
    expect(providerRequiresApiKey('tavily')).toBe(true)
    expect(providerRequiresApiKey('bing')).toBe(false)
    expect(isWebSearchProviderSupported('exa-mcp')).toBe(false)
    expect(getWebSearchProviderGroupLabel('api')).toBe('API 服务商')
    expect(isRunnableProvider(undefined)).toBe(false)
  })
})
