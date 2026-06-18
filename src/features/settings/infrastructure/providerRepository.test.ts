import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/shared/storage/db'
import { providerRepository } from './providerRepository'
import type { ProviderConfig } from '@/shared/types'

vi.mock('@/shared/storage/db', () => ({
  db: {
    providerConfigs: {
      bulkPut: vi.fn(),
      delete: vi.fn(),
      put: vi.fn(),
      toArray: vi.fn(),
    },
  },
}))

describe('provider repository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('normalizes, saves and deletes providers', async () => {
    const provider = {
      id: 'p',
      name: 'Provider',
      baseUrl: 'https://api.example.com',
      apiKey: 'key',
      model: 'model',
      createdAt: 'now',
      updatedAt: 'now',
    } as ProviderConfig

    await providerRepository.save(provider)
    await providerRepository.delete('p')

    expect(db.providerConfigs.put).toHaveBeenCalledWith({
      ...provider,
      enabled: true,
      type: 'custom',
      models: [{ id: 'model', enabled: true }],
    })
    expect(db.providerConfigs.delete).toHaveBeenCalledWith('p')
  })

  it('adds missing built-in providers', async () => {
    vi.mocked(db.providerConfigs.toArray).mockResolvedValue([
      {
        id: 'existing',
        name: '深度求索',
        type: 'deepseek',
      } as ProviderConfig,
    ])

    await providerRepository.ensureBuiltInProviders()

    expect(db.providerConfigs.bulkPut).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: '火山引擎', type: 'volcengine' }),
        expect.objectContaining({ name: '阿里云百炼', type: 'dashscope' }),
      ]),
    )
    expect(
      vi
        .mocked(db.providerConfigs.bulkPut)
        .mock.calls[0][0].some((provider) => provider.type === 'deepseek'),
    ).toBe(false)
  })
})
