import {
  findPromptInputSources,
  type PromptInputSource,
} from '@/features/input-card/model/inputCard'
import type { CanvasEdge, InputCard, PromptCard } from '@/shared/types'

export function resolveChatInputSources({
  canvasEdges,
  inputCards,
  promptCards,
}: {
  canvasEdges: CanvasEdge[]
  inputCards: InputCard[]
  promptCards: PromptCard[]
}): PromptInputSource[] {
  return promptCards.flatMap((promptCard) =>
    findPromptInputSources({
      edges: canvasEdges,
      inputCards,
      promptCard,
    }),
  )
}
