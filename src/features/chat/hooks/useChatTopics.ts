import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import {
  createChatTopic,
  deleteChatTopicAndPickNext,
  renameChatTopic,
} from '@/features/chat/application/chatService'
import { chatRepository } from '@/features/chat/infrastructure/chatRepository'
import type { ChatSession } from '@/shared/types'

export function useChatTopics(
  canvasId: string | undefined,
  activeSessionId?: string,
  onActiveSessionChange?: (id?: string) => void,
  promptCardId?: string,
) {
  const [internalSessionId, setInternalSessionId] = useState<string>()
  const sessions = useLiveQuery<ChatSession[], ChatSession[]>(
    () =>
      canvasId
        ? chatRepository.listSessionsByCanvas(canvasId)
        : Promise.resolve([] as ChatSession[]),
    [canvasId],
    [],
  )
  const selectedSessionId = activeSessionId ?? internalSessionId
  const effectiveSessionId = pickSessionId(sessions, selectedSessionId)

  const setMainSessionId = (id?: string) => {
    setInternalSessionId(id)
    onActiveSessionChange?.(id)
  }

  const createMainTopic = async (title?: string) => {
    if (!canvasId) return
    const session = await createChatTopic(canvasId, title, promptCardId)
    setMainSessionId(session.id)
  }

  const renameMainTopic = async (id: string, title: string) => {
    await renameChatTopic(id, title)
  }

  const deleteMainTopic = async (id: string) => {
    const nextSessionId = await deleteChatTopicAndPickNext({
      activeSessionId: effectiveSessionId,
      sessions,
      sessionId: id,
    })
    if (effectiveSessionId === id) setMainSessionId(nextSessionId)
  }

  return {
    createMainTopic,
    deleteMainTopic,
    effectiveSessionId,
    renameMainTopic,
    sessions,
    setMainSessionId,
  }
}

function pickSessionId(sessions: ChatSession[] | undefined, id?: string) {
  const visibleSessions = sessions?.filter((session) => !session.hidden)
  return visibleSessions?.some((session) => session.id === id)
    ? id
    : visibleSessions?.[0]?.id
}
