import type {
  ProviderModelCapability,
  ProviderModelConfig,
} from '@/shared/types'

export const MODEL_CAPABILITY_OPTIONS = [
  'chat',
  'reasoning',
  'embedding',
  'rerank',
  'vision',
  'function-call',
] as const satisfies ProviderModelCapability[]

export const MODEL_CAPABILITY_LABELS: Record<ProviderModelCapability, string> = {
  chat: '对话',
  reasoning: '推理',
  embedding: '嵌入',
  rerank: '重排',
  vision: '视觉',
  'function-call': '工具',
}

export function getModelCapabilities(
  model: Pick<ProviderModelConfig, 'capabilities' | 'id' | 'name'>,
): ProviderModelCapability[] {
  return normalizeModelCapabilities(
    model.capabilities?.length
      ? model.capabilities
      : inferModelCapabilities(model.id, model.name),
  )
}

export function hasModelCapability(
  model: Pick<ProviderModelConfig, 'capabilities' | 'id' | 'name'> | undefined,
  capability: ProviderModelCapability,
) {
  return Boolean(model && getModelCapabilities(model).includes(capability))
}

export function inferModelCapabilities(
  id: string,
  name?: string,
): ProviderModelCapability[] {
  const target = `${id} ${name ?? ''}`.toLowerCase()
  const capabilities = new Set<ProviderModelCapability>()
  const isEmbedding =
    /\bembed(ding)?\b/.test(target) ||
    target.includes('text-embedding') ||
    target.includes('bge-') ||
    target.includes('e5-')
  const isRerank =
    /\brerank(er|ing)?\b/.test(target) ||
    target.includes('gte-rerank') ||
    target.includes('bge-reranker')
  const isVision =
    target.includes('vision') ||
    target.includes('-vl') ||
    target.includes('vl-') ||
    target.includes('qvq') ||
    target.includes('omni')
  const isReasoning =
    target.includes('reasoner') ||
    target.includes('reasoning') ||
    target.includes('thinking') ||
    target.includes('deepseek') ||
    target.includes('qwen3') ||
    target.includes('qwq') ||
    target.includes('qvq') ||
    target.includes('kimi') ||
    target.includes('glm-4.6') ||
    target.includes('glm-4.7') ||
    target.includes('glm-5') ||
    target.includes('minimax-m')

  if (isEmbedding) capabilities.add('embedding')
  if (isRerank) capabilities.add('rerank')
  if (isVision) capabilities.add('vision')
  if (!isEmbedding && !isRerank) capabilities.add('chat')
  if (isReasoning && !isEmbedding && !isRerank) capabilities.add('reasoning')
  if (!isEmbedding && !isRerank) capabilities.add('function-call')

  return Array.from(capabilities)
}

export function normalizeModelCapabilities(
  capabilities: readonly ProviderModelCapability[] | undefined,
): ProviderModelCapability[] {
  const seen = new Set<ProviderModelCapability>()
  return (capabilities ?? []).reduce<ProviderModelCapability[]>(
    (result, capability) => {
      if (!MODEL_CAPABILITY_OPTIONS.includes(capability) || seen.has(capability)) {
        return result
      }
      seen.add(capability)
      result.push(capability)
      return result
    },
    [],
  )
}
