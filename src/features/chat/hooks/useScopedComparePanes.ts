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
  const comparePaneCardIdsRef = useRef(comparePaneCardIds)
  const onComparePaneCardIdsChangeRef = useRef(onComparePaneCardIdsChange)
  const onComparePanesChangeRef = useRef(onComparePanesChange)
  const persistedPaneCardKey = comparePaneCardIds.join('|')
  const hasPersistedPaneState = persistedComparePanes.length > 0
  const paneCardScopeKey = activeSessionId
    ? `${activeSessionId}:${persistedPaneCardKey}:${
        hasPersistedPaneState ? 'pane-state' : 'no-pane-state'
      }`
    : ''
  const persistedPaneStateKey = getComparePaneStateKey(persistedComparePanes)
  const paneScopeKey = activeSessionId ? `${activeSessionId}:${persistedPaneStateKey}` : ''
  const lastAppliedPaneCardKey = useRef<string | undefined>(undefined)
  const lastAppliedPaneScopeKey = useRef<string | undefined>(undefined)
  const pendingPaneCardApplyKey = useRef<string | undefined>(undefined)
  const currentPaneCardKey = comparePanes.map((pane) => pane.cardId ?? '').join('|')

  useEffect(() => {
    comparePanesRef.current = comparePanes
  }, [comparePanes])

  useEffect(() => {
    comparePaneCardIdsRef.current = comparePaneCardIds
    onComparePaneCardIdsChangeRef.current = onComparePaneCardIdsChange
    onComparePanesChangeRef.current = onComparePanesChange
  }, [comparePaneCardIds, onComparePaneCardIdsChange, onComparePanesChange])

  const commitComparePanes = useCallback(
    (updater: SetStateAction<ComparePaneState[]>) => {
      const current = comparePanesRef.current
      const next = typeof updater === 'function' ? updater(current) : updater
      if (areComparePanesEqual(current, next)) return

      comparePanesRef.current = next
      setComparePanes(next)
      const nextCardIds = next.map((pane) => pane.cardId ?? '')
      if (!arePaneCardIdsEqual(nextCardIds, comparePaneCardIdsRef.current)) {
        onComparePaneCardIdsChangeRef.current?.(nextCardIds)
      }
      onComparePanesChangeRef.current?.(next)
    },
    [],
  )

  useEffect(() => {
    if (!activeSessionId || lastAppliedPaneScopeKey.current === paneScopeKey) return
    lastAppliedPaneScopeKey.current = paneScopeKey
    const next = persistedComparePanes.length
      ? persistedComparePanes
      : createInitialComparePanes()
    if (areComparePanesEqual(comparePanesRef.current, next)) {
      comparePanesRef.current = next
      return
    }
    comparePanesRef.current = next
    setComparePanes(next)
  }, [activeSessionId, paneScopeKey, persistedComparePanes])

  useEffect(() => {
    if (!activeSessionId || lastAppliedPaneCardKey.current === paneCardScopeKey) return
    lastAppliedPaneCardKey.current = paneCardScopeKey
    if (!comparePaneCardIds.length && hasPersistedPaneState) return
    pendingPaneCardApplyKey.current = paneCardScopeKey
    commitComparePanes((current) =>
      comparePaneCardIds.length
        ? applyPersistedComparePaneCardIds(current, comparePaneCardIds)
        : resetComparePaneCardScope(current),
    )
  }, [
    activeSessionId,
    commitComparePanes,
    comparePaneCardIds,
    hasPersistedPaneState,
    paneCardScopeKey,
  ])

  useEffect(() => {
    if (!activeSessionId) return
    const cardIds = comparePanesRef.current.map((pane) => pane.cardId ?? '')
    if (pendingPaneCardApplyKey.current === paneCardScopeKey) {
      if (!arePaneCardIdsEqual(cardIds, comparePaneCardIds)) {
        onComparePaneCardIdsChangeRef.current?.(cardIds)
        pendingPaneCardApplyKey.current = undefined
        return
      }
      pendingPaneCardApplyKey.current = undefined
    }
    if (arePaneCardIdsEqual(cardIds, comparePaneCardIds)) return
    onComparePaneCardIdsChangeRef.current?.(cardIds)
  }, [
    activeSessionId,
    comparePaneCardIds,
    currentPaneCardKey,
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
