import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defaultCanvasToolShortcuts } from '@/shared/model/canvasToolShortcuts'
import { ShortcutSettingsPanel } from './ShortcutSettingsPanel'

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

describe('ShortcutSettingsPanel', () => {
  it('renders and saves configurable canvas tool shortcuts', () => {
    const saveShortcutMock = vi.fn()
    const resetMock = vi.fn()
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    act(() => {
      root?.render(
        <ShortcutSettingsPanel
          shortcuts={defaultCanvasToolShortcuts}
          onReset={resetMock}
          onSaveShortcut={saveShortcutMock}
        />,
      )
    })

    const panInput = document.querySelector<HTMLInputElement>(
      'input[aria-label="拖动画布快捷键"]',
    )
    expect(panInput?.value).toBe('1')
    expect(document.querySelectorAll('.shortcut-settings-row')).toHaveLength(8)

    act(() => {
      panInput?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: '8' }),
      )
    })
    act(() => {
      document
        .querySelector<HTMLButtonElement>('.shortcut-settings-head button')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(saveShortcutMock).toHaveBeenCalledWith('pan', '8')
    expect(resetMock).toHaveBeenCalled()
  })
})
