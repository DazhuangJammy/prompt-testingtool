import { afterEach, describe, expect, it } from 'vitest'
import { placeTextControlCaret, resizeTextAreaToContent } from './textCaret'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('placeTextControlCaret', () => {
  it('scrolls a long textarea to the requested caret offset', () => {
    const textarea = document.createElement('textarea')
    textarea.value = Array.from({ length: 80 }, (_, index) => {
      return `第 ${index + 1} 行内容`
    }).join('\n')
    textarea.style.fontSize = '20px'
    textarea.style.lineHeight = '20px'
    textarea.style.paddingTop = '0px'
    document.body.append(textarea)
    Object.defineProperties(textarea, {
      clientHeight: { configurable: true, value: 120 },
      clientWidth: { configurable: true, value: 320 },
    })

    const targetOffset = textarea.value.indexOf('第 60 行内容')
    placeTextControlCaret(textarea, targetOffset)

    expect(textarea.selectionStart).toBe(targetOffset)
    expect(textarea.scrollTop).toBeGreaterThan(0)
  })

  it('clamps caret offsets to the text control value length', () => {
    const input = document.createElement('input')
    input.value = 'abc'
    document.body.append(input)

    placeTextControlCaret(input, 99)

    expect(input.selectionStart).toBe(3)
  })

  it('resizes a textarea to fit its content height', () => {
    const textarea = document.createElement('textarea')
    textarea.style.borderTopWidth = '1px'
    textarea.style.borderBottomWidth = '1px'
    Object.defineProperty(textarea, 'scrollHeight', {
      configurable: true,
      value: 180,
    })

    resizeTextAreaToContent(textarea, { minHeight: 80 })

    expect(textarea.style.height).toBe('182px')
    expect(textarea.style.overflowY).toBe('hidden')
  })

  it('caps textarea height when a max height is provided', () => {
    const textarea = document.createElement('textarea')
    Object.defineProperty(textarea, 'scrollHeight', {
      configurable: true,
      value: 300,
    })

    resizeTextAreaToContent(textarea, { minHeight: 80, maxHeight: 120 })

    expect(textarea.style.height).toBe('120px')
    expect(textarea.style.overflowY).toBe('auto')
  })
})
