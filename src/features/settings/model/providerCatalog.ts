import type {
  ProviderConfig,
  ProviderModelCapability,
  ProviderModelConfig,
  ProviderType,
} from '@/shared/types'
import {
  getModelCapabilities,
  hasModelCapability,
  normalizeModelCapabilities,
} from '@/shared/model/providerModelCapabilities'
import { createId } from '@/shared/utils/identity'
import { nowIso } from '@/shared/utils/time'

interface ProviderDefinition {
  type: ProviderType
  name: string
  baseUrl: string
  models: Array<{
    id: string
    capabilities?: ProviderModelCapability[]
    group?: string
    name?: string
  }>
}

export const PROVIDER_TYPE_LABELS: Record<ProviderType, string> = {
  openai: 'OpenAI',
  deepseek: '深度求索',
  volcengine: '火山引擎',
  moonshot: '月之暗面',
  minimax: 'MiniMax',
  dashscope: '阿里云百炼',
  zai: 'Z.ai',
  siliconflow: '硅基流动',
  custom: '自定义',
}

export const BUILT_IN_PROVIDER_DEFINITIONS: ProviderDefinition[] = [
  {
    type: 'deepseek',
    name: '深度求索',
    baseUrl: 'https://api.deepseek.com',
    models: [
      {
        id: 'deepseek-v4-flash',
        group: 'deepseek-v4',
        capabilities: ['chat', 'reasoning', 'function-call'],
      },
      {
        id: 'deepseek-v4-pro',
        group: 'deepseek-v4',
        capabilities: ['chat', 'reasoning', 'function-call'],
      },
    ],
  },
  {
    type: 'volcengine',
    name: '火山引擎',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3/',
    models: [
      {
        id: 'doubao-seed-1-8-251228',
        group: 'doubao-seed',
        name: 'Doubao-Seed-1.8',
        capabilities: ['chat', 'reasoning', 'vision', 'function-call'],
      },
    ],
  },
  {
    type: 'moonshot',
    name: '月之暗面',
    baseUrl: 'https://api.moonshot.cn',
    models: [
      {
        id: 'moonshot-v1-auto',
        group: 'moonshot',
        capabilities: ['chat', 'function-call'],
      },
      {
        id: 'kimi-k2.6',
        group: 'kimi',
        name: 'Kimi K2.6',
        capabilities: ['chat', 'reasoning', 'function-call'],
      },
    ],
  },
  {
    type: 'minimax',
    name: 'MiniMax',
    baseUrl: 'https://api.minimaxi.com/v1/',
    models: [
      {
        id: 'MiniMax-M3',
        group: 'MiniMax',
        capabilities: ['chat', 'reasoning', 'function-call'],
      },
      {
        id: 'MiniMax-M2.7',
        group: 'MiniMax',
        capabilities: ['chat', 'reasoning', 'function-call'],
      },
    ],
  },
  {
    type: 'dashscope',
    name: '阿里云百炼',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/',
    models: [
      {
        id: 'qwen3.7-plus',
        group: 'qwen3',
        name: 'Qwen3.7 Plus',
        capabilities: ['chat', 'reasoning', 'function-call'],
      },
      {
        id: 'qwen3.5-plus',
        group: 'qwen3',
        name: 'Qwen3.5 Plus',
        capabilities: ['chat', 'reasoning', 'vision', 'function-call'],
      },
      {
        id: 'qwen3-max',
        group: 'qwen3',
        name: 'Qwen3 Max',
        capabilities: ['chat', 'reasoning', 'function-call'],
      },
      {
        id: 'text-embedding-v4',
        group: 'text-embedding',
        name: 'Text Embedding V4',
        capabilities: ['embedding'],
      },
      {
        id: 'gte-rerank-v2',
        group: 'text-embedding',
        name: 'GTE Rerank V2',
        capabilities: ['embedding', 'rerank'],
      },
    ],
  },
  {
    type: 'zai',
    name: 'Z.ai',
    baseUrl: 'https://api.z.ai/api/paas/v4/',
    models: [
      {
        id: 'glm-5',
        group: 'glm',
        capabilities: ['chat', 'reasoning', 'function-call'],
      },
      {
        id: 'glm-4.7',
        group: 'glm',
        capabilities: ['chat', 'reasoning', 'function-call'],
      },
      {
        id: 'glm-4.6',
        group: 'glm',
        capabilities: ['chat', 'reasoning', 'function-call'],
      },
    ],
  },
  {
    type: 'siliconflow',
    name: '硅基流动',
    baseUrl: 'https://api.siliconflow.cn/v1',
    models: [
      {
        id: 'deepseek-ai/DeepSeek-V3.2',
        group: 'deepseek-ai',
        capabilities: ['chat', 'reasoning', 'function-call'],
      },
      {
        id: 'Qwen/Qwen3-8B',
        group: 'Qwen',
        capabilities: ['chat', 'reasoning', 'function-call'],
      },
    ],
  },
]

export const PROVIDER_TYPE_OPTIONS = [
  'openai',
  'deepseek',
  'volcengine',
  'moonshot',
  'minimax',
  'dashscope',
  'zai',
  'siliconflow',
  'custom',
] as const satisfies ProviderType[]

