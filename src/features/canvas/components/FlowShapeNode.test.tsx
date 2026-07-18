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
  it('renders body content without the internal node title', () => {
    renderNode()

    expect(document.querySelector('.flow-shape-head')).toBeNull()
    expect(document.body.textContent).not.toContain(shapeNode.title)
    expect(document.body.textContent).toContain('第一项')
  })

  it('shows step copy as a placeholder instead of stored content', async () => {
    renderNode({
      node: {
        ...shapeNode,
        body: '流程说明',
        title: '步骤',
      },
    })

    const placeholder = document.querySelector<HTMLElement>(
      '.flow-shape-body-placeholder',
    )
    expect(placeholder?.textContent).toBe('流程说明')
    expect(document.body.textContent).not.toContain('步骤')

    await act(async () => {
      placeholder?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
      await Promise.resolve()
    })

    const textarea = document.querySelector<HTMLTextAreaElement>(
      '.flow-shape-editor textarea',
    )
    expect(textarea?.value).toBe('')
    expect(textarea?.placeholder).toBe('流程说明')
  })

  it('opens a single body editor without a title field', async () => {
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
    const titleInput = document.querySelector<HTMLInputElement>(
      '.flow-shape-editor input',
    )
    expect(textarea).not.toBeNull()
    expect(titleInput).toBeNull()
    expect(textarea?.value).toBe(shapeNode.body)
    expect(textarea?.getAttribute('aria-label')).toBe('编辑步骤内容')
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

  it('preserves manual line breaks in step body preview', () => {
    renderNode({
      node: {
        ...shapeNode,
        body: '第一行\n第二行',
      },
    })

    const paragraph = document.querySelector<HTMLElement>(
      '.flow-shape-body p.markdown-preserve-line-breaks',
    )

    expect(paragraph?.textContent).toBe('第一行\n第二行')
  })

  it('saves manual body line breaks and blank lines from the editor', async () => {
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

    const bodyDraft = [
      '1.给出维度让 kimi work 做调研',
      '',
      '? 有没有更好的工具或者更好的方法提高',
      '这个调研的速度',
    ].join('\n')

    act(() => {
      textarea.value = bodyDraft
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
    })

    await act(async () => {
      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
      await Promise.resolve()
    })

    expect(onUpdate).toHaveBeenCalledWith(shapeNode.id, { body: bodyDraft })
  })

  it('uses the same body-only editor for decision nodes', async () => {
    renderNode({
      node: {
        ...shapeNode,
        body: '是否继续？',
        kind: 'decision',
        title: '判断',
      },
    })

    const shape = document.querySelector<HTMLElement>('.flow-shape')
    expect(shape).not.toBeNull()
    if (!shape) return

    await act(async () => {
      shape.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
      await Promise.resolve()
    })

    const textarea = document.querySelector<HTMLTextAreaElement>(
      '.flow-shape-editor textarea',
    )
    expect(document.querySelector('.flow-shape-editor input')).toBeNull()
    expect(textarea?.value).toBe('是否继续？')
    expect(textarea?.getAttribute('aria-label')).toBe('编辑判断条件')
  })

  it('shows decision copy only as a placeholder', async () => {
    renderNode({
      node: {
        ...shapeNode,
        body: '分支条件',
        kind: 'decision',
        title: '判断',
      },
    })

    const placeholder = document.querySelector<HTMLElement>(
      '.flow-shape-body-placeholder',
    )
    expect(placeholder?.textContent).toBe('分支条件')
    expect(document.body.textContent).not.toContain('判断')

    await act(async () => {
      placeholder?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
      await Promise.resolve()
    })

    const textarea = document.querySelector<HTMLTextAreaElement>(
      '.flow-shape-editor textarea',
    )
    expect(textarea?.value).toBe('')
    expect(textarea?.placeholder).toBe('分支条件')
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
