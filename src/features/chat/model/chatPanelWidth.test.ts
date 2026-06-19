import { describe, expect, it } from 'vitest'
import {
  copyChatPanelWidth,
  normalizeChatPanelWidths,
  resolveChatPanelWidth,
  setChatPanelWidth,
} from './chatPanelWidth'

describe('chat panel width', () => {
  it('stores panel width per chat session and copies it once', () => {
    const opened = setChatPanelWidth({}, 'a', 1142)
    const copied = copyChatPanelWidth(opened, 'a', 'b')
    const resizedCopy = setChatPanelWidth(copied, 'b', 761)

    expect(resolveChatPanelWidth(opened, 'a')).toBe(1142)
    expect(copied).toEqual({ a: 1142, b: 1142 })
    expect(resizedCopy).toEqual({ a: 1142, b: 761 })
  })

  it('normalizes persisted widths', () => {
    expect(normalizeChatPanelWidths({ a: 720, b: -1, c: 'wide', '': 300 })).toEqual({
      a: 720,
    })
  })
})
