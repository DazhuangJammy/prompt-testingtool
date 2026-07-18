import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PromptMarkdownPreviewDialog } from './PromptMarkdownPreviewDialog'

let root: Root | undefined
let host: HTMLDivElement | undefined

const renderDialog = ({
  markdown = '# 角色\n\n专家\n\n## 步骤一\n\n分析',
  onClose = vi.fn(),
  onCopy = vi.fn(),
}: {
  markdown?: string
  onClose?: () => void
  onCopy?: () => void
} = {}) => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)

  act(() => {
    root?.render(
      <PromptMarkdownPreviewDialog
        markdown={markdown}
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

  it('renders headings inside special protected blocks as plain text', () => {
    renderDialog({
      markdown: [
        '# 输出格式',
        '""""""',
        '# 企业发展历程',
        '## 产品力分析',
        '""""""',
        '<think>',
        '# 内部推理',
        '</think>',
        '# 真实标题',
      ].join('\n'),
    })

    const dialog = document.body.querySelector('.prompt-preview-dialog')
    const headings = Array.from(dialog?.querySelectorAll('h1, h2') ?? []).map(
      (heading) => heading.textContent,
    )

    expect(headings).toEqual(['输出格式', '真实标题'])
    expect(dialog?.textContent).toContain('# 企业发展历程')
    expect(dialog?.textContent).toContain('## 产品力分析')
    expect(dialog?.textContent).toContain('# 内部推理')
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
