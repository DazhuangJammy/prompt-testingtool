import { describe, expect, it } from 'vitest'
import { insertQuickPhraseAtCaret } from './quickPhraseInsert'

describe('insertQuickPhraseAtCaret', () => {
  it('inserts phrase content at the caret without replacing nearby text', () => {
    expect(insertQuickPhraseAtCaret('你好世界', '快捷', 2, 2)).toEqual({
      value: '你好快捷世界',
      caretOffset: 4,
    })
  })

  it('replaces the selected range and moves caret after the inserted content', () => {
    expect(insertQuickPhraseAtCaret('hello world', 'there', 6, 11)).toEqual({
      value: 'hello there',
      caretOffset: 11,
    })
  })

  it('appends when no caret is available', () => {
    expect(insertQuickPhraseAtCaret('abc', 'd', undefined, undefined)).toEqual({
      value: 'abcd',
      caretOffset: 4,
    })
  })
})
