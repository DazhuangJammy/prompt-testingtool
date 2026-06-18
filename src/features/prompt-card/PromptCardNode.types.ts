import type { Node } from '@xyflow/react'
import type { DefaultModelSettings, PromptCard, ProviderConfig } from '@/shared/types'

export interface PromptNodeData extends Record<string, unknown> {
  card: PromptCard
  promptOptimizationProvider?: ProviderConfig
  promptOptimizationSettings?: DefaultModelSettings
  selectedCardId?: string
  onSelect: (id: string) => void
  onChange: (card: PromptCard) => void
}

export type PromptFlowNode = Node<PromptNodeData, 'promptCard'>
