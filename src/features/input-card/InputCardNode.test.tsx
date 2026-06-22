import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import InputCardNode from './InputCardNode'

vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual<typeof import('@xyflow/react')>('@xyflow/react')
  return {
    ...actual,
    Handle: () => <span data-testid="handle" />,
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

describe('InputCardNode', () => {
  it('collapses and persists first-level input sections', () => {
    const onChange = vi.fn()
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    act(() => {
      root?.render(
        <InputCardNode
          id="input-1"
          type="inputCard"
          selected={false}
          dragging={false}
          draggable={true}
          selectable={true}
          deletable={true}
          zIndex={0}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          data={{
            card: {
              id: 'input-1',
              canvasId: 'canvas-1',
              title: '输入卡片',
              markdown: '# 输入一\n\n正文一\n\n# 输入二\n\n正文二',
              position: { x: 0, y: 0 },
              createdAt: 'now',
              updatedAt: 'now',
            },
            onChange,
            onSelect: vi.fn(),
          }}
        />,
      )
    })

    expect(document.body.textContent).toContain('正文一')
    expect(document.body.textContent).not.toContain('H1')
    expect(document.querySelectorAll('[data-testid="handle"]')).toHaveLength(4)

    act(() => {
      const toggle = document.querySelector<HTMLElement>('.input-outline-toggle')
      toggle?.click()
    })

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        collapsedMarkdownHeadingIds: ['0-1-输入一'],
      }),
    )
  })

  it('restores persisted collapsed input sections', () => {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    act(() => {
      root?.render(
        <InputCardNode
          id="input-2"
          type="inputCard"
          selected={false}
          dragging={false}
          draggable={true}
          selectable={true}
          deletable={true}
          zIndex={0}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          data={{
            card: {
              id: 'input-2',
              canvasId: 'canvas-1',
              title: '输入卡片',
              markdown: '# 输入一\n\n正文一\n\n# 输入二\n\n正文二',
              collapsedMarkdownHeadingIds: ['0-1-输入一'],
              position: { x: 0, y: 0 },
              createdAt: 'now',
              updatedAt: 'now',
            },
            onChange: vi.fn(),
            onSelect: vi.fn(),
          }}
        />,
      )
    })

    expect(document.querySelectorAll('.input-outline-section.is-collapsed')).toHaveLength(1)
    expect(document.body.textContent).not.toContain('正文一')
    expect(document.body.textContent).toContain('正文二')
  })

  it('uses React Flow selection state for selected styling', () => {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    act(() => {
      root?.render(
        <InputCardNode
          id="input-3"
          type="inputCard"
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
            card: {
              id: 'input-3',
              canvasId: 'canvas-1',
              title: '输入卡片',
              markdown: '# 输入一\n\n正文一',
              position: { x: 0, y: 0 },
              createdAt: 'now',
              updatedAt: 'now',
            },
            onChange: vi.fn(),
            onSelect: vi.fn(),
          }}
        />,
      )
    })

    expect(document.querySelector('.input-card-node')?.className).toContain(
      'is-selected',
    )
  })

  it('keeps markdown editor actions outside the scrollable input card body', () => {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    act(() => {
      root?.render(
        <InputCardNode
          id="input-4"
          type="inputCard"
          selected={false}
          dragging={false}
          draggable={true}
          selectable={true}
          deletable={true}
          zIndex={0}
          isConnectable={true}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          data={{
            card: {
              id: 'input-4',
              canvasId: 'canvas-1',
              title: '输入卡片',
              markdown: '# 输入一\n\n正文一',
              position: { x: 0, y: 0 },
              createdAt: 'now',
              updatedAt: 'now',
            },
            onChange: vi.fn(),
            onSelect: vi.fn(),
          }}
        />,
      )
    })

    act(() => {
      document.querySelector<HTMLButtonElement>('[aria-label="编辑输入"]')?.click()
    })

    expect(document.querySelector('.input-card-body')?.className).toContain(
      'is-editing-markdown',
    )
    expect(
      document.querySelector('.input-card-body > .prompt-markdown-editor'),
    ).not.toBeNull()
    expect(
      document.querySelector('.prompt-markdown-editor-actions'),
    ).not.toBeNull()
  })
})
