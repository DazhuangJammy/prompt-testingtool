import { useCallback, type MouseEvent } from 'react'
import { canvasRepository } from '@/features/canvas/infrastructure/canvasRepository'
import {
  createCanvasShapeNode,
  createCanvasTextNode,
} from '@/features/canvas/model/canvasElements'
import { isShapeTool } from '@/features/canvas/model/canvasTools'
import type { CanvasTool } from '@/features/canvas/model/flowTypes'
import type { CanvasTextStyle } from '@/features/canvas/model/textStyle'
import { dispatchCanvasCommitActiveEdit } from '@/shared/model/canvasEditEvents'
import type { CanvasPoint, PromptCard } from '@/shared/types'

interface UseCanvasPaneClickOptions {
  activeTool: CanvasTool
  canvasId?: string
  topicSessionId?: string
  textStyle: CanvasTextStyle
  onActivateShortcuts: () => void
  onAddPrompt: (position?: PromptCard['position'], topicSessionId?: string) => void
  onClearSelection: () => void
  onSelectTool: (tool: CanvasTool) => void
  screenToFlowPosition: (position: CanvasPoint) => CanvasPoint
}

export function useCanvasPaneClick({
  activeTool,
  canvasId,
  onActivateShortcuts,
  onAddPrompt,
  onClearSelection,
  onSelectTool,
  screenToFlowPosition,
  textStyle,
  topicSessionId,
}: UseCanvasPaneClickOptions) {
  return useCallback(
    (event: MouseEvent) => {
      if (!canvasId) return
      dispatchCanvasCommitActiveEdit()
      onActivateShortcuts()
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      if (activeTool === 'prompt') {
        onAddPrompt(position, topicSessionId)
        onSelectTool('select')
        return
      }

      if (isShapeTool(activeTool)) {
        void canvasRepository.saveShapeNode(
          createCanvasShapeNode(canvasId, activeTool, position, topicSessionId),
        )
        onSelectTool('select')
        return
      }

      if (activeTool === 'text') {
        void canvasRepository.saveTextNode(
          createCanvasTextNode(canvasId, position, textStyle, topicSessionId),
        )
        onSelectTool('select')
        return
      }

      if (activeTool === 'select') onClearSelection()
    },
    [
      activeTool,
      canvasId,
      onActivateShortcuts,
      onAddPrompt,
      onClearSelection,
      onSelectTool,
      screenToFlowPosition,
      textStyle,
      topicSessionId,
    ],
  )
}
