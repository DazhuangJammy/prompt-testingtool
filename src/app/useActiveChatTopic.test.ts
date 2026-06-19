import { describe, expect, it } from 'vitest'
import { resolveActiveChatSessionId } from './useActiveChatTopic'

describe('active chat topic', () => {
  it('keeps a newly duplicated topic active while the live session list is catching up', () => {
    expect(
      resolveActiveChatSessionId({
        activeChatTopic: { canvasId: 'canvas', sessionId: 'copied-session' },
        effectiveCanvasId: 'canvas',
        pendingSessionId: 'copied-session',
        sessions: [{ id: 'first-session', canvasId: 'canvas' }],
        sidebarSessionsLoaded: true,
      }),
    ).toBe('copied-session')
  })

  it('falls back to the first canvas topic when the restored topic is stale', () => {
    expect(
      resolveActiveChatSessionId({
        activeChatTopic: { canvasId: 'canvas', sessionId: 'deleted-session' },
        effectiveCanvasId: 'canvas',
        sessions: [{ id: 'first-session', canvasId: 'canvas' }],
        sidebarSessionsLoaded: true,
      }),
    ).toBe('first-session')
  })
})
