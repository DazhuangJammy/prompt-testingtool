import { describe, expect, it } from 'vitest'
import { createChatSession } from './chatSession'

describe('chat session model', () => {
  it('creates a chat session entity', () => {
    const session = createChatSession('canvas-1', '测试', 'card-1')

    expect(session.canvasId).toBe('canvas-1')
    expect(session.promptCardId).toBe('card-1')
    expect(session.title).toBe('测试')
  })
})
