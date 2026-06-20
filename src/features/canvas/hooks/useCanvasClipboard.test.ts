import { afterEach, describe, expect, it, vi } from 'vitest'
import { hasTextSelection } from './useCanvasClipboard'

afterEach(() => {
  document.body.innerHTML = ''
  window.getSelection()?.removeAllRanges()
  vi.restoreAllMocks()
})

describe('useCanvasClipboard text selection guard', () => {
  it('detects selected document text so native copy can continue', () => {
    const text = document.createElement('p')
    text.textContent = '可以复制的生成文案'
    document.body.append(text)

    const range = document.createRange()
    range.selectNodeContents(text)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)

    expect(hasTextSelection()).toBe(true)
  })

  it('detects selected editable text so native copy can continue', () => {
    const textarea = document.createElement('textarea')
    textarea.value = '用户输入的文案'
    document.body.append(textarea)
    textarea.focus()
    textarea.setSelectionRange(0, 2)

    expect(hasTextSelection()).toBe(true)
  })

  it('does not report a text selection when nothing is selected', () => {
    expect(hasTextSelection()).toBe(false)
  })
})
