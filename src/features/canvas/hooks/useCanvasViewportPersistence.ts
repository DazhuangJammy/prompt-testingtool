import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  Edge,
  OnMoveEnd,
  ReactFlowInstance,
} from '@xyflow/react'
import type { CanvasFlowNode } from '@/features/canvas/model/canvasFlowMapping'
import {
  createCanvasViewportStorageKey,
  readStoredCanvasViewport,
  saveStoredCanvasViewport,
} from '@/features/canvas/model/canvasViewport'

interface UseCanvasViewportPersistenceOptions {
  canvasId?: string
  reactFlow: ReactFlowInstance<CanvasFlowNode, Edge>
  sessionId?: string
}

export function useCanvasViewportPersistence({
  canvasId,
  reactFlow,
  sessionId,
}: UseCanvasViewportPersistenceOptions) {
  const storageKey = useMemo(
    () => createCanvasViewportStorageKey(canvasId, sessionId),
    [canvasId, sessionId],
  )
  const defaultViewport = useMemo(
    () => readStoredCanvasViewport(storageKey),
    [storageKey],
  )
  const [savedStorageKey, setSavedStorageKey] = useState<string | undefined>(
    () => (defaultViewport ? storageKey : undefined),
  )
  const restoredStorageKeyRef = useRef<string | undefined>(undefined)
  const hasStoredViewport = Boolean(defaultViewport) || savedStorageKey === storageKey

  useEffect(() => {
    if (!defaultViewport || !storageKey) return
    if (restoredStorageKeyRef.current === storageKey) return
    restoredStorageKeyRef.current = storageKey

    const frameId = window.requestAnimationFrame(() => {
      void reactFlow.setViewport(defaultViewport, { duration: 0 })
    })
    return () => window.cancelAnimationFrame(frameId)
  }, [defaultViewport, reactFlow, storageKey])

  const handleMoveEnd = useCallback<OnMoveEnd>(
    (_event, viewport) => {
      saveStoredCanvasViewport(storageKey, viewport)
      if (storageKey) setSavedStorageKey(storageKey)
    },
    [storageKey],
  )

  return {
    defaultViewport,
    handleMoveEnd,
    hasStoredViewport,
  }
}
