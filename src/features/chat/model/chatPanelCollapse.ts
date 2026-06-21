export type ChatPanelCollapseMap = Record<string, boolean>

const storageKey = 'prompt-chat-panel-collapsed-by-session'

export function getChatPanelCollapseStorageKey() {
  return storageKey
}

export function normalizeChatPanelCollapse(value: unknown): ChatPanelCollapseMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  return Object.fromEntries(
    Object.entries(value)
      .filter(
        (entry): entry is [string, boolean] =>
          Boolean(entry[0].trim()) && typeof entry[1] === 'boolean',
      )
      .map(([sessionId, collapsed]) => [sessionId.trim(), collapsed]),
  )
}

export function resolveChatPanelCollapsed(
  current: ChatPanelCollapseMap,
  sessionId: string | undefined,
  fallback: boolean,
) {
  return sessionId ? (current[sessionId] ?? fallback) : fallback
}

export function setChatPanelCollapsed(
  current: ChatPanelCollapseMap,
  sessionId: string | undefined,
  collapsed: boolean,
) {
  if (!sessionId) return current
  if (current[sessionId] === collapsed) return current
  return {
    ...current,
    [sessionId]: collapsed,
  }
}

export function copyChatPanelCollapsed(
  current: ChatPanelCollapseMap,
  sourceSessionId: string,
  targetSessionId: string,
  fallback: boolean,
) {
  return setChatPanelCollapsed(
    current,
    targetSessionId,
    resolveChatPanelCollapsed(current, sourceSessionId, fallback),
  )
}
