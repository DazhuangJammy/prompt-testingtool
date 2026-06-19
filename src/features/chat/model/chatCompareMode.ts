export type ChatCompareModeMap = Record<string, boolean>

const storageKey = 'prompt-chat-compare-open-by-session'

export function getChatCompareModeStorageKey() {
  return storageKey
}

export function normalizeChatCompareMode(value: unknown): ChatCompareModeMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  return Object.fromEntries(
    Object.entries(value)
      .filter(([sessionId, open]) => sessionId.trim() && open === true)
      .map(([sessionId]) => [sessionId, true]),
  )
}

export function setChatCompareOpen(
  current: ChatCompareModeMap,
  sessionId: string | undefined,
  open: boolean,
) {
  if (!sessionId) return current
  if (open) return { ...current, [sessionId]: true }

  const next = { ...current }
  delete next[sessionId]
  return next
}

export function copyChatCompareOpen(
  current: ChatCompareModeMap,
  sourceSessionId: string,
  targetSessionId: string,
) {
  return setChatCompareOpen(current, targetSessionId, Boolean(current[sourceSessionId]))
}
