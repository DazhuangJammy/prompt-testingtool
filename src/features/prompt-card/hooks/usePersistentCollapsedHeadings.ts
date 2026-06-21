import { useCallback, useMemo, useState } from 'react'
import {
  collectMarkdownOutlineNodeIds,
  getPromptCardCollapsedMarkdownHeadingIds,
  hasPromptCardCollapsedMarkdownHeadingState,
  type MarkdownOutlineNode,
  updatePromptCollapsedMarkdownHeadingIds,
} from '@/features/prompt-card/model/prompt'
import type { PromptCard } from '@/shared/types'

interface UsePersistentCollapsedHeadingsInput {
  card: PromptCard
  generating: boolean
  nodes: MarkdownOutlineNode[]
  onChange: (card: PromptCard) => void
}

export function usePersistentCollapsedHeadings({
  card,
  generating,
  nodes,
  onChange,
}: UsePersistentCollapsedHeadingsInput) {
  const hasPersistedState = hasPromptCardCollapsedMarkdownHeadingState(card)
  const persistedHeadingIds = useMemo(
    () => getPromptCardCollapsedMarkdownHeadingIds(card),
    [card],
  )
  const defaultHeadingIds = useMemo(() => collectMarkdownOutlineNodeIds(nodes), [nodes])
  const baseCollapsedHeadingIds = useMemo(() => {
    if (hasPersistedState) return new Set(persistedHeadingIds)
    if (card.defaultCollapsed && !generating) return new Set(defaultHeadingIds)
    return new Set<string>()
  }, [
    card.defaultCollapsed,
    defaultHeadingIds,
    generating,
    hasPersistedState,
    persistedHeadingIds,
  ])
  const [localOverride, setLocalOverride] = useState<{
    cardId: string
    headingIds: Set<string>
  }>()
  const collapsedHeadingIds =
    localOverride?.cardId === card.id
      ? localOverride.headingIds
      : baseCollapsedHeadingIds

  const setLocalCollapsedHeadingIds = useCallback(
    (headingIds: Set<string>) => {
      setLocalOverride({
        cardId: card.id,
        headingIds: new Set(headingIds),
      })
    },
    [card.id],
  )

  const persistCollapsedHeadingIds = useCallback(
    (headingIds: Set<string>) => {
      setLocalCollapsedHeadingIds(headingIds)
      onChange(updatePromptCollapsedMarkdownHeadingIds(card, headingIds))
    },
    [card, onChange, setLocalCollapsedHeadingIds],
  )

  const toggleHeadingCollapse = useCallback(
    (id: string) => {
      const next = new Set(collapsedHeadingIds)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      persistCollapsedHeadingIds(next)
    },
    [collapsedHeadingIds, persistCollapsedHeadingIds],
  )

  return {
    collapsedHeadingIds,
    persistCollapsedHeadingIds,
    setLocalCollapsedHeadingIds,
    toggleHeadingCollapse,
  }
}
