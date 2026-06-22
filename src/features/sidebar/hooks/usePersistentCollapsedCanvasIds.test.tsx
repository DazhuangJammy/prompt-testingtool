import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { usePersistentCollapsedCanvasIds } from './usePersistentCollapsedCanvasIds'

let root: Root | undefined
let host: HTMLDivElement | undefined

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = undefined
  host?.remove()
  host = undefined
  document.body.innerHTML = ''
})

describe('usePersistentCollapsedCanvasIds', () => {
  it('keeps a collapsed project group collapsed after remount', () => {
    renderHarness()

    expect(getHarnessButton()?.dataset.collapsed).toBe('false')

    act(() => {
      getHarnessButton()?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(getHarnessButton()?.dataset.collapsed).toBe('true')

    act(() => {
      root?.unmount()
    })
    host?.remove()
    root = undefined
    host = undefined

    renderHarness()

    expect(getHarnessButton()?.dataset.collapsed).toBe('true')
  })
})

function renderHarness() {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)

  act(() => {
    root?.render(<CollapsedCanvasHarness />)
  })
}

function CollapsedCanvasHarness() {
  const { collapsedCanvasIds, toggleCanvas } = usePersistentCollapsedCanvasIds()

  return (
    <button
      type="button"
      data-collapsed={collapsedCanvasIds.has('canvas-a')}
      onClick={() => toggleCanvas('canvas-a')}
    >
      canvas-a
    </button>
  )
}

function getHarnessButton() {
  return document.querySelector<HTMLButtonElement>('button')
}
