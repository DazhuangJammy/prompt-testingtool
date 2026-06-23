import { useLiveQuery } from 'dexie-react-hooks'
import { chatRepository } from '@/features/chat/infrastructure/chatRepository'
import type { ChatMessage, ChatSession } from '@/shared/types'
import type {
  ComparePaneId,
  ComparePaneState,
} from '@/features/chat/model/comparePanes'

export function useMessages(sessionId?: string) {
  return useLiveQuery<ChatMessage[], ChatMessage[]>(
    () => sessionId ? chatRepository.listMessagesBySession(sessionId) : Promise.resolve([]),
    [sessionId],
    [],
  )
}

export function useChildSessions(parentSessionId?: string) {
  return useLiveQuery<ChatSession[], ChatSession[]>(
    () => parentSessionId ? chatRepository.listChildSessions(parentSessionId) : Promise.resolve([]),
    [parentSessionId],
    [],
  )
}

export function usePaneMessagesById(comparePanes: ComparePaneState[]) {
  const paneSessionKey = comparePanes
    .map((pane) => `${pane.id}:${pane.sessionId ?? ''}`)
    .join('|')

  return useLiveQuery<
    Record<ComparePaneId, ChatMessage[]>,
    Record<ComparePaneId, ChatMessage[]>
  >(
    async () => {
      const entries = await Promise.all(
        comparePanes.map(async (pane) => [
          pane.id,
          pane.sessionId
            ? await chatRepository.listMessagesBySession(pane.sessionId)
            : [],
        ]),
      )
      return Object.fromEntries(entries)
    },
    [paneSessionKey],
    {},
  )
}
