import type { ChatSession, PromptCard } from '@/shared/types'

interface ResolveActiveChatCardOptions {
  chatPromptCards: PromptCard[]
  selectedCard?: PromptCard
  session?: ChatSession
  sessionPromptCard?: PromptCard
}

export function resolveActiveChatCard({
  chatPromptCards,
  selectedCard,
  session,
  sessionPromptCard,
}: ResolveActiveChatCardOptions) {
  const cards = chatPromptCards.length
    ? chatPromptCards
    : uniqueCards([selectedCard, sessionPromptCard])
  const selectedCardForSession = isSelectableForSession(selectedCard, session)
    ? selectedCard
    : undefined
  const selectedCardInTopic = findCard(cards, selectedCard?.id)
  const sessionCardInTopic = findCard(cards, session?.promptCardId)

  return (
    selectedCardInTopic ??
    selectedCardForSession ??
    sessionCardInTopic ??
    sessionPromptCard ??
    cards[0]
  )
}

export function resolveChatScopePromptCardId({
  selectedCard,
  session,
}: Pick<ResolveActiveChatCardOptions, 'selectedCard' | 'session'>) {
  return session?.promptCardId ?? selectedCard?.id
}

function findCard(cards: PromptCard[], id?: string) {
  if (!id) return undefined
  return cards.find((card) => card.id === id)
}

function isSelectableForSession(
  card: PromptCard | undefined,
  session: ChatSession | undefined,
) {
  if (!card) return false
  if (!session) return true
  if (card.topicSessionId) return card.topicSessionId === session.id
  return !session.canvasId || card.canvasId === session.canvasId
}

function uniqueCards(cards: Array<PromptCard | undefined>) {
  return Array.from(
    new Map(
      cards
        .filter((card): card is PromptCard => Boolean(card))
        .map((card) => [card.id, card]),
    ).values(),
  )
}
