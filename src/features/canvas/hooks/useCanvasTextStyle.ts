import { useCallback, useState } from 'react'
import { canvasRepository } from '@/features/canvas/infrastructure/canvasRepository'
import {
  clampTextFontSize,
  defaultTextStyle,
  type CanvasTextStyle,
} from '@/features/canvas/model/textStyle'
import type { CanvasTextNode } from '@/shared/types'

export function useCanvasTextStyle({
  canvasId,
  selectedNodeIds,
  textNodes,
}: {
  canvasId?: string
  selectedNodeIds: string[]
  textNodes: CanvasTextNode[]
}) {
  const [textStyle, setTextStyle] = useState<CanvasTextStyle>(defaultTextStyle)
  const selectedTextNode = textNodes.find((node) => selectedNodeIds.includes(node.id))
  const activeTextStyle = selectedTextNode
    ? {
        backgroundColor: selectedTextNode.backgroundColor,
        color: selectedTextNode.color,
        fontSize: selectedTextNode.fontSize,
      }
    : textStyle

  const updateTextStyle = useCallback(
    (updates: Partial<CanvasTextStyle>) => {
      const normalizedUpdates = {
        ...updates,
        ...(updates.fontSize === undefined
          ? {}
          : { fontSize: clampTextFontSize(updates.fontSize) }),
      }
      const nextStyle = {
        ...textStyle,
        ...normalizedUpdates,
      }
      setTextStyle(nextStyle)

      if (selectedTextNode) {
        void canvasRepository
          .updateTextNode(selectedTextNode.id, normalizedUpdates)
          .then(() => (canvasId ? canvasRepository.touchCanvas(canvasId) : undefined))
      }
    },
    [canvasId, selectedTextNode, textStyle],
  )

  return {
    activeTextStyle,
    canStyleText: Boolean(selectedTextNode),
    setTextStyle,
    textStyle,
    updateTextStyle,
  }
}
