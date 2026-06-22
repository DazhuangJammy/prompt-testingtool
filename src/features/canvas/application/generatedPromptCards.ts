import { optimizeFullPrompt } from '@/features/prompt-card/application/promptOptimizationService'
import {
  createPromptCard,
  importMarkdownToPromptCard,
} from '@/features/prompt-card/model/prompt'
import { normalizeThinkingMode } from '@/shared/model/thinking'
import type {
  CanvasPoint,
  DefaultModelSettings,
  PromptCard,
  ProviderConfig,
} from '@/shared/types'
import {
  buildPromptNodeInstruction,
  type GeneratedFlowchartNode,
} from '../model/generatedFlowchart'
import { mapWithConcurrency } from './concurrentTasks'

export const generatedPromptConcurrency = 5

interface GenerateGeneratedPromptCardsInput {
  canvasId: string
  nodes: GeneratedFlowchartNode[]
  onCardCreated: (node: GeneratedFlowchartNode, card: PromptCard) => void
  onUpdate?: (cards: PromptCard[]) => void
  promptOptimizationProvider?: ProviderConfig
  promptOptimizationSettings?: DefaultModelSettings
  resolvePosition: (node: GeneratedFlowchartNode) => CanvasPoint
  signal?: AbortSignal
  topicSessionId?: string
}

export async function generateGeneratedPromptCards({
  canvasId,
  nodes,
  onCardCreated,
  onUpdate,
  promptOptimizationProvider,
  promptOptimizationSettings,
  resolvePosition,
  signal,
  topicSessionId,
}: GenerateGeneratedPromptCardsInput) {
  if (nodes.length && !promptOptimizationProvider) {
    throw new Error('请先在设置里配置提示词优化模型')
  }

  const pendingCards = nodes.map((node, index) => {
    const card = createPromptCard(
      canvasId,
      index,
      resolvePosition(node),
      topicSessionId,
    )
    const pendingCard = createGeneratedPromptCard(
      card,
      node,
      createPromptLoadingMarkdown(node),
    )
    onCardCreated(node, pendingCard)

    return pendingCard
  })

  if (pendingCards.length) onUpdate?.([...pendingCards])

  return mapWithConcurrency(
    nodes,
    generatedPromptConcurrency,
    async (node, index) => {
      const pendingCard = pendingCards[index]
      if (!promptOptimizationProvider) return pendingCard

      const markdown = await optimizeFullPrompt({
        instruction: buildPromptNodeInstruction(node),
        promptMarkdown: '',
        provider: promptOptimizationProvider,
        signal,
        systemPrompt: promptOptimizationSettings?.prompt,
        thinkingMode: normalizeThinkingMode(
          promptOptimizationProvider,
          promptOptimizationSettings?.thinkingMode ?? 'off',
        ),
      })

      const generatedCard = createGeneratedPromptCard(pendingCard, node, markdown)
      pendingCards[index] = generatedCard
      onUpdate?.([...pendingCards])

      return generatedCard
    },
  )
}

function createGeneratedPromptCard(
  card: PromptCard,
  node: GeneratedFlowchartNode,
  markdown: string,
) {
  return {
    ...importMarkdownToPromptCard(card, markdown),
    defaultCollapsed: true,
    title: node.title,
  }
}

export function createPromptLoadingMarkdown(node: GeneratedFlowchartNode) {
  return [
    '# 生成中',
    '',
    '- 正在根据流程节点生成完整提示词卡片',
    `- 节点：${node.title}`,
    '',
    '## 节点说明',
    '',
    node.body,
    '',
    '- 完成后会自动替换为可编辑的 Markdown 提示词',
  ].join('\n')
}
