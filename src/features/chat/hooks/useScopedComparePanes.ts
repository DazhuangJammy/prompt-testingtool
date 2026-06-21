import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react'
import {
  applyPersistedComparePaneCardIds,
  arePaneCardIdsEqual,
  resetComparePaneCardScope,
} from '@/features/chat/model/chatComparePaneCards'
import { getComparePaneStateKey } from '@/features/chat/model/chatComparePanes'
import {
  areComparePanesEqual,
  createInitialComparePanes,
  syncComparePanes,
  type ComparePaneState,
} from '@/features/chat/model/comparePanes'
import type { ChatSession, PromptCard } from '@/shared/types'

interface UseScopedComparePanesOptions {
  activeCard?: PromptCard
  activeSessionId?: string
  childSessions: ChatSession[]
  compareOpen: boolean
  comparePaneCardIds: string[]
  persistedComparePanes: ComparePaneState[]
  promptCards: PromptCard[]
  onComparePaneCardIdsChange?: (cardIds: string[]) => void
  onComparePanesChange?: (
    panes: ComparePaneState[] | ((current: ComparePaneState[]) => ComparePaneState[]),
  ) => void
}

export function useScopedComparePanes({
  activeCard,
  activeSessionId,
  childSessions,
  compareOpen,
  comparePaneCardIds,
  persistedComparePanes,
  promptCards,
  onComparePaneCardIdsChange,
  onComparePanesChange,
}: UseScopedComparePanesOptions) {
  const [comparePanes, setComparePanes] = useState<ComparePaneState[]>(() =>
    persistedComparePanes.length ? persistedComparePanes : createInitialComparePanes(),
  )
  const comparePanesRef = useRef(comparePanes)
  const persistedPaneCardKey = comparePaneCardIds.join('|')
  const paneCardScopeKey = activeSessionId
    ? `${activeSessionId}:${persistedPaneCardKey}`
    : ''
  const persistedPaneStateKey = getComparePaneStateKey(persistedComparePanes)
  const paneScopeKey = activeSessionId ? `${activeSessionId}:${persistedPaneStateKey}` : ''
  const lastAppliedPaneCardKey = useRef<string | undefined>(undefined)
  const lastAppliedPaneScopeKey = useRef<string | undefined>(undefined)
  const pendingPaneCardApplyKey = useRef<string | undefined>(undefined)

  useEffect(() => {
    comparePanesRef.current = comparePanes
  }, [comparePanes])

  const commitComparePanes = useCallback(
    (updater: SetStateAction<ComparePaneState[]>) => {
      const current = comparePanesRef.current
      const next = typeof updater === 'function' ? updater(current) : updater
      if (areComparePanesEqual(current, next)) return

      comparePanesRef.current = next
      setComparePanes(next)
      const nextCardIds = next.map((pane) => pane.cardId ?? '')
      if (!arePaneCardIdsEqual(nextCardIds, comparePaneCardIds)) {
        onComparePaneCardIdsChange?.(nextCardIds)
      }
      onComparePanesChange?.(next)
    },
    [comparePaneCardIds, onComparePaneCardIdsChange, onComparePanesChange],
  )

  useEffect(() => {
    if (!activeSessionId || lastAppliedPaneScopeKey.current === paneScopeKey) return
    lastAppliedPaneScopeKey.current = paneScopeKey
    const next = persistedComparePanes.length
      ? persistedComparePanes
      : createInitialComparePanes()
    comparePanesRef.current = next
    setComparePanes(next)
  }, [activeSessionId, paneScopeKey, persistedComparePanes])

  useEffect(() => {
    if (!activeSessionId || lastAppliedPaneCardKey.current === paneCardScopeKey) return
    lastAppliedPaneCardKey.current = paneCardScopeKey
    pendingPaneCardApplyKey.current = paneCardScopeKey
    commitComparePanes((current) =>
      comparePaneCardIds.length
        ? applyPersistedComparePaneCardIds(current, comparePaneCardIds)
        : resetComparePaneCardScope(current),
    )
  }, [activeSessionId, commitComparePanes, comparePaneCardIds, paneCardScopeKey])

  useEffect(() => {
    if (!activeSessionId) return
    const cardIds = comparePanes.map((pane) => pane.cardId ?? '')
    if (pendingPaneCardApplyKey.current === paneCardScopeKey) {
      if (!arePaneCardIdsEqual(cardIds, comparePaneCardIds)) {
        onComparePaneCardIdsChange?.(cardIds)
        pendingPaneCardApplyKey.current = undefined
        return
      }
      pendingPaneCardApplyKey.current = undefined
    }
    if (arePaneCardIdsEqual(cardIds, comparePaneCardIds)) return
    onComparePaneCardIdsChange?.(cardIds)
  }, [
    activeSessionId,
    comparePaneCardIds,
    comparePanes,
    onComparePaneCardIdsChange,
    paneCardScopeKey,
  ])

  useEffect(() => {
    if (!activeCard && !promptCards.length) return
    const syncId = window.setTimeout(() => {
      commitComparePanes((current) =>
        syncComparePanes(
          current,
          activeCard,
          promptCards,
          compareOpen,
          activeSessionId,
          childSessions,
        ),
      )
    }, 0)

    return () => window.clearTimeout(syncId)
  }, [
    activeCard,
    activeSessionId,
    childSessions,
    commitComparePanes,
    compareOpen,
    promptCards,
  ])

  return { comparePanes, setComparePanes: commitComparePanes }
}
