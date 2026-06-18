import { requestCompletionStream } from '@/shared/api/ai'
import type { CompletionMessage, ProviderConfig, ThinkingMode } from '@/shared/types'

interface FullPromptOptimizationInput {
  instruction: string
  onUpdate?: (text: string) => void
  promptMarkdown: string
  provider: ProviderConfig
  systemPrompt?: string
  thinkingMode?: ThinkingMode
}

interface SelectionPromptOptimizationInput extends FullPromptOptimizationInput {
  selectedText: string
}

const baseSystemPrompt = [
  '你是提示词优化助手。',
  '你必须保留用户提示词的真实意图，只做清晰度、结构、约束和可执行性的优化。',
  '只输出最终可替换文本，不要解释，不要寒暄，不要使用 Markdown 代码块包裹结果。',
].join('\n')

export async function optimizeFullPrompt({
  instruction,
  onUpdate,
  promptMarkdown,
  provider,
  systemPrompt,
  thinkingMode = 'off',
}: FullPromptOptimizationInput) {
  const result = await requestVisibleOptimizationStream(
    provider,
    buildFullPromptOptimizationMessages({ instruction, promptMarkdown, systemPrompt }),
    thinkingMode,
    onUpdate,
  )

  return result
}

export async function optimizeSelectedPromptText({
  instruction,
  onUpdate,
  promptMarkdown,
  provider,
  selectedText,
  systemPrompt,
  thinkingMode = 'off',
}: SelectionPromptOptimizationInput) {
  const result = await requestVisibleOptimizationStream(
    provider,
    buildSelectionPromptOptimizationMessages({
      instruction,
      promptMarkdown,
      selectedText,
      systemPrompt,
    }),
    thinkingMode,
    onUpdate,
  )

  return result
}

export function buildFullPromptOptimizationMessages({
  instruction,
  promptMarkdown,
  systemPrompt,
}: Omit<FullPromptOptimizationInput, 'provider'>): CompletionMessage[] {
  return [
    {
      role: 'system',
      content: buildSystemPrompt(systemPrompt),
    },
    {
      role: 'user',
      content: [
        '请根据用户要求优化整张提示词卡片。',
        '最终只输出优化后的完整提示词，不能输出解释、标题或代码块围栏。',
        '',
        '当前完整提示词：',
        fence(promptMarkdown),
        '',
        '用户优化要求：',
        instruction.trim(),
      ].join('\n'),
    },
  ]
}

export function buildSelectionPromptOptimizationMessages({
  instruction,
  promptMarkdown,
  selectedText,
  systemPrompt,
}: Omit<SelectionPromptOptimizationInput, 'provider'>): CompletionMessage[] {
  return [
    {
      role: 'system',
      content: buildSystemPrompt(systemPrompt),
    },
    {
      role: 'user',
      content: [
        '请根据完整提示词上下文，只优化用户选中的片段。',
        '最终只输出优化后的选中片段文本，不能输出整张提示词、解释、标题或代码块围栏。',
        '',
        '当前完整提示词：',
        fence(promptMarkdown),
        '',
        '需要替换的选中片段：',
        fence(selectedText),
        '',
        '用户优化要求：',
        instruction.trim(),
      ].join('\n'),
    },
  ]
}

export function normalizeOptimizationOutput(output: string) {
  const trimmed = stripThinkingBlocks(output).trim()
  const fenced = trimmed.match(/^```[a-zA-Z0-9_-]*\s*\n([\s\S]*?)\n?```$/)
  const normalized = (fenced?.[1] ?? trimmed).trim()
  if (!normalized) throw new Error('模型返回为空')
  return normalized
}

export function stripThinkingBlocks(content: string) {
  const marker = '<think>'
  const closeMarker = '</think>'
  const lowerContent = content.toLowerCase()
  let cursor = 0
  let result = ''

  while (cursor < content.length) {
    const start = lowerContent.indexOf(marker, cursor)
    if (start === -1) {
      result += trimPossibleOpeningThinkTag(content.slice(cursor))
      break
    }

    result += content.slice(cursor, start)
    const bodyStart = start + marker.length
    const end = lowerContent.indexOf(closeMarker, bodyStart)
    if (end === -1) break
    cursor = end + closeMarker.length
  }

  return result
}

async function requestVisibleOptimizationStream(
  provider: ProviderConfig,
  messages: CompletionMessage[],
  thinkingMode: ThinkingMode,
  onUpdate?: (text: string) => void,
) {
  let rawText = ''
  let visibleText = ''
  const streamedText = await requestCompletionStream(
    provider,
    messages,
    {
      onText: (chunk) => {
        rawText += chunk
        const nextVisibleText = stripThinkingBlocks(rawText)
        if (nextVisibleText === visibleText) return
        visibleText = nextVisibleText
        onUpdate?.(visibleText)
      },
      onThinking: () => undefined,
    },
    thinkingMode,
  )
  if (!rawText && streamedText) rawText = streamedText

  const result = normalizeOptimizationOutput(rawText)
  onUpdate?.(result)
  return result
}

function trimPossibleOpeningThinkTag(text: string) {
  const marker = '<think>'
  const lowerText = text.toLowerCase()
  for (let length = marker.length - 1; length > 0; length -= 1) {
    if (lowerText.endsWith(marker.slice(0, length))) {
      return text.slice(0, -length)
    }
  }
  return text
}

function buildSystemPrompt(systemPrompt?: string) {
  const customPrompt = systemPrompt?.trim()
  return customPrompt ? `${customPrompt}\n\n${baseSystemPrompt}` : baseSystemPrompt
}

function fence(value: string) {
  return `<<<PROMPT_TEXT\n${value.trim()}\nPROMPT_TEXT`
}
