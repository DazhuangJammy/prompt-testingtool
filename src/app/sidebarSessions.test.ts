import { describe, expect, it } from 'vitest'
import { resolveSidebarSessions } from './sidebarSessions'

describe('resolveSidebarSessions', () => {
  it('uses all prompt cards to attach legacy sessions to their canvas', () => {
    const sessions = resolveSidebarSessions({
      fallbackPromptCards: [{ id: 'current-card', canvasId: 'current-canvas' } as never],
      promptCards: [{ id: 'legacy-card', canvasId: 'legacy-canvas' } as never],
      sessions: [
        {
          id: 'legacy-session',
          promptCardId: 'legacy-card',
          title: '测试',
          createdAt: 'now',
          updatedAt: 'now',
        },
      ],
    })

    expect(sessions[0]).toMatchObject({
      id: 'legacy-session',
      canvasId: 'legacy-canvas',
    })
  })

  it('keeps existing canvas ids and falls back to current canvas cards while loading', () => {
    const sessions = resolveSidebarSessions({
      fallbackPromptCards: [{ id: 'card', canvasId: 'fallback-canvas' } as never],
      sessions: [
        {
          id: 'session',
          promptCardId: 'card',
          title: '测试',
          createdAt: 'now',
          updatedAt: 'now',
        },
        {
          id: 'scoped-session',
          canvasId: 'existing-canvas',
          promptCardId: 'card',
          title: '已归属',
          createdAt: 'now',
          updatedAt: 'now',
        },
      ],
    })

    expect(sessions[0].canvasId).toBe('fallback-canvas')
    expect(sessions[1].canvasId).toBe('existing-canvas')
  })

  it('uses card topic scope to attach older sessions without a prompt card id', () => {
    const sessions = resolveSidebarSessions({
      fallbackPromptCards: [],
      promptCards: [
        {
          id: 'topic-card',
          canvasId: 'topic-canvas',
          topicSessionId: 'legacy-session',
        } as never,
      ],
      sessions: [
        {
          id: 'legacy-session',
          title: '测试',
          createdAt: 'now',
          updatedAt: 'now',
        },
      ],
    })

    expect(sessions[0].canvasId).toBe('topic-canvas')
  })
})
