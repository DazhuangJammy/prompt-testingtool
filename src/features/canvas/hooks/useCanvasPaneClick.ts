import { useCallback, useEffect, useRef, type MouseEvent } from 'react'
import { canvasRepository } from '@/features/canvas/infrastructure/canvasRepository'
import {
  createCanvasShapeNode,
  createCanvasTextNode,
} from '@/features/canvas/model/canvasElements'
import { isShapeTool } from '@/features/canvas/model/canvasTools'
import type { CanvasTool } from '@/features/canvas/model/flowTypes'
import type { CanvasTextStyle } from '@/features/canvas/model/textStyle'
import { dispatchCanvasCommitActiveEdit } from '@/shared/model/canvasEditEvents'
import type { CanvasPoint, InputCard, PromptCard } from '@/shared/types'

interface UseCanvasPaneClickOptions {
  activeTool: CanvasTool
  canvasId?: string
  topicSessionId?: string
  textStyle: CanvasTextStyle
  onAddInputCard: (position?: InputCard['position'], topicSessionId?: string) => void
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
  onAddInputCard,
  onAddPrompt,
  onClearSelection,
  onSelectTool,
  screenToFlowPosition,
  textStyle,
  topicSessionId,
}: UseCanvasPaneClickOptions) {
  const activeToolRef = useRef(activeTool)
  const onActivateShortcutsRef = useRef(onActivateShortcuts)
  const onAddInputCardRef = useRef(onAddInputCard)
  const onAddPromptRef = useRef(onAddPrompt)
  const onClearSelectionRef = useRef(onClearSelection)
  const onSelectToolRef = useRef(onSelectTool)
  const screenToFlowPositionRef = useRef(screenToFlowPosition)
  const textStyleRef = useRef(textStyle)

  useEffect(() => {
    activeToolRef.current = activeTool
  }, [activeTool])

  useEffect(() => {
    onActivateShortcutsRef.current = onActivateShortcuts
  }, [onActivateShortcuts])

  useEffect(() => {
    onAddInputCardRef.current = onAddInputCard
  }, [onAddInputCard])

  useEffect(() => {
    onAddPromptRef.current = onAddPrompt
  }, [onAddPrompt])

  useEffect(() => {
    onClearSelectionRef.current = onClearSelection
  }, [onClearSelection])

  useEffect(() => {
    onSelectToolRef.current = onSelectTool
  }, [onSelectTool])

  useEffect(() => {
    screenToFlowPositionRef.current = screenToFlowPosition
  }, [screenToFlowPosition])

  useEffect(() => {
    textStyleRef.current = textStyle
  }, [textStyle])

  return useCallback(
    (event: MouseEvent) => {
      if (!canvasId) return
      dispatchCanvasCommitActiveEdit()
      onActivateShortcutsRef.current()
      const activeTool = activeToolRef.current
      const position = screenToFlowPositionRef.current({
        x: event.clientX,
        y: event.clientY,
      })

      if (activeTool === 'prompt') {
        onAddPromptRef.current(position, topicSessionId)
        onSelectToolRef.current('select')
        return
      }

      if (activeTool === 'input') {
        onAddInputCardRef.current(position, topicSessionId)
        onSelectToolRef.current('select')
        return
      }

      if (isShapeTool(activeTool)) {
        void canvasRepository.saveShapeNode(
          createCanvasShapeNode(canvasId, activeTool, position, topicSessionId),
        )
        onSelectToolRef.current('select')
        return
      }

      if (activeTool === 'text') {
        void canvasRepository.saveTextNode(
          createCanvasTextNode(canvasId, position, textStyleRef.current, topicSessionId),
        )
        onSelectToolRef.current('select')
        return
      }

      if (activeTool === 'select') onClearSelectionRef.current()
    },
    [canvasId, topicSessionId],
  )
}
