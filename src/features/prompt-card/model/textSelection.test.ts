import { describe, expect, it } from 'vitest'
import { createTextSelection, replaceTextSelection } from './textSelection'

describe('text selection helpers', () => {
  it('creates a non-empty text selection', () => {
    expect(createTextSelection('abcdef', 1, 4)).toEqual({
      start: 1,
      end: 4,
      text: 'bcd',
    })
    expect(createTextSelection('abcdef', 2, 2)).toBeUndefined()
  })

  it('replaces only the selected text range', () => {
    expect(
      replaceTextSelection('优化这段提示词', { start: 2, end: 4 }, '那一小段'),
    ).toBe('优化那一小段提示词')
  })
})
