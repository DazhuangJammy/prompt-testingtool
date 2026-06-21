import {
  MAX_COMPARE_PANES,
  areComparePanesEqual,
  resolvePaneCard,
  type ComparePaneState,
} from './comparePanes'
import type { PromptCard } from '@/shared/types'

export type ChatComparePaneCardMap = Record<string, string[]>

const storageKey = 'prompt-chat-compare-pane-cards-by-session'

export function getChatComparePaneCardsStorageKey() {
  return storageKey
}

export function normalizeChatComparePaneCards(value: unknown): ChatComparePaneCardMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  return Object.fromEntries(
    Object.entries(value)
      .map(([sessionId, cardIds]) => ({
        cardIds: normalizeComparePaneCardIds(cardIds),
        sessionId: sessionId.trim(),
      }))
      .filter(
        (entry) => entry.sessionId && entry.cardIds.some(Boolean),
      )
      .map(({ sessionId, cardIds }) => [sessionId, cardIds]),
  )
}

export function resolveChatComparePaneCards(
  current: ChatComparePaneCardMap,
  sessionId?: string,
) {
  return sessionId ? (current[sessionId] ?? []) : []
}

export function mergeComparePaneCardIds(
  cardIds: string[],
  panes: ComparePaneState[],
) {
  const merged = Array.from(
    { length: Math.max(cardIds.length, panes.length) },
    (_, index) => cardIds[index] || panes[index]?.cardId || '',
  )
  while (merged.length && !merged[merged.length - 1]) merged.pop()
  return merged
}

export function resolveVisibleComparePaneCardIds(
  cardIds: string[],
  panes: ComparePaneState[],
  activeCard: PromptCard | undefined,
  promptCards: PromptCard[],
) {
  const mergedCardIds = mergeComparePaneCardIds(cardIds, panes)
  const panesWithResolvedCards = [...panes]
  const resolvedCardIds = Array.from(
    { length: Math.max(mergedCardIds.length, panesWithResolvedCards.length) },
    (_, index) => {
      const pane = panesWithResolvedCards[index]
      const cardId = mergedCardIds[index] || pane?.cardId
      const resolvedCardId = cardId || (
        pane
          ? resolvePaneCard(
              pane,
              index,
              activeCard,
              promptCards,
              panesWithResolvedCards,
            )?.id
          : undefined
      ) || ''

      if (pane && resolvedCardId && resolvedCardId !== pane.cardId) {
        panesWithResolvedCards[index] = { ...pane, cardId: resolvedCardId }
      }
      return resolvedCardId
    },
  )

  while (resolvedCardIds.length && !resolvedCardIds[resolvedCardIds.length - 1]) {
    resolvedCardIds.pop()
  }
  return resolvedCardIds
}

export function setChatComparePaneCards(
  current: ChatComparePaneCardMap,
  sessionId: string | undefined,
  cardIds: string[],
) {
  if (!sessionId) return current
  const normalizedCardIds = normalizeComparePaneCardIds(cardIds)
  const next = { ...current }

  if (!normalizedCardIds.some(Boolean)) delete next[sessionId]
  else next[sessionId] = normalizedCardIds

  return arePaneCardIdsEqual(current[sessionId] ?? [], next[sessionId] ?? [])
    ? current
    : next
}

export function copyChatComparePaneCards(
  current: ChatComparePaneCardMap,
  sourceSessionId: string,
  targetSessionId: string,
  cardIdMap: Record<string, string> = {},
  sourcePanes: ComparePaneState[] = [],
  sourceCardIds: string[] = [],
) {
  const cardIds = sourceCardIds.length
    ? normalizeComparePaneCardIds(sourceCardIds)
    : mergeComparePaneCardIds(current[sourceSessionId] ?? [], sourcePanes)
  return setChatComparePaneCards(
    current,
    targetSessionId,
    cardIds.map((cardId) => cardIdMap[cardId] ?? cardId),
  )
}

export function applyPersistedComparePaneCardIds(
  panes: ComparePaneState[],
  cardIds: string[],
) {
  if (!cardIds.length) return panes

  const nextPanes = panes.map((pane, index) => {
    const cardId = cardIds[index]
    return cardId && cardId !== pane.cardId ? { ...pane, cardId } : pane
  })
  return areComparePanesEqual(panes, nextPanes) ? panes : nextPanes
}

export function resetComparePaneCardScope(panes: ComparePaneState[]) {
  const nextPanes = panes.map((pane) =>
    pane.cardId || pane.parentSessionId || pane.sessionId
      ? {
          ...pane,
          cardId: undefined,
          parentSessionId: undefined,
          sessionId: undefined,
        }
      : pane,
  )
  return areComparePanesEqual(panes, nextPanes) ? panes : nextPanes
}

export function arePaneCardIdsEqual(left: string[], right: string[]) {
  const maxLength = Math.max(left.length, right.length)
  for (let index = 0; index < maxLength; index += 1) {
    if ((left[index] ?? '') !== (right[index] ?? '')) return false
  }
  return true
}

function normalizeComparePaneCardIds(value: unknown) {
  if (!Array.isArray(value)) return []

  const cardIds = value
    .slice(0, MAX_COMPARE_PANES)
    .map((cardId) => (typeof cardId === 'string' ? cardId.trim() : ''))
  while (cardIds.length && !cardIds[cardIds.length - 1]) cardIds.pop()
  return cardIds
}
