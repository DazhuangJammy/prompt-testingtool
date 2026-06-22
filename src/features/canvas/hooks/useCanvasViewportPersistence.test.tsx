import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReactFlowInstance, Edge } from '@xyflow/react'
import type { CanvasFlowNode } from '@/features/canvas/model/canvasFlowMapping'
import {
  createCanvasViewportStorageKey,
  saveStoredCanvasViewport,
} from '@/features/canvas/model/canvasViewport'
import { useCanvasViewportPersistence } from './useCanvasViewportPersistence'

let root: Root | undefined
let host: HTMLDivElement | undefined

function renderHarness(reactFlow: Pick<ReactFlowInstance<CanvasFlowNode, Edge>, 'setViewport'>) {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)

  act(() => {
    root?.render(
      <ViewportHarness
        canvasId="canvas-1"
        reactFlow={reactFlow as ReactFlowInstance<CanvasFlowNode, Edge>}
        sessionId="topic-1"
      />,
    )
  })
}

function rerenderHarness(
  reactFlow: Pick<ReactFlowInstance<CanvasFlowNode, Edge>, 'setViewport'>,
) {
  act(() => {
    root?.render(
      <ViewportHarness
        canvasId="canvas-1"
        reactFlow={reactFlow as ReactFlowInstance<CanvasFlowNode, Edge>}
        sessionId="topic-1"
      />,
    )
  })
}

function ViewportHarness({
  canvasId,
  reactFlow,
  sessionId,
}: {
  canvasId: string
  reactFlow: ReactFlowInstance<CanvasFlowNode, Edge>
  sessionId: string
}) {
  useCanvasViewportPersistence({ canvasId, reactFlow, sessionId })
  return null
}

async function flushAnimationFrame() {
  await act(async () => {
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
  })
}

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = undefined
  host?.remove()
  host = undefined
  document.body.innerHTML = ''
  localStorage.clear()
  vi.clearAllMocks()
})

describe('useCanvasViewportPersistence', () => {
  it('restores a stored viewport once per canvas scope', async () => {
    saveStoredCanvasViewport(
      createCanvasViewportStorageKey('canvas-1', 'topic-1'),
      { x: 12, y: 24, zoom: 0.8 },
    )
    const reactFlow = {
      setViewport: vi.fn(),
    }

    renderHarness(reactFlow)
    await flushAnimationFrame()
    rerenderHarness(reactFlow)
    await flushAnimationFrame()

    expect(reactFlow.setViewport).toHaveBeenCalledTimes(1)
    expect(reactFlow.setViewport).toHaveBeenCalledWith(
      { x: 12, y: 24, zoom: 0.8 },
      { duration: 0 },
    )
  })
})
