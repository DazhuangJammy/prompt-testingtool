import type { Node } from '@xyflow/react'
import type { PromptCard } from '@/shared/types'

export interface PromptNodeData extends Record<string, unknown> {
  card: PromptCard
  selectedCardId?: string
  onSelect: (id: string) => void
  onChange: (card: PromptCard) => void
}

export type PromptFlowNode = Node<PromptNodeData, 'promptCard'>
