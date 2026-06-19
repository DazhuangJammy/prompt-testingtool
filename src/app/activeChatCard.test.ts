import { describe, expect, it } from 'vitest'
import type { ChatSession, PromptCard } from '@/shared/types'
import { resolveActiveChatCard } from './activeChatCard'

const makeCard = (id: string, title = id): PromptCard => ({
  id,
  canvasId: 'canvas',
  title,
  position: { x: 0, y: 0 },
  sections: {},
  createdAt: 'now',
  updatedAt: 'now',
})

describe('active chat card', () => {
  it('uses the selected topic card for the next single-chat prompt', () => {
    const firstCard = makeCard('card-1', '无角色')
    const selectedCard = makeCard('card-2', '有角色')
    const session: ChatSession = {
      id: 'session',
      canvasId: 'canvas',
      promptCardId: firstCard.id,
      title: '话题',
      createdAt: 'now',
      updatedAt: 'now',
    }

    expect(
      resolveActiveChatCard({
        chatPromptCards: [firstCard, selectedCard],
        selectedCard,
        session,
        sessionPromptCard: firstCard,
      }),
    ).toBe(selectedCard)
  })

  it('falls back to the session card when the selected card is outside the topic', () => {
    const sessionCard = makeCard('card-1', '无角色')
    const outsideCard = {
      ...makeCard('card-3', '其他话题'),
      topicSessionId: 'other-session',
    }
    const session: ChatSession = {
      id: 'session',
      canvasId: 'canvas',
      promptCardId: sessionCard.id,
      title: '话题',
      createdAt: 'now',
      updatedAt: 'now',
    }

    expect(
      resolveActiveChatCard({
        chatPromptCards: [sessionCard],
        selectedCard: outsideCard,
        session,
        sessionPromptCard: sessionCard,
      }),
    ).toBe(sessionCard)
  })

  it('allows selected legacy canvas cards to drive the next single-chat prompt', () => {
    const sessionCard = makeCard('card-1', '无角色')
    const selectedLegacyCard = makeCard('card-2', '旧卡片')
    const session: ChatSession = {
      id: 'session',
      canvasId: 'canvas',
      promptCardId: sessionCard.id,
      title: '话题',
      createdAt: 'now',
      updatedAt: 'now',
    }

    expect(
      resolveActiveChatCard({
        chatPromptCards: [sessionCard],
        selectedCard: selectedLegacyCard,
        session,
        sessionPromptCard: sessionCard,
      }),
    ).toBe(selectedLegacyCard)
  })
})
