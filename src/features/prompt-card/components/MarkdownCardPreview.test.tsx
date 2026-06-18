import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseMarkdownOutline } from '@/features/prompt-card/model/prompt'
import { MarkdownCardPreview } from './MarkdownCardPreview'

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

describe('MarkdownCardPreview', () => {
  it('places local body editor caret near the double-clicked text', async () => {
    const markdown = '# 工作流程\n\n第一段内容\n第二段内容'
    const outline = parseMarkdownOutline(markdown)
    const originalCaretPositionFromPoint = document.caretPositionFromPoint
    Object.defineProperty(document, 'caretPositionFromPoint', {
      configurable: true,
      value: vi.fn(() => {
        const textNode = document.querySelector('.prompt-outline-body p')
          ?.firstChild
        return { offsetNode: textNode, offset: 2 }
      }),
    })
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    await act(async () => {
      root?.render(
        <MarkdownCardPreview
          collapsedHeadingIds={new Set()}
          editingNodeFocus="body"
          markdown={markdown}
          outline={outline}
          onAddChildHeading={vi.fn()}
          onCancelNodeEdit={vi.fn()}
          onEditNode={(node, request) => {
            root?.render(
              <MarkdownCardPreview
                collapsedHeadingIds={new Set()}
                editingNodeCursorOffset={request.cursorOffset}
                editingNodeFocus={request.focus}
                editingNodeId={node.id}
                markdown={markdown}
                outline={outline}
                onAddChildHeading={vi.fn()}
                onCancelNodeEdit={vi.fn()}
                onEditNode={vi.fn()}
                onOptimizeSelection={vi.fn()}
                onReorderTopLevel={vi.fn()}
                onSaveNode={vi.fn()}
                onToggleHeading={vi.fn()}
              />,
            )
          }}
          onOptimizeSelection={vi.fn()}
          onReorderTopLevel={vi.fn()}
          onSaveNode={vi.fn()}
          onToggleHeading={vi.fn()}
        />,
      )
    })

    await act(async () => {
      document
        .querySelector<HTMLElement>('.prompt-outline-body')!
        .dispatchEvent(
          new MouseEvent('dblclick', {
            bubbles: true,
            clientX: 10,
            clientY: 10,
          }),
        )
      await new Promise((resolve) => requestAnimationFrame(resolve))
    })

    const textarea = document.querySelector<HTMLTextAreaElement>(
      '.prompt-node-local-editor textarea',
    )
    expect(textarea?.selectionStart).toBe(2)

    Object.defineProperty(document, 'caretPositionFromPoint', {
      configurable: true,
      value: originalCaretPositionFromPoint,
    })
  })

  it('optimizes only selected local editor text with full draft context', async () => {
    const markdown = '# 角色\n\n旧正文\n\n# 规则\n\n保持简洁'
    const outline = parseMarkdownOutline(markdown)
    const optimizeMock = vi.fn(
      async (
        _selectedText: string,
        _instruction: string,
        _contextMarkdown: string,
        onUpdate?: (text: string) => void,
      ) => {
        onUpdate?.('新正')
        onUpdate?.('新正文')
        return '新正文'
      },
    )
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    await act(async () => {
      root?.render(
        <MarkdownCardPreview
          collapsedHeadingIds={new Set()}
          editingNodeFocus="body"
          editingNodeId={outline.nodes[0].id}
          markdown={markdown}
          outline={outline}
          onAddChildHeading={vi.fn()}
          onCancelNodeEdit={vi.fn()}
          onEditNode={vi.fn()}
          onOptimizeSelection={optimizeMock}
          onReorderTopLevel={vi.fn()}
          onSaveNode={vi.fn()}
          onToggleHeading={vi.fn()}
        />,
      )
    })

    const textarea = document.querySelector<HTMLTextAreaElement>(
      '.prompt-node-local-editor textarea',
    )
    expect(textarea).toBeTruthy()

    await act(async () => {
      textarea!.setSelectionRange(0, 2)
      textarea!.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    })
    const optimizeButton = document.querySelector<HTMLButtonElement>(
      'button.prompt-selection-optimize',
    )
    expect(optimizeButton).toBeTruthy()
    await act(async () => {
      optimizeButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const promptTextarea = document.querySelector<HTMLTextAreaElement>(
      '.prompt-optimization-popover textarea',
    )
    expect(promptTextarea).toBeTruthy()
    await act(async () => {
      setInputValue(promptTextarea!, '更具体')
      promptTextarea!.dispatchEvent(new InputEvent('input', { bubbles: true }))
    })
    const submitButton = document.querySelector<HTMLButtonElement>(
      '.prompt-optimization-actions button:last-child',
    )
    expect(submitButton).toBeTruthy()
    await waitForAssertion(() => expect(submitButton!.disabled).toBe(false))
    await act(async () => {
      submitButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    await waitForAssertion(() =>
      expect(optimizeMock).toHaveBeenCalledWith(
        '旧正',
        '更具体',
        '# 角色\n\n旧正文\n\n# 规则\n\n保持简洁',
        expect.any(Function),
      ),
    )
    await waitForAssertion(() => expect(textarea!.value).toBe('新正文文'))
  })

  it('keeps a disabled loading button while local selection optimization runs', async () => {
    const markdown = '# 角色\n\n旧正文'
    const outline = parseMarkdownOutline(markdown)
    let resolveOptimization: ((value: string) => void) | undefined
    const optimizeMock = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveOptimization = resolve
        }),
    )
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    await act(async () => {
      root?.render(
        <MarkdownCardPreview
          collapsedHeadingIds={new Set()}
          editingNodeFocus="body"
          editingNodeId={outline.nodes[0].id}
          markdown={markdown}
          outline={outline}
          onAddChildHeading={vi.fn()}
          onCancelNodeEdit={vi.fn()}
          onEditNode={vi.fn()}
          onOptimizeSelection={optimizeMock}
          onReorderTopLevel={vi.fn()}
          onSaveNode={vi.fn()}
          onToggleHeading={vi.fn()}
        />,
      )
    })

    const textarea = document.querySelector<HTMLTextAreaElement>(
      '.prompt-node-local-editor textarea',
    )
    await act(async () => {
      textarea!.setSelectionRange(0, 2)
      textarea!.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    })
    await act(async () => {
      document
        .querySelector<HTMLButtonElement>('button.prompt-selection-optimize')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    const promptTextarea = document.querySelector<HTMLTextAreaElement>(
      '.prompt-optimization-popover textarea',
    )
    await act(async () => {
      setInputValue(promptTextarea!, '更具体')
      promptTextarea!.dispatchEvent(new InputEvent('input', { bubbles: true }))
    })
    await waitForAssertion(() =>
      expect(
        document.querySelector<HTMLButtonElement>(
          '.prompt-optimization-actions button:last-child',
        )!.disabled,
      ).toBe(false),
    )
    await act(async () => {
      document
        .querySelector<HTMLButtonElement>(
          '.prompt-optimization-actions button:last-child',
        )!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    await waitForAssertion(() => {
      const loadingButton = document.querySelector<HTMLButtonElement>(
        'button.prompt-selection-optimize.is-loading',
      )
      expect(loadingButton?.disabled).toBe(true)
      expect(loadingButton?.textContent).toContain('优化中')
    })

    await act(async () => {
      resolveOptimization?.('新正文')
    })
  })
})

function setInputValue(input: HTMLTextAreaElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    'value',
  )
  descriptor?.set?.call(input, value)
}

async function waitForAssertion(assertion: () => void) {
  let lastError: unknown
  for (let index = 0; index < 20; index += 1) {
    try {
      assertion()
      return
    } catch (error) {
      lastError = error
      await act(async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 0))
      })
    }
  }
  throw lastError
}
