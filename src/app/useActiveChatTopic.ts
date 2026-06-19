import { useEffect, useState } from 'react'
import type { ChatSession } from '@/shared/types'

const storageKey = 'prompt-active-chat-topic'

export interface ActiveChatTopic {
  canvasId?: string
  sessionId?: string
}

interface ResolveActiveChatSessionIdOptions {
  activeChatTopic: ActiveChatTopic
  effectiveCanvasId?: string
  pendingSessionId?: string
  sessions: Pick<ChatSession, 'canvasId' | 'id'>[]
  sidebarSessionsLoaded: boolean
}

function readActiveChatTopic(): ActiveChatTopic {
  try {
    const stored = localStorage.getItem(storageKey)
    if (!stored) return {}
    const parsed = JSON.parse(stored) as ActiveChatTopic
    return {
      canvasId: typeof parsed.canvasId === 'string' ? parsed.canvasId : undefined,
      sessionId: typeof parsed.sessionId === 'string' ? parsed.sessionId : undefined,
    }
  } catch {
    return {}
  }
}

export function useActiveChatTopic() {
  const [activeChatTopic, setActiveChatTopic] =
    useState<ActiveChatTopic>(readActiveChatTopic)

  useEffect(() => {
    try {
      if (activeChatTopic.canvasId || activeChatTopic.sessionId) {
        localStorage.setItem(storageKey, JSON.stringify(activeChatTopic))
      } else {
        localStorage.removeItem(storageKey)
      }
    } catch {
      // Storage can be unavailable in restricted browser modes.
    }
  }, [activeChatTopic])

  return [activeChatTopic, setActiveChatTopic] as const
}

export function resolveActiveChatSessionId({
  activeChatTopic,
  effectiveCanvasId,
  pendingSessionId,
  sessions,
  sidebarSessionsLoaded,
}: ResolveActiveChatSessionIdOptions) {
  const restoredActiveSession = sessions.find(
    (session) => session.id === activeChatTopic.sessionId,
  )
  const restoredSessionIdForCanvas =
    activeChatTopic.canvasId === effectiveCanvasId
      ? activeChatTopic.sessionId
      : undefined

  if (restoredActiveSession?.canvasId === effectiveCanvasId) {
    return activeChatTopic.sessionId
  }
  if (restoredSessionIdForCanvas && restoredSessionIdForCanvas === pendingSessionId) {
    return restoredSessionIdForCanvas
  }
  if (!sidebarSessionsLoaded) {
    return restoredSessionIdForCanvas
  }
  return sessions.find((session) => session.canvasId === effectiveCanvasId)?.id
}
