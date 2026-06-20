import type { ChatSession, PromptCard } from '@/shared/types'

export function resolveSidebarSessions({
  fallbackPromptCards,
  promptCards,
  sessions,
}: {
  fallbackPromptCards: PromptCard[]
  promptCards?: PromptCard[]
  sessions: ChatSession[]
}) {
  const sessionCanvasByPromptCard = new Map(
    (promptCards ?? fallbackPromptCards).map((card) => [card.id, card.canvasId]),
  )
  const sessionCanvasByTopic = new Map(
    (promptCards ?? fallbackPromptCards)
      .filter((card) => card.topicSessionId)
      .map((card) => [card.topicSessionId, card.canvasId]),
  )

  return sessions.map((session) =>
    session.canvasId
      ? session
      : {
          ...session,
          canvasId: session.promptCardId
            ? sessionCanvasByPromptCard.get(session.promptCardId)
            : sessionCanvasByTopic.get(session.id),
        },
  )
}