export function createProviderFromDefinition(
  definition: ProviderDefinition,
): ProviderConfig {
  const at = nowIso()
  const models = createModelConfigs(definition.models)

  return {
    id: createId(),
    name: definition.name,
    type: definition.type,
    baseUrl: definition.baseUrl,
    apiKey: '',
    model: models[0]?.id ?? '',
    models,
    enabled: false,
    createdAt: at,
    updatedAt: at,
  }
}

export function createProviderFromType(
  type: ProviderType,
  name = PROVIDER_TYPE_LABELS[type],
): ProviderConfig {
  const definition = BUILT_IN_PROVIDER_DEFINITIONS.find(
    (item) => item.type === type,
  )
  const provider = definition
    ? createProviderFromDefinition(definition)
    : createProviderFromDefinition({
        type,
        name,
        baseUrl: 'https://api.openai.com',
        models: [{ id: 'gpt-4.1-mini' }],
      })

  return normalizeProviderConfig({
    ...provider,
    name: name.trim() || provider.name,
  })
}

export function createBuiltInProviders() {
  return BUILT_IN_PROVIDER_DEFINITIONS.map(createProviderFromDefinition)
}

export function mergeBuiltInProviderModels(provider: ProviderConfig): ProviderConfig {
  const definition = BUILT_IN_PROVIDER_DEFINITIONS.find(
    (item) => item.type === provider.type,
  )
  const normalized = normalizeProviderConfig(provider)
  if (!definition) return normalized

  const mergedModels = new Map(
    (normalized.models ?? []).map((model) => [model.id, model]),
  )

  for (const builtInModel of createModelConfigs(definition.models)) {
    const existingModel = mergedModels.get(builtInModel.id)
    mergedModels.set(
      builtInModel.id,
      existingModel
        ? {
            ...builtInModel,
            ...existingModel,
            capabilities: normalizeModelCapabilities([
              ...(builtInModel.capabilities ?? []),
              ...(existingModel.capabilities ?? []),
            ]),
            group: existingModel.group ?? builtInModel.group,
            name: existingModel.name ?? builtInModel.name,
          }
        : builtInModel,
    )
  }

  return normalizeProviderConfig({
    ...normalized,
    models: Array.from(mergedModels.values()),
  })
}

export function normalizeProviderConfig(provider: ProviderConfig): ProviderConfig {
  const hasExplicitModels = provider.models !== undefined
  const models = normalizeModelConfigs(
    hasExplicitModels
      ? provider.models ?? []
      : provider.model
        ? [{ id: provider.model, enabled: true }]
        : [],
  )
  const model =
    models.find((item) => item.enabled)?.id ??
    models[0]?.id ??
    (hasExplicitModels ? '' : provider.model)

  return {
    ...provider,
    type: provider.type ?? 'custom',
    enabled: provider.enabled ?? true,
    order: provider.order,
    model,
    models,
  }
}

export function getProviderModelConfig(provider: ProviderConfig) {
  const normalized = normalizeProviderConfig(provider)
  return (
    normalized.models?.find((model) => model.id === normalized.model) ??
    normalized.models?.[0]
  )
}

export function hasProviderModelCapability(
  provider: ProviderConfig | undefined,
  capability: ProviderModelCapability,
) {
  if (!provider) return false
  return hasModelCapability(getProviderModelConfig(provider), capability)
}

export function deriveSelectableProviders(
  providers: ProviderConfig[],
): ProviderConfig[] {
  return providers.flatMap((provider) => {
    const normalized = normalizeProviderConfig(provider)
    if (!normalized.enabled) return []

    return normalized.models
      ?.filter((model) => model.enabled)
      .map((model) => ({
        ...normalized,
        id: buildSelectableProviderId(normalized.id, model.id),
        sourceProviderId: normalized.id,
        name: `${normalized.name} · ${model.name || model.id}`,
        model: model.id,
        models: [{ ...model, enabled: true }],
      })) ?? []
  })
}

export function buildSelectableProviderId(providerId: string, modelId: string) {
  return `${providerId}::${encodeURIComponent(modelId)}`
}

function createModelConfigs(
  models: Array<{
    id: string
    capabilities?: ProviderModelCapability[]
    group?: string
    name?: string
  }>,
): ProviderModelConfig[] {
  return normalizeModelConfigs(
    models.map((model) => ({
      id: model.id,
      capabilities: model.capabilities,
      group: model.group,
      name: model.name,
      enabled: true,
    })),
  )
}

function normalizeModelConfigs(
  models: ProviderModelConfig[],
): ProviderModelConfig[] {
  const seen = new Set<string>()
  return models.reduce<ProviderModelConfig[]>((result, model) => {
    const id = model.id.trim()
    if (!id || seen.has(id)) return result
    seen.add(id)
    result.push({
      id,
      capabilities: getModelCapabilities({ ...model, id }),
      group: model.group?.trim() || undefined,
      name: model.name?.trim() || undefined,
      enabled: model.enabled !== false,
    })
    return result
  }, [])
}
