import { describe, expect, it } from 'vitest'
import { createChatSession } from './chatSession'

describe('chat session model', () => {
  it('creates a chat session entity', () => {
    const session = createChatSession('card-1')

    expect(session.promptCardId).toBe('card-1')
    expect(session.title).toBe('测试')
  })
})
