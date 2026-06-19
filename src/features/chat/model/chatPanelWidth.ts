export const DEFAULT_CHAT_PANEL_WIDTH = 360
export const MIN_CHAT_PANEL_WIDTH = 280

export type ChatPanelWidthMap = Record<string, number>

const storageKey = 'prompt-chat-panel-width-by-session'

export function getChatPanelWidthStorageKey() {
  return storageKey
}

export function normalizeChatPanelWidths(value: unknown): ChatPanelWidthMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  return Object.fromEntries(
    Object.entries(value)
      .map(([sessionId, width]) => [sessionId.trim(), normalizeChatPanelWidth(width)])
      .filter(
        (entry): entry is [string, number] =>
          Boolean(entry[0]) && typeof entry[1] === 'number',
      ),
  )
}

export function resolveChatPanelWidth(
  current: ChatPanelWidthMap,
  sessionId?: string,
  fallbackWidth = DEFAULT_CHAT_PANEL_WIDTH,
) {
  if (!sessionId) return fallbackWidth
  return current[sessionId] ?? fallbackWidth
}

export function setChatPanelWidth(
  current: ChatPanelWidthMap,
  sessionId: string | undefined,
  width: number,
) {
  const normalizedWidth = normalizeChatPanelWidth(width)
  if (!sessionId || normalizedWidth === undefined) return current
  return {
    ...current,
    [sessionId]: normalizedWidth,
  }
}

export function copyChatPanelWidth(
  current: ChatPanelWidthMap,
  sourceSessionId: string,
  targetSessionId: string,
  fallbackWidth = DEFAULT_CHAT_PANEL_WIDTH,
) {
  return setChatPanelWidth(
    current,
    targetSessionId,
    resolveChatPanelWidth(current, sourceSessionId, fallbackWidth),
  )
}

function normalizeChatPanelWidth(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : undefined
}
