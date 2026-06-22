import { useCallback, useState } from 'react'
import {
  readStoredCollapsedCanvasIds,
  toggleCollapsedCanvasId,
  writeStoredCollapsedCanvasIds,
} from '../model/collapsedCanvasIds'

export function usePersistentCollapsedCanvasIds() {
  const [collapsedCanvasIds, setCollapsedCanvasIds] = useState(
    readStoredCollapsedCanvasIds,
  )

  const toggleCanvas = useCallback((canvasId: string) => {
    setCollapsedCanvasIds((current) => {
      const next = toggleCollapsedCanvasId(current, canvasId)
      if (next !== current) writeStoredCollapsedCanvasIds(next)
      return next
    })
  }, [])

  return {
    collapsedCanvasIds,
    toggleCanvas,
  }
}
