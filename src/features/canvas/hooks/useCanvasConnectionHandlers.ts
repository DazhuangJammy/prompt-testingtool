import { useCallback } from 'react'
import type {
  Connection,
  Edge,
  FinalConnectionState,
  OnConnect,
  OnReconnect,
} from '@xyflow/react'
import {
  deleteCanvasEdge,
  reconnectCanvasEdge,
} from '@/features/canvas/application/canvasService'
import { canvasRepository } from '@/features/canvas/infrastructure/canvasRepository'
import { createCanvasEdge } from '@/features/canvas/model/canvasElements'

export function useCanvasConnectionHandlers({
  canvasId,
  onClearSelection,
  topicSessionId,
}: {
  canvasId?: string
  onClearSelection: () => void
  topicSessionId?: string
}) {
  const handleConnect = useCallback<OnConnect>(
    (connection: Connection) => {
      if (
        !canvasId ||
        !connection.source ||
        !connection.target ||
        connection.source === connection.target
      ) {
        return
      }

      void canvasRepository.saveEdge(
        createCanvasEdge(
          canvasId,
          connection.source,
          connection.target,
          connection.sourceHandle,
          connection.targetHandle,
          topicSessionId,
        ),
      )
    },
    [canvasId, topicSessionId],
  )

  const handleReconnect = useCallback<OnReconnect<Edge>>(
    (oldEdge, connection) => {
      if (
        !canvasId ||
        !connection.source ||
        !connection.target ||
        connection.source === connection.target
      ) {
        return
      }

      void reconnectCanvasEdge(
        oldEdge.id,
        {
          sourceId: connection.source,
          targetId: connection.target,
          sourceHandle: connection.sourceHandle ?? undefined,
          targetHandle: connection.targetHandle ?? undefined,
        },
        canvasId,
      )
    },
    [canvasId],
  )

  const handleReconnectEnd = useCallback(
    (
      _event: MouseEvent | TouchEvent,
      edge: Edge,
      _handleType: unknown,
      connectionState: FinalConnectionState,
    ) => {
      if (connectionState.toHandle && connectionState.isValid !== false) return

      void deleteCanvasEdge(edge.id, canvasId)
      onClearSelection()
    },
    [canvasId, onClearSelection],
  )

  return {
    handleConnect,
    handleReconnect,
    handleReconnectEnd,
  }
}
