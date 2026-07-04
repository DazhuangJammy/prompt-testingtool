import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CANVAS_COMMIT_ACTIVE_EDIT_EVENT } from '@/shared/model/canvasEditEvents'
import PromptCardNode from './PromptCardNode'
import type { PromptFlowNode } from './PromptCardNode.types'

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

describe('PromptCardNode', () => {
  it('selects the prompt card during pointer capture', () => {
    const onSelect = vi.fn()
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    act(() => {
      root?.render(
        <PromptCardNode
          id="card-2"
          type="promptCard"
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
              id: 'card-2',
              canvasId: 'canvas',
              title: '有角色',
              position: { x: 0, y: 0 },
              markdown: '# 角色\n\n只用这张卡',
              sections: {},
              createdAt: 'now',
              updatedAt: 'now',
            },
            onChange: vi.fn(),
            onSelect,
          }}
        />,
      )
    })

    act(() => {
      document
        .querySelector<HTMLElement>('.prompt-markdown-shell')
        ?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    })

    expect(onSelect).toHaveBeenCalled()
    expect(onSelect.mock.calls[0]?.[0]).toBe('card-2')
  })

  it('saves markdown editing when the canvas asks active editors to commit', () => {
    const onChange = vi.fn()
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    act(() => {
      root?.render(
        <PromptCardNode
          id="card-2"
          type="promptCard"
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
              id: 'card-2',
              canvasId: 'canvas',
              title: '有角色',
              position: { x: 0, y: 0 },
              markdown: '旧内容',
              sections: {},
              createdAt: 'now',
              updatedAt: 'now',
            },
            onChange,
            onSelect: vi.fn(),
          }}
        />,
      )
    })

    act(() => {
      document
        .querySelector<HTMLElement>('.prompt-markdown-preview')
        ?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    })

    const textarea = document.querySelector<HTMLTextAreaElement>(
      '.prompt-markdown-editor textarea',
    )
    expect(textarea).not.toBeNull()

    act(() => {
      if (!textarea) return
      setTextareaValue(textarea, '新内容')
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
    })

    act(() => {
      window.dispatchEvent(new Event(CANVAS_COMMIT_ACTIVE_EDIT_EVENT))
    })

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        markdown: '新内容',
      }),
    )
    expect(document.querySelector('.prompt-markdown-editor')).toBeNull()
  })

  it('collapses generated prompt card headings by default', async () => {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    await act(async () => {
      root?.render(
        <PromptCardNode
          id="card-3"
          type="promptCard"
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
              id: 'card-3',
              canvasId: 'canvas',
              defaultCollapsed: true,
              title: '生成卡片',
              position: { x: 0, y: 0 },
              markdown: '# 角色\n\n- 展开后才看到\n\n# 规则\n\n- 规则内容',
              sections: {},
              createdAt: 'now',
              updatedAt: 'now',
            },
            onChange: vi.fn(),
            onSelect: vi.fn(),
          }}
        />,
      )
    })

    expect(document.querySelectorAll('.prompt-outline-section.is-collapsed')).toHaveLength(2)
    expect(document.body.textContent).toContain('角色')
    expect(document.body.textContent).not.toContain('展开后才看到')
    expect(document.body.textContent).not.toContain('规则内容')
  })

  it('restores persisted collapsed headings from the prompt card', async () => {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    await act(async () => {
      root?.render(
        <PromptCardNode
          id="card-4"
          type="promptCard"
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
              id: 'card-4',
              canvasId: 'canvas-a',
              title: '持久折叠',
              position: { x: 0, y: 0 },
              markdown: '# 角色\n\n- 已折叠\n\n# 规则\n\n- 仍展开',
              collapsedMarkdownHeadingIds: ['0-1-角色'],
              sections: {},
              createdAt: 'now',
              updatedAt: 'now',
            },
            onChange: vi.fn(),
            onSelect: vi.fn(),
          }}
        />,
      )
    })

    expect(document.querySelectorAll('.prompt-outline-section.is-collapsed')).toHaveLength(1)
    expect(document.body.textContent).toContain('角色')
    expect(document.body.textContent).not.toContain('已折叠')
    expect(document.body.textContent).toContain('仍展开')
  })

  it('saves heading collapse changes back to the prompt card', async () => {
    const onChange = vi.fn()
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    await act(async () => {
      root?.render(
        <PromptCardNode
          id="card-5"
          type="promptCard"
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
              id: 'card-5',
              canvasId: 'canvas-a',
              title: '保存折叠',
              position: { x: 0, y: 0 },
              markdown: '# 角色\n\n- 内容\n\n# 规则\n\n- 规则内容',
              sections: {},
              createdAt: 'now',
              updatedAt: 'now',
            },
            onChange,
            onSelect: vi.fn(),
          }}
        />,
      )
    })

    await act(async () => {
      document.querySelector<HTMLButtonElement>('.prompt-outline-toggle')?.click()
    })

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        canvasId: 'canvas-a',
        collapsedMarkdownHeadingIds: ['0-1-角色'],
      }),
    )
  })

  it('uses an explicitly empty persisted collapse state over generated defaults', async () => {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    await act(async () => {
      root?.render(
        <PromptCardNode
          id="card-6"
          type="promptCard"
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
              id: 'card-6',
              canvasId: 'canvas-b',
              defaultCollapsed: true,
              title: '显式展开',
              position: { x: 0, y: 0 },
              markdown: '# 角色\n\n- 应该显示\n\n# 规则\n\n- 规则内容',
              collapsedMarkdownHeadingIds: [],
              sections: {},
              createdAt: 'now',
              updatedAt: 'now',
            },
            onChange: vi.fn(),
            onSelect: vi.fn(),
          }}
        />,
      )
    })

    expect(document.querySelectorAll('.prompt-outline-section.is-collapsed')).toHaveLength(0)
    expect(document.body.textContent).toContain('应该显示')
    expect(document.body.textContent).toContain('规则内容')
  })

  it('does not carry collapsed headings across canvas cards', async () => {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    const renderCard = (card: PromptFlowNode['data']['card']) => (
      <PromptCardNode
        id={card.id}
        type="promptCard"
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
          card,
          onChange: vi.fn(),
          onSelect: vi.fn(),
        }}
      />
    )

    await act(async () => {
      root?.render(
        renderCard({
          id: 'card-7',
          canvasId: 'canvas-a',
          title: 'A 画布',
          position: { x: 0, y: 0 },
          markdown: '# 角色\n\n- A 折叠内容',
          collapsedMarkdownHeadingIds: ['0-1-角色'],
          sections: {},
          createdAt: 'now',
          updatedAt: 'now',
        }),
      )
    })

    expect(document.body.textContent).not.toContain('A 折叠内容')

    await act(async () => {
      root?.render(
        renderCard({
          id: 'card-8',
          canvasId: 'canvas-b',
          title: 'B 画布',
          position: { x: 0, y: 0 },
          markdown: '# 角色\n\n- B 应该展开',
          sections: {},
          createdAt: 'now',
          updatedAt: 'now',
        }),
      )
    })

    expect(document.querySelectorAll('.prompt-outline-section.is-collapsed')).toHaveLength(0)
    expect(document.body.textContent).toContain('B 应该展开')
  })
})

void (undefined as unknown as PromptFlowNode)

function setTextareaValue(textarea: HTMLTextAreaElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    'value',
  )
  descriptor?.set?.call(textarea, value)
}
