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

export const MODEL_TAG_CAPABILITY_ORDER = [
  'vision',
  'reasoning',
  'function-call',
  'embedding',
  'rerank',
] as const satisfies ProviderModelCapability[]

export function getModelCapabilities(
  model: Pick<ProviderModelConfig, 'capabilities' | 'id' | 'name'>,
): ProviderModelCapability[] {
  const inferredCapabilities = inferModelCapabilities(model.id, model.name)
  const explicitCapabilities = normalizeModelCapabilities(model.capabilities)
  return orderCapabilities(
    normalizeModelCapabilities([
      ...explicitCapabilities,
      ...inferredCapabilities,
    ]),
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
  const ids = [id, name].filter(Boolean) as string[]
  const isEmbedding = ids.some(inferEmbeddingFromModelId)
  const isRerank = ids.some(inferRerankFromModelId)
  const isImageGeneration = ids.some(inferImageGenerationFromModelId)
  const isNonChatModel = isEmbedding || isRerank || isImageGeneration
  const capabilities = new Set<ProviderModelCapability>()

  if (!isNonChatModel) capabilities.add('chat')
  if (!isNonChatModel && ids.some(inferReasoningFromModelId)) {
    capabilities.add('reasoning')
  }
  if (isEmbedding) capabilities.add('embedding')
  if (isRerank) capabilities.add('rerank')
  if (!isNonChatModel && ids.some(inferVisionFromModelId)) {
    capabilities.add('vision')
  }
  if (!isNonChatModel && ids.some(inferFunctionCallingFromModelId)) {
    capabilities.add('function-call')
  }

  return orderCapabilities(Array.from(capabilities))
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

export function getVisibleModelCapabilityTags(
  capabilities: readonly ProviderModelCapability[],
): ProviderModelCapability[] {
  return MODEL_TAG_CAPABILITY_ORDER.filter((capability) =>
    capabilities.includes(capability),
  )
}

function orderCapabilities(capabilities: readonly ProviderModelCapability[]) {
  return MODEL_CAPABILITY_OPTIONS.filter((capability) =>
    capabilities.includes(capability),
  )
}

function getLowerBaseModelName(id: string, delimiter = '/') {
  const normalizedId = id.toLowerCase().startsWith('accounts/fireworks/models/')
    ? id.replace(/(\d)p(?=\d)/g, '$1.')
    : id
  const segments = normalizedId.split(delimiter)
  let baseModelName = (segments[segments.length - 1] ?? '').toLowerCase()
  if (baseModelName.endsWith(':free')) {
    baseModelName = baseModelName.replace(':free', '')
  }
  if (baseModelName.endsWith('(free)')) {
    baseModelName = baseModelName.replace('(free)', '')
  }
  if (baseModelName.endsWith(':cloud')) {
    baseModelName = baseModelName.replace(':cloud', '')
  }
  return baseModelName
}

function inferReasoningFromModelId(rawModelId: string) {
  const id = getLowerBaseModelName(rawModelId)
  return (
    REASONING_REGEX.test(id) ||
    inferClaudeReasoningFromId(id) ||
    inferGeminiReasoningFromId(id) ||
    inferQwenReasoningFromId(id) ||
    inferDoubaoReasoningFromId(id) ||
    inferOpenAIReasoningFromId(id) ||
    id.includes('hunyuan-t1') ||
    id.includes('hunyuan-a13b') ||
    /glm-?5|glm-4\.[567]|glm-z1/.test(id) ||
    /mimo-v2\.5(?:-pro)?(?!-)|mimo-v2-(?:flash|pro|omni)/.test(id) ||
    /^kimi-k2-thinking(?:-turbo)?$|^kimi-k(?:2\.[5-9]\d*|[3-9]\d*(?:\.\d+)?)(?:-[\w-]+)?$/.test(
      id,
    ) ||
    id.includes('magistral') ||
    id.includes('mistral-small-2603') ||
    id.includes('grok-build') ||
    id.includes('pangu-pro-moe') ||
    id.includes('seed-oss') ||
    id.includes('deepseek-v3.2-speciale') ||
    id.includes('gemma-4') ||
    id.includes('gemma4') ||
    id.includes('step-3') ||
    id.includes('step-r1-v-mini') ||
    ['minimax-m1', 'minimax-m2', 'minimax-m2.1', 'minimax-m3'].some((model) =>
      id.includes(model),
    ) ||
    id === 'baichuan-m2' ||
    id === 'baichuan-m3' ||
    ['ring-1t', 'ring-mini', 'ring-flash'].some((model) => id.includes(model)) ||
    id.includes('sonar-deep-research') ||
    inferDeepSeekHybridFromId(id)
  )
}

function inferOpenAIReasoningFromId(id: string) {
  if (id.includes('o1') && !id.includes('o1-preview') && !id.includes('o1-mini')) {
    return true
  }
  if (id.includes('o3') && !id.includes('o3-mini')) return true
  if (id.startsWith('o3') || id.startsWith('o4')) return true
  if (id.includes('gpt-oss')) return true
  if (id.includes('gpt-5') && !id.includes('chat')) return true
  return false
}

function inferClaudeReasoningFromId(id: string) {
  return (
    id.includes('claude-3-7-sonnet') ||
    id.includes('claude-3.7-sonnet') ||
    id.includes('claude-sonnet-4') ||
    id.includes('claude-opus-4') ||
    id.includes('claude-haiku-4')
  )
}

function inferGeminiReasoningFromId(id: string) {
  if (id.startsWith('gemini') && id.includes('thinking')) return true
  if (!GEMINI_THINKING_MODEL_REGEX.test(id)) return false
  if (id.includes('gemini-3-pro-image')) return true
  return !id.includes('image') && !id.includes('tts')
}

function inferQwenReasoningFromId(id: string) {
  if (id.startsWith('qwen3') && id.includes('thinking')) return true
  if (id.includes('qwq') || id.includes('qvq')) return true
  if (
    ['coder', 'asr', 'tts', 'reranker', 'embedding', 'instruct', 'thinking'].some(
      (fragment) => id.includes(fragment),
    )
  ) {
    return false
  }
  if (/^qwen3\.[5-9]/.test(id)) return true
  if (/^(?:qwen3-max(?!-2025-09-23)|qwen-max-latest)(?:-|$)/i.test(id)) {
    return true
  }
  if (/^qwen(?:3\.[5-9])?-(?:plus|flash|turbo)(?:-|$)/i.test(id)) {
    return true
  }
  return /^qwen3-\d/i.test(id)
}

function inferDoubaoReasoningFromId(id: string) {
  return DOUBAO_THINKING_MODEL_REGEX.test(id) || REASONING_REGEX.test(id)
}

function inferDeepSeekHybridFromId(id: string) {
  return (
    /(\w+-)?deepseek-v3(?:\.\d|-\d)(?:(\.|-)(?!speciale$)\w+)?$/.test(id) ||
    id.includes('deepseek-chat-v3.1') ||
    id.includes('deepseek-chat') ||
    /deepseek-v(?:[4-9]\d*|[1-9]\d{1,})(?:\.\d+)?(?:-[\w]+)*(?=$|[:/])/i.test(
      id,
    )
  )
}

function inferVisionFromModelId(rawModelId: string) {
  const id = getLowerBaseModelName(rawModelId)
  if (/^qwen(?:3\.[5-9]-?max|[-]?max)(?:-|$)?/.test(id)) return false
  return VISION_REGEX.test(id) || IMAGE_ENHANCEMENT_REGEX.test(id)
}

function inferEmbeddingFromModelId(rawModelId: string) {
  const id = getLowerBaseModelName(rawModelId)
  if (RERANKING_REGEX.test(id)) return false
  return EMBEDDING_REGEX.test(id)
}

function inferRerankFromModelId(rawModelId: string) {
  return RERANKING_REGEX.test(getLowerBaseModelName(rawModelId))
}

function inferFunctionCallingFromModelId(rawModelId: string) {
  const id = getLowerBaseModelName(rawModelId)
  if (EMBEDDING_REGEX.test(id)) return false
  if (RERANKING_REGEX.test(id)) return false
  if (DEDICATED_IMAGE_MODEL_REGEX.test(id)) return false
  return FUNCTION_CALLING_REGEX.test(id)
}

function inferImageGenerationFromModelId(rawModelId: string) {
  const id = getLowerBaseModelName(rawModelId)
  return DEDICATED_IMAGE_MODEL_REGEX.test(id) || IMAGE_ENHANCEMENT_REGEX.test(id)
}

const REASONING_REGEX =
  /^(?!.*-non-reasoning\b)(o\d+(?:-[\w-]+)?|.*\b(?:reasoning|reasoner|thinking|think)\b.*|.*-[rR]\d+.*|.*\bqwq(?:-[\w-]+)?\b.*|.*\bhunyuan-t1(?:-[\w-]+)?\b.*|.*\bglm-zero-preview\b.*|.*\bgrok-(?:3-mini|4|4-fast)(?:-[\w-]+)?\b.*)$/i

const GEMINI_THINKING_MODEL_REGEX =
  /gemini-(?:2\.5.*(?:-latest)?|3(?:\.\d+)?-(?:flash|pro)(?:-preview)?|flash-latest|pro-latest|flash-lite-latest)(?:-[\w-]+)*$/i

const DOUBAO_THINKING_MODEL_REGEX =
  /doubao-(?:1[.-]5-thinking-vision-pro|1[.-]5-thinking-pro-m|seed-1[.-][68](?:-flash)?(?!-(?:thinking)(?:-|$))|seed-code(?:-preview)?(?:-\d+)?|seed-2[.-]0(?:-[\w-]+)?)(?:-[\w-]+)*/i

const EMBEDDING_REGEX =
  /(?:^text-|embed|bge-|e5-|llm2vec|retrieval|uae-|gte-|jina-clip|jina-embeddings|voyage-)/i

const RERANKING_REGEX = /(?:rerank|re-rank|re-ranker|re-ranking|retrieval|retriever)/i

const DEDICATED_IMAGE_MODELS = [
  'dall-e(?:-[\\w-]+)?',
  'gpt-image(?:-[\\w-]+)?',
  'grok-2-image(?:-[\\w-]+)?',
  'imagen(?:-[\\w-]+)?',
  'flux(?:-[\\w-]+)?',
  'stable-?diffusion(?:-[\\w-]+)?',
  'stabilityai(?:-[\\w-]+)?',
  'sd-[\\w-]+',
  'sdxl(?:-[\\w-]+)?',
  'cogview(?:-[\\w-]+)?',
  'qwen-image(?:-[\\w-]+)?',
  'janus(?:-[\\w-]+)?',
  'midjourney(?:-[\\w-]+)?',
  'mj-[\\w-]+',
  'z-image(?:-[\\w-]+)?',
  'longcat-image(?:-[\\w-]+)?',
  'hunyuanimage(?:-[\\w-]+)?',
  'seedream(?:-[\\w-]+)?',
  'kandinsky(?:-[\\w-]+)?',
]

const DEDICATED_IMAGE_MODEL_REGEX = new RegExp(
  DEDICATED_IMAGE_MODELS.join('|'),
  'i',
)

const IMAGE_ENHANCEMENT_MODELS = [
  'grok-2-image(?:-[\\w-]+)?',
  'qwen-image-edit',
  'gpt-image-1',
  'gemini-2.5-flash-image(?:-[\\w-]+)?',
  'gemini-2.0-flash-preview-image-generation',
  'gemini-3(?:\\.\\d+)?-(?:flash|pro)-image(?:-[\\w-]+)?',
]

const IMAGE_ENHANCEMENT_REGEX = new RegExp(
  IMAGE_ENHANCEMENT_MODELS.join('|'),
  'i',
)

const visionAllowedModels = [
  'llava',
  'moondream',
  'minicpm',
  'gemini-1\\.5',
  'gemini-2\\.0',
  'gemini-2\\.5',
  'gemini-3(?:\\.\\d)?-(?:flash|pro)(?:-preview)?',
  'gemini-(flash|pro|flash-lite)-latest',
  'gemini-exp',
  'claude-3',
  'claude-haiku-4',
  'claude-sonnet-4',
  'claude-opus-4',
  'vision',
  'glm-4(?:\\.\\d+)?v(?:-[\\w-]+)?',
  'qwen-vl',
  'qwen2-vl',
  'qwen2.5-vl',
  'qwen3-vl',
  'qwen3\\.[5-9](?:-[\\w-]+)?',
  'qwen2.5-omni',
  'qwen3-omni(?:-[\\w-]+)?',
  'qvq',
  'internvl2',
  'grok-vision-beta',
  'grok-4(?:-[\\w-]+)?',
  'pixtral',
  'gpt-4(?:-[\\w-]+)',
  'gpt-4.1(?:-[\\w-]+)?',
  'gpt-4o(?:-[\\w-]+)?',
  'gpt-4.5(?:-[\\w-]+)',
  'gpt-5(?:-[\\w-]+)?',
  'chatgpt-4o(?:-[\\w-]+)?',
  'o1(?:-[\\w-]+)?',
  'o3(?:-[\\w-]+)?',
  'o4(?:-[\\w-]+)?',
  'deepseek-vl(?:[\\w-]+)?',
  'kimi-k2\\.[56](?:-[\\w-]+)?',
  'kimi-latest',
  'gemma-?[3-4](?:[-.\\w]+)?',
  'doubao-seed-1[.-][68](?:-[\\w-]+)?',
  'doubao-seed-2[.-]0(?:-[\\w-]+)?',
  'doubao-seed-code(?:-[\\w-]+)?',
  'kimi-thinking-preview',
  'gemma3(?:[-:\\w]+)?',
  'kimi-vl-a3b-thinking(?:-[\\w-]+)?',
  'llama-guard-4(?:-[\\w-]+)?',
  'llama-4(?:-[\\w-]+)?',
  'step-1o(?:.*vision)?',
  'step-1v(?:-[\\w-]+)?',
  'qwen-omni(?:-[\\w-]+)?',
  'mistral-large-(2512|latest)',
  'mistral-medium-(2508|latest)',
  'mistral-small-(2506|2603|latest)',
  'mimo-v2\\.5(?!-)',
  'mimo-v2-omni(?:-[\\w-]+)?',
  'glm-5v-turbo',
]

const visionExcludedModels = [
  'gpt-4-\\d+-preview',
  'gpt-4-turbo-preview',
  'gpt-4-32k',
  'gpt-4-\\d+',
  'o1-mini',
  'o3-mini',
  'o1-preview',
  'aidc-ai/marco-o1',
]

const VISION_REGEX = new RegExp(
  `\\b(?!(?:${visionExcludedModels.join('|')})\\b)(${visionAllowedModels.join(
    '|',
  )})\\b`,
  'i',
)

const FUNCTION_CALLING_ALLOWED_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4',
  'gpt-4.5',
  'gpt-oss(?:-[\\w-]+)?',
  'gpt-5(?:-[0-9-]+)?',
  'o(1|3|4)(?:-[\\w-]+)?',
  'claude',
  'qwen',
  'qwen3',
  'hunyuan',
  'deepseek',
  'glm-4(?:-[\\w-]+)?',
  'glm-4.5(?:-[\\w-]+)?',
  'glm-4.7(?:-[\\w-]+)?',
  'glm-5(?:-[\\w-]+)?',
  'learnlm(?:-[\\w-]+)?',
  'gemini(?:-[\\w-]+)?',
  'gemma-?4(?:[-.\\w]+)?',
  'grok-3(?:-[\\w-]+)?',
  'grok-4(?:-[\\w-]+)?',
  'doubao-seed-1[.-][68](?:-[\\w-]+)?',
  'doubao-seed-2[.-]0(?:-[\\w-]+)?',
  'doubao-seed-code(?:-[\\w-]+)?',
  'kimi-k2(?:-[\\w-]+)?',
  'ling-\\w+(?:-[\\w-]+)?',
  'ring-\\w+(?:-[\\w-]+)?',
  'minimax-m[23](?:\\.\\d+)?(?:-[\\w-]+)?',
  'mimo-v2\\.5(?:-pro)?(?!-)',
  'mimo-v2-flash',
  'mimo-v2-pro',
  'mimo-v2-omni',
  'glm-5v-turbo',
]

const FUNCTION_CALLING_EXCLUDED_MODELS = [
  'aqa(?:-[\\w-]+)?',
  'imagen(?:-[\\w-]+)?',
  'o1-mini',
  'o1-preview',
  'aidc-ai/marco-o1',
  'gemini-1(?:\\.[\\w-]+)?',
  'qwen-mt(?:-[\\w-]+)?',
  'gpt-5-chat(?:-[\\w-]+)?',
  'glm-4\\.5v',
  'gemini-2.5-flash-image(?:-[\\w-]+)?',
  'gemini-2.0-flash-preview-image-generation',
  'gemini-3(?:\\.\\d+)?-pro-image(?:-[\\w-]+)?',
  'deepseek-v3.2-speciale',
  'deepseek-r1(?:[-:][\\w.-]+)?',
]

const FUNCTION_CALLING_REGEX = new RegExp(
  `\\b(?!(?:${FUNCTION_CALLING_EXCLUDED_MODELS.join(
    '|',
  )})\\b)(?:${FUNCTION_CALLING_ALLOWED_MODELS.join('|')})\\b`,
  'i',
)
