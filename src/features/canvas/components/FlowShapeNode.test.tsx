import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CanvasShapeNode } from '@/shared/types'
import FlowShapeNode from './FlowShapeNode'

vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual<typeof import('@xyflow/react')>('@xyflow/react')
  return {
    ...actual,
    Handle: () => <span data-testid="handle" />,
    NodeResizeControl: () => <span data-testid="resize" />,
  }
})

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

describe('FlowShapeNode', () => {
  it('keeps the manually resized frame when saving text edits', async () => {
    const onUpdate = vi.fn()
    renderNode({ onUpdate })

    const body = document.querySelector<HTMLElement>('.flow-shape-body')
    expect(body).not.toBeNull()
    if (!body) return

    await act(async () => {
      body.dispatchEvent(
        new MouseEvent('dblclick', {
          bubbles: true,
          clientX: 16,
          clientY: 16,
        }),
      )
      await Promise.resolve()
    })

    const textarea = document.querySelector<HTMLTextAreaElement>(
      '.flow-shape-editor textarea',
    )
    expect(textarea).not.toBeNull()
    if (!textarea) return

    act(() => {
      textarea.value = '- 编辑后的内容'
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
    })

    await act(async () => {
      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
      await Promise.resolve()
    })

    expect(onUpdate).toHaveBeenCalledWith(shapeNode.id, {
      body: '- 编辑后的内容',
      title: shapeNode.title,
    })
  })

  it('scrolls selected node content with the wheel before the canvas can zoom', () => {
    renderNode()

    const shape = document.querySelector<HTMLElement>('.flow-shape')
    const body = document.querySelector<HTMLElement>('.flow-shape-body')
    expect(shape).not.toBeNull()
    expect(body).not.toBeNull()
    if (!shape || !body) return

    Object.defineProperty(body, 'scrollHeight', {
      configurable: true,
      value: 360,
    })
    Object.defineProperty(body, 'clientHeight', {
      configurable: true,
      value: 120,
    })

    act(() => {
      shape.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 48 }))
    })

    expect(body.scrollTop).toBe(48)
  })
})

function renderNode(
  overrides: Partial<{
    node: CanvasShapeNode
    onSelect: (id: string) => void
    onUpdate: (id: string, updates: Partial<CanvasShapeNode>) => void
    selectedNodeId: string
  }> = {},
) {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)

  act(() => {
    root?.render(
      <FlowShapeNode
        id="shape-1"
        type="flowShape"
        selected={true}
        dragging={false}
        draggable={true}
        selectable={true}
        deletable={true}
        zIndex={0}
        isConnectable={true}
        positionAbsoluteX={0}
        positionAbsoluteY={0}
        data={{
          node: shapeNode,
          selectedNodeId: shapeNode.id,
          onSelect: vi.fn(),
          onUpdate: vi.fn(),
          ...overrides,
        }}
      />,
    )
  })
}

const shapeNode: CanvasShapeNode = {
  id: 'shape-1',
  body: '- 第一项\n- 第二项\n- 第三项',
  canvasId: 'canvas',
  createdAt: 'now',
  height: 140,
  kind: 'step',
  position: { x: 0, y: 0 },
  title: '【01】步骤',
  updatedAt: 'now',
  width: 300,
}
