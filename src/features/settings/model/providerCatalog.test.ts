import { describe, expect, it, vi } from 'vitest'
import type { ProviderConfig } from '@/shared/types'
import {
  buildSelectableProviderId,
  createProviderFromType,
  deriveSelectableProviders,
  hasProviderModelCapability,
  normalizeProviderConfig,
} from './providerCatalog'

vi.mock('@/shared/utils/identity', () => ({
  createId: vi.fn(() => 'provider-id'),
}))

describe('provider catalog', () => {
  it('creates provider defaults from type', () => {
    const provider = createProviderFromType('dashscope', '百炼')

    expect(provider).toMatchObject({
      id: 'provider-id',
      name: '百炼',
      type: 'dashscope',
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/',
      enabled: false,
      model: 'qwen3.7-plus',
    })
    expect(provider.models?.map((model) => model.id)).toContain('qwen3.7-plus')
  })

  it('normalizes legacy single-model providers', () => {
    const provider = normalizeProviderConfig({
      id: 'legacy',
      name: 'Legacy',
      baseUrl: 'https://api.example.com',
      apiKey: 'key',
      model: 'old-model',
      createdAt: 'now',
      updatedAt: 'now',
    })

    expect(provider.enabled).toBe(true)
    expect(provider.type).toBe('custom')
    expect(provider.models).toEqual([
      {
        id: 'old-model',
        capabilities: ['chat'],
        group: undefined,
        name: undefined,
        enabled: true,
      },
    ])
  })

  it('normalizes explicit empty model lists without restoring legacy model', () => {
    const provider = normalizeProviderConfig({
      id: 'p',
      name: 'Provider',
      baseUrl: 'https://api.example.com',
      apiKey: 'key',
      model: 'removed-model',
      models: [],
      createdAt: 'now',
      updatedAt: 'now',
    })

    expect(provider.model).toBe('')
    expect(provider.models).toEqual([])
  })

  it('deduplicates and trims model configs', () => {
    const provider = normalizeProviderConfig({
      id: 'p',
      name: 'Provider',
      baseUrl: 'https://api.example.com',
      apiKey: 'key',
      model: '',
      models: [
        {
          id: ' model-a ',
          name: ' Model A ',
          capabilities: ['chat', 'chat', 'reasoning'],
          enabled: true,
        },
        { id: 'model-a', enabled: false },
        { id: ' ', enabled: true },
        { id: 'model-b', group: ' ChatGPT ', enabled: false },
      ],
      createdAt: 'now',
      updatedAt: 'now',
      order: 3,
    })

    expect(provider.model).toBe('model-a')
    expect(provider.order).toBe(3)
    expect(provider.models).toEqual([
      {
        id: 'model-a',
        capabilities: ['chat', 'reasoning'],
        group: undefined,
        name: 'Model A',
        enabled: true,
      },
      {
        id: 'model-b',
        capabilities: ['chat'],
        group: 'ChatGPT',
        name: undefined,
        enabled: false,
      },
    ])
  })

  it('keeps built-in model capability labels from the registry', () => {
    const provider = createProviderFromType('dashscope', '百炼')

    expect(
      provider.models?.find((model) => model.id === 'text-embedding-v4')
        ?.capabilities,
    ).toEqual(['embedding'])
    expect(
      provider.models?.find((model) => model.id === 'gte-rerank-v2')
        ?.capabilities,
    ).toEqual(['embedding', 'rerank'])
    expect(
      provider.models?.find((model) => model.id === 'qwen3.7-plus')
        ?.capabilities,
    ).toContain('reasoning')
    expect(
      provider.models?.find((model) => model.id === 'qwen3.7-plus')
        ?.capabilities,
    ).toContain('vision')
  })

  it('creates custom fallback providers from type', () => {
    const provider = createProviderFromType('custom', '我的服务')

    expect(provider).toMatchObject({
      name: '我的服务',
      type: 'custom',
      baseUrl: 'https://api.openai.com',
      model: 'gpt-4.1-mini',
    })
  })

  it('derives selectable chat providers from enabled models', () => {
    const provider: ProviderConfig = {
      id: 'p1',
      name: 'Deep',
      type: 'deepseek',
      baseUrl: 'https://api.deepseek.com',
      apiKey: 'key',
      model: 'deepseek-v4-flash',
      enabled: true,
      models: [
        { id: 'deepseek-v4-flash', enabled: true },
        { id: 'deepseek-v4-pro', enabled: false },
      ],
      createdAt: 'now',
      updatedAt: 'now',
    }

    expect(deriveSelectableProviders([provider])).toEqual([
      expect.objectContaining({
        id: buildSelectableProviderId('p1', 'deepseek-v4-flash'),
        sourceProviderId: 'p1',
        name: 'Deep · deepseek-v4-flash',
        model: 'deepseek-v4-flash',
        models: [
          expect.objectContaining({
            id: 'deepseek-v4-flash',
            capabilities: ['chat', 'reasoning', 'function-call'],
          }),
        ],
      }),
    ])
  })

  it('checks capabilities on selectable provider models', () => {
    const [embeddingProvider] = deriveSelectableProviders([
      { ...createProviderFromType('dashscope', '百炼'), enabled: true },
    ]).filter((provider) => provider.model === 'text-embedding-v4')

    expect(hasProviderModelCapability(embeddingProvider, 'embedding')).toBe(true)
    expect(hasProviderModelCapability(embeddingProvider, 'rerank')).toBe(false)
  })

  it('does not derive providers when provider is disabled', () => {
    expect(
      deriveSelectableProviders([
        {
          id: 'p',
          name: 'Provider',
          baseUrl: 'https://api.example.com',
          apiKey: 'key',
          model: 'model',
          enabled: false,
          createdAt: 'now',
          updatedAt: 'now',
        },
      ]),
    ).toEqual([])
  })
})
