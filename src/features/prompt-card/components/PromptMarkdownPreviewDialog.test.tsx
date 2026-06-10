import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PromptMarkdownPreviewDialog } from './PromptMarkdownPreviewDialog'

let root: Root | undefined
let host: HTMLDivElement | undefined

const renderDialog = ({
  onClose = vi.fn(),
  onCopy = vi.fn(),
} = {}) => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)

  act(() => {
    root?.render(
      <PromptMarkdownPreviewDialog
        markdown="# 角色&#10;&#10;专家&#10;&#10;## 步骤一&#10;&#10;分析"
        title="提示词 1"
        onClose={onClose}
        onCopy={onCopy}
      />,
    )
  })

  return { onClose, onCopy }
}

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = undefined
  host?.remove()
  host = undefined
  document.body.innerHTML = ''
})

describe('PromptMarkdownPreviewDialog', () => {
  it('renders markdown preview through a body portal', () => {
    renderDialog()

    const backdrop = document.body.querySelector('.prompt-preview-backdrop')
    const dialog = document.body.querySelector('.prompt-preview-dialog')

    expect(backdrop?.parentElement).toBe(document.body)
    expect(dialog?.closest('.prompt-node')).toBeNull()
    expect(dialog?.querySelector('strong')?.textContent).toBe('提示词 1')
    expect(dialog?.querySelector('h1')?.textContent).toBe('角色')
    expect(dialog?.querySelector('h2')?.textContent).toBe('步骤一')
  })

  it('supports copy and Escape close actions', () => {
    const { onClose, onCopy } = renderDialog()

    act(() => {
      document
        .querySelector<HTMLButtonElement>('button[aria-label="复制"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })

    expect(onCopy).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
