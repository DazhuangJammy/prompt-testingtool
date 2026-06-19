import { useCallback, useRef, type KeyboardEvent } from 'react'
import {
  getCanvasToolForShortcut,
  type CanvasTool,
  type CanvasToolShortcuts,
} from '@/shared/model/canvasToolShortcuts'

interface UseCanvasToolKeyboardShortcutsOptions {
  shortcuts: CanvasToolShortcuts
  onSelectTool: (tool: CanvasTool) => void
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  const tagName = target.tagName.toLowerCase()
  return (
    target.isContentEditable ||
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select'
  )
}

export function useCanvasToolKeyboardShortcuts({
  onSelectTool,
  shortcuts,
}: UseCanvasToolKeyboardShortcutsOptions) {
  const shortcutScopeRef = useRef<HTMLDivElement>(null)

  const activateShortcutScope = useCallback(() => {
    shortcutScopeRef.current?.focus({ preventScroll: true })
  }, [])

  const deactivateShortcutScope = useCallback(() => {
    shortcutScopeRef.current?.blur()
  }, [])

  const handleShortcutKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        isEditableTarget(event.target)
      ) {
        return
      }

      const tool = getCanvasToolForShortcut(shortcuts, event.key)
      if (!tool) return

      event.preventDefault()
      onSelectTool(tool)
    },
    [onSelectTool, shortcuts],
  )

  return {
    activateShortcutScope,
    deactivateShortcutScope,
    handleShortcutKeyDown,
    shortcutScopeRef,
  }
}
