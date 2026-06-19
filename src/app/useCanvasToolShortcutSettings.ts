import { useEffect, useState } from 'react'
import {
  defaultCanvasToolShortcuts,
  normalizeCanvasToolShortcuts,
  updateCanvasToolShortcut,
  type CanvasTool,
  type CanvasToolShortcuts,
} from '@/shared/model/canvasToolShortcuts'

const storageKey = 'prompt-canvas-tool-shortcuts'

function readCanvasToolShortcuts(): CanvasToolShortcuts {
  try {
    const stored = localStorage.getItem(storageKey)
    if (!stored) return defaultCanvasToolShortcuts
    return normalizeCanvasToolShortcuts(JSON.parse(stored))
  } catch {
    return defaultCanvasToolShortcuts
  }
}

export function useCanvasToolShortcutSettings() {
  const [shortcuts, setShortcuts] = useState(readCanvasToolShortcuts)

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(shortcuts))
  }, [shortcuts])

  const setShortcut = (tool: CanvasTool, key: string) => {
    setShortcuts((current) => updateCanvasToolShortcut(current, tool, key))
  }

  const resetShortcuts = () => {
    setShortcuts(defaultCanvasToolShortcuts)
  }

  return { resetShortcuts, setShortcut, shortcuts }
}
