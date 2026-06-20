import { useMemo } from 'react'
import { useCanvasElements } from '@/features/canvas/hooks/useCanvasElements'
import { filterCanvasRecordsForTopic } from '@/shared/model/canvasTopicScope'
import type { PromptCard } from '@/shared/types'

export function useScopedCanvasRecords({
  canvasId,
  promptCardId,
  promptCards,
  sessionId,
  sessionCreatedAt,
}: {
  canvasId?: string
  promptCardId?: string
  promptCards: PromptCard[]
  sessionId?: string
  sessionCreatedAt?: string
}) {
  const {
    canvasEdges,
    imageNodes,
    shapeNodes,
    strokes,
    textNodes,
  } = useCanvasElements(canvasId)

  return useMemo(
    () =>
      filterCanvasRecordsForTopic({
        canvasEdges,
        canvasImageNodes: imageNodes,
        canvasShapeNodes: shapeNodes,
        canvasStrokes: strokes,
        canvasTextNodes: textNodes,
        promptCardId,
        promptCards,
        sessionId,
        sessionCreatedAt,
      }),
    [
      canvasEdges,
      imageNodes,
      promptCardId,
      promptCards,
      sessionId,
      sessionCreatedAt,
      shapeNodes,
      strokes,
      textNodes,
    ],
  )
}
