import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from 'react'
import type { ReactFlowInstance } from '@xyflow/react'
import { canvasRepository } from '@/features/canvas/infrastructure/canvasRepository'
import { createCanvasStroke } from '@/features/canvas/model/canvasElements'
import type { CanvasFlowNode } from '@/features/canvas/model/canvasFlowMapping'
import type { CanvasPoint } from '@/shared/types'
import { simplifyPoints } from '@/features/canvas/model/strokeGeometry'

export function useDraftStroke({
  activeTool,
  canvasId,
  penColor,
  reactFlow,
  topicSessionId,
  onStart,
}: {
  activeTool: string
  canvasId?: string
  topicSessionId?: string
  penColor: string
  reactFlow: ReactFlowInstance<CanvasFlowNode>
  onStart: () => void
}) {
  const [draftPoints, setDraftPoints] = useState<CanvasPoint[]>([])
  const draftPointsRef = useRef<CanvasPoint[]>([])
  const isDrawingStroke = draftPoints.length > 0

  useEffect(() => {
    if (!isDrawingStroke) return

    const handleMove = (event: PointerEvent) => {
      const nextPoints = [
        ...draftPointsRef.current,
        reactFlow.screenToFlowPosition({ x: event.clientX, y: event.clientY }),
      ]
      draftPointsRef.current = nextPoints
      setDraftPoints(nextPoints)
    }
    const handleUp = () => {
      const points = draftPointsRef.current
      draftPointsRef.current = []
      setDraftPoints([])
      if (canvasId && points.length > 1) {
        void canvasRepository.saveStroke(
          createCanvasStroke(
            canvasId,
            simplifyPoints(points),
            penColor,
            3,
            topicSessionId,
          ),
        )
      }
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp, { once: true })

    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [canvasId, isDrawingStroke, penColor, reactFlow, topicSessionId])

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent) => {
      if (activeTool !== 'pen') return
      event.preventDefault()
      const startPoint = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      draftPointsRef.current = [startPoint]
      onStart()
      setDraftPoints([startPoint])
    },
    [activeTool, onStart, reactFlow],
  )

  return { draftPoints, handlePointerDown }
}
