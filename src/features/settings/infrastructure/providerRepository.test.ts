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
      order: undefined,
      models: [
        {
          id: 'model',
          capabilities: ['chat', 'function-call'],
          group: undefined,
          name: undefined,
          enabled: true,
        },
      ],
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
        .mock.calls[0][0].filter((provider) => provider.type === 'deepseek'),
    ).toHaveLength(1)
  })

  it('syncs missing built-in models into existing providers', async () => {
    vi.mocked(db.providerConfigs.toArray).mockResolvedValue([
      {
        id: 'dashscope',
        name: '阿里云百炼',
        type: 'dashscope',
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/',
        apiKey: 'key',
        enabled: true,
        model: 'qwen3.7-plus',
        models: [{ id: 'qwen3.7-plus', enabled: true }],
        createdAt: 'now',
        updatedAt: 'now',
      } as ProviderConfig,
    ])

    await providerRepository.ensureBuiltInProviders()

    expect(db.providerConfigs.bulkPut).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'dashscope',
          models: expect.arrayContaining([
            expect.objectContaining({
              id: 'text-embedding-v4',
              capabilities: ['embedding'],
            }),
            expect.objectContaining({
              id: 'gte-rerank-v2',
              capabilities: ['embedding', 'rerank'],
            }),
          ]),
        }),
      ]),
    )
  })
})
