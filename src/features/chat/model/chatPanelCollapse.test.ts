import { describe, expect, it } from 'vitest'
import {
  copyChatPanelCollapsed,
  normalizeChatPanelCollapse,
  resolveChatPanelCollapsed,
  setChatPanelCollapsed,
} from './chatPanelCollapse'

describe('chat panel collapse', () => {
  it('stores collapsed state per visible chat session', () => {
    const collapsed = setChatPanelCollapsed({}, 'a', true)
    const expanded = setChatPanelCollapsed(collapsed, 'b', false)

    expect(resolveChatPanelCollapsed(expanded, 'a', false)).toBe(true)
    expect(resolveChatPanelCollapsed(expanded, 'b', true)).toBe(false)
    expect(resolveChatPanelCollapsed(expanded, 'c', true)).toBe(true)
  })

  it('copies collapsed state when duplicating a chat session', () => {
    const collapsed = setChatPanelCollapsed({}, 'a', true)
    const copied = copyChatPanelCollapsed(collapsed, 'a', 'b', false)

    expect(copied).toEqual({ a: true, b: true })
  })

  it('normalizes persisted collapsed state', () => {
    expect(
      normalizeChatPanelCollapse({ a: true, b: false, c: 'yes', '': true }),
    ).toEqual({
      a: true,
      b: false,
    })
  })
})
