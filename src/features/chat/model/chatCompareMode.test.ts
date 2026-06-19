import { describe, expect, it } from 'vitest'
import {
  copyChatCompareOpen,
  normalizeChatCompareMode,
  setChatCompareOpen,
} from './chatCompareMode'

describe('chat compare mode', () => {
  it('stores compare mode per visible chat session', () => {
    const opened = setChatCompareOpen({}, 'a', true)
    const copied = copyChatCompareOpen(opened, 'a', 'b')
    const closedCopy = setChatCompareOpen(copied, 'b', false)

    expect(opened).toEqual({ a: true })
    expect(copied).toEqual({ a: true, b: true })
    expect(closedCopy).toEqual({ a: true })
  })

  it('normalizes persisted state', () => {
    expect(normalizeChatCompareMode({ a: true, b: false, '': true })).toEqual({
      a: true,
    })
    expect(normalizeChatCompareMode(null)).toEqual({})
  })
})
