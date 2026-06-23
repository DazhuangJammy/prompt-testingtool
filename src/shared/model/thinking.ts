import type { ProviderConfig, ThinkingMode } from '@/shared/types'
import { hasModelCapability } from './providerModelCapabilities'

export interface ThinkingOption {
  mode: ThinkingMode
  label: string
  description: string
}

export const THINKING_OPTIONS: ThinkingOption[] = [
  {
    mode: 'auto',
    label: '默认',
    description: '依赖模型默认行为，不作任何配置',
  },
  {
    mode: 'off',
    label: '关闭',
    description: '禁用推理',
  },
  {
    mode: 'light',
    label: '浮想',
    description: '低强度推理',
  },
  {
    mode: 'on',
    label: '斟酌',
    description: '中强度推理',
  },
  {
    mode: 'deep',
    label: '沉思',
    description: '高强度推理',
  },
]

export function splitThinkingBlock(content: string) {
  const match = content.match(/^\s*<think>([\s\S]*?)(?:<\/think>|$)/)
  if (!match) return { answer: content, thinking: '' }

  return {
    answer: content.slice(match[0].length).trimStart(),
    thinking: match[1].trim(),
  }
}

export function formatThinkingSeconds(durationMs?: number) {
  if (!durationMs) return ''
  const seconds = Math.max(1, Math.round(durationMs / 1000))
  if (seconds < 60) return `${seconds}s`

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) {
    return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}

export function formatGenerationDuration(durationMs?: number) {
  const seconds = formatThinkingSeconds(durationMs)
  return seconds ? ` · ${seconds}` : ''
}

export function formatMessageTime(createdAt: string) {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getThinkingCapability(provider?: ProviderConfig) {
  const providerModel =
    provider?.models?.find((model) => model.id === provider.model) ??
    provider?.models?.[0]
  const supportsTaggedThinking = hasModelCapability(providerModel, 'reasoning')
  const model = provider?.model.toLowerCase() ?? ''
  const name = provider?.name.toLowerCase() ?? ''
  const baseUrl = provider?.baseUrl?.toLowerCase() ?? ''
  const target = `${name} ${baseUrl} ${model}`
  const isMiniMax = target.includes('minimax')
  const isQwen = target.includes('qwen') || target.includes('dashscope')
  const supportsThinking =
    supportsTaggedThinking ||
    isQwen ||
    target.includes('deepseek') ||
    target.includes('kimi') ||
    target.includes('moonshot') ||
    isMiniMax
  const defaultMode = supportsThinking
    ? isMiniMax
      ? ('off' as const)
      : ('auto' as const)
    : ('off' as const)

  return {
    supportsThinking,
    defaultMode,
    supportsDeepMode:
      isQwen ||
      target.includes('deepseek') ||
      target.includes('kimi') ||
      target.includes('moonshot'),
  }
}

export function normalizeThinkingMode(
  provider: ProviderConfig | undefined,
  mode: ThinkingMode,
): ThinkingMode {
  const capability = getThinkingCapability(provider)
  if (!capability.supportsThinking) return 'off'
  if ((mode === 'deep' || mode === 'light') && !capability.supportsDeepMode) {
    return 'on'
  }
  return mode
}

export function getThinkingOption(mode: ThinkingMode) {
  return THINKING_OPTIONS.find((option) => option.mode === mode) ?? THINKING_OPTIONS[0]
}
