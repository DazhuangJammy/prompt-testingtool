import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  defaultCanvasToolShortcuts,
  type CanvasTool,
} from '@/shared/model/canvasToolShortcuts'
import { useCanvasToolKeyboardShortcuts } from './useCanvasToolKeyboardShortcuts'

let root: Root | undefined
let host: HTMLDivElement | undefined

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = undefined
  host?.remove()
  host = undefined
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

function ShortcutHarness({
  onSelectTool,
}: {
  onSelectTool: (tool: CanvasTool) => void
}) {
  const {
    activateShortcutScope,
    handleShortcutKeyDown,
    shortcutScopeRef,
  } = useCanvasToolKeyboardShortcuts({
    onSelectTool,
    shortcuts: defaultCanvasToolShortcuts,
  })

  return (
    <>
      <button type="button" onClick={activateShortcutScope}>
        激活画布
      </button>
      <div
        ref={shortcutScopeRef}
        data-testid="canvas-scope"
        tabIndex={-1}
        onKeyDown={handleShortcutKeyDown}
      >
        <input aria-label="编辑文本" />
      </div>
    </>
  )
}

describe('useCanvasToolKeyboardShortcuts', () => {
  it('selects tools only after the canvas scope is focused', () => {
    const selectToolMock = vi.fn()
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    act(() => {
      root?.render(<ShortcutHarness onSelectTool={selectToolMock} />)
    })

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: '3' }))
    })
    expect(selectToolMock).not.toHaveBeenCalled()

    act(() => {
      document
        .querySelector<HTMLButtonElement>('button')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    act(() => {
      document.activeElement?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: '3' }),
      )
    })

    expect(selectToolMock).toHaveBeenCalledWith('prompt')
  })

  it('ignores shortcuts from editable fields', () => {
    const selectToolMock = vi.fn()
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    act(() => {
      root?.render(<ShortcutHarness onSelectTool={selectToolMock} />)
    })
    act(() => {
      document.querySelector<HTMLInputElement>('input')?.focus()
    })
    act(() => {
      document.activeElement?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: '3' }),
      )
    })

    expect(selectToolMock).not.toHaveBeenCalled()
  })
})
