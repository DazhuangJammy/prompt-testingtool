import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/shared/storage/db'
import type { WebSearchSettings } from '@/shared/types'
import { webSearchSettingsRepository } from './webSearchSettingsRepository'

vi.mock('@/shared/storage/db', () => ({
  db: {
    webSearchSettings: {
      get: vi.fn(),
      put: vi.fn(),
    },
  },
}))

describe('webSearchSettingsRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns normalized stored settings', async () => {
    vi.mocked(db.webSearchSettings.get).mockResolvedValue({
      id: 'web-search',
      defaultProviderId: 'tavily',
      maxResults: 999,
      providers: [
        {
          id: 'tavily',
          name: 'Tavily',
          type: 'api',
          enabled: true,
          apiHost: ' https://api.tavily.com ',
          apiKeys: [' key ', 'key'],
        },
      ],
      createdAt: 'now',
      updatedAt: 'now',
    } as WebSearchSettings)

    const settings = await webSearchSettingsRepository.get()

    expect(settings?.maxResults).toBe(10)
    expect(settings?.providers.find((provider) => provider.id === 'tavily')?.apiKeys)
      .toEqual(['key'])
  })

  it('saves normalized settings', async () => {
    await webSearchSettingsRepository.save({
      id: 'web-search',
      defaultProviderId: 'bing',
      searchWithTime: true,
      maxResults: 0,
      excludeDomains: ['https://example.com/page'],
      compression: { method: 'cutoff', cutoffLimit: 100000 },
      providers: [],
      createdAt: 'created',
      updatedAt: 'old',
    })

    expect(db.webSearchSettings.put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'web-search',
        maxResults: 1,
        excludeDomains: ['example.com'],
        compression: { method: 'cutoff', cutoffLimit: 12000 },
        updatedAt: expect.any(String),
      }),
    )
  })

  it('creates default settings when missing', async () => {
    vi.mocked(db.webSearchSettings.get).mockResolvedValue(undefined)

    const settings = await webSearchSettingsRepository.ensure()

    expect(settings.defaultProviderId).toBe('bing')
    expect(db.webSearchSettings.put).toHaveBeenCalledWith(settings)
  })
})
