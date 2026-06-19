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
    const onSelect = vi.fn<(id: string) => void>()
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

    expect(onSelect).toHaveBeenCalledWith('card-2')
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
})

void (undefined as unknown as PromptFlowNode)

function setTextareaValue(textarea: HTMLTextAreaElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    'value',
  )
  descriptor?.set?.call(textarea, value)
}
