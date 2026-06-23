import type { SetStateAction } from 'react'
import { assignChatSessionPromptCard } from '@/features/chat/application/chatService'
import {
  MAX_COMPARE_PANES,
  canRemoveComparePane as canRemovePane,
  createComparePane,
  pickCardForPane,
  removeComparePaneById,
  type ComparePaneId,
  type ComparePaneState,
  type ComparePaneView,
} from '@/features/chat/model/comparePanes'
import { normalizeThinkingMode } from '@/shared/model/thinking'
import type {
  ChatAttachment,
  PromptCard,
  PromptInjectionMode,
  ProviderConfig,
  ThinkingMode,
} from '@/shared/types'

interface UseComparePaneActionsOptions {
  activeCard?: PromptCard
  activeSessionId?: string
  comparePanes: ComparePaneState[]
  paneViews: ComparePaneView[]
  promptCards: PromptCard[]
  provider?: ProviderConfig
  setComparePanes: (updater: SetStateAction<ComparePaneState[]>) => void
  stopGeneration: (requestKey: ComparePaneId) => void
  onActiveCardChange?: (id: string) => void
  onCompareOpenChange?: (open: boolean) => void
}

export function useComparePaneActions({
  activeCard,
  activeSessionId,
  comparePanes,
  paneViews,
  promptCards,
  provider,
  setComparePanes,
  stopGeneration,
  onActiveCardChange,
  onCompareOpenChange,
}: UseComparePaneActionsOptions) {
  const updateComparePane = (
    paneId: ComparePaneId,
    updates: Partial<ComparePaneState>,
  ) => {
    setComparePanes((current) =>
      current.map((pane) =>
        pane.id === paneId
          ? {
              ...pane,
              ...updates,
            }
          : pane,
      ),
    )
  }

  const setComparePaneCard = (paneId: ComparePaneId, cardId: string) => {
    const pane = comparePanes.find((item) => item.id === paneId)
    updateComparePane(paneId, { cardId })
    if (pane?.sessionId && pane.parentSessionId === activeSessionId) {
      void assignChatSessionPromptCard(pane.sessionId, cardId)
    }
  }

  const setComparePaneProvider = (paneId: ComparePaneId, providerId: string) => {
    updateComparePane(paneId, { attachments: [], providerId })
  }

  const setComparePaneThinkingMode = (
    paneId: ComparePaneId,
    mode: ThinkingMode,
  ) => {
    const pane = paneViews.find((item) => item.id === paneId)
    updateComparePane(paneId, {
      thinkingMode: normalizeThinkingMode(pane?.provider, mode),
    })
  }

  const setComparePanePromptInjectionMode = (
    paneId: ComparePaneId,
    mode: PromptInjectionMode,
  ) => {
    updateComparePane(paneId, { promptInjectionMode: mode })
  }

  const addComparePane = () => {
    setComparePanes((current) => {
      if (current.length >= MAX_COMPARE_PANES) return current
      const activeCardId = activeCard?.id ?? promptCards[0]?.id
      return [
        ...current,
        createComparePane({
          cardId: pickCardForPane(current.length, current, promptCards, activeCardId),
          providerId: provider?.id,
        }),
      ]
    })
  }

  const removeComparePane = (paneId: ComparePaneId) => {
    const result = removeComparePaneById(comparePanes, paneId)
    if (!result.removed) return

    stopGeneration(paneId)
    setComparePanes(result.panes)

    if (result.shouldExitCompare) {
      onCompareOpenChange?.(false)
      const remaining = result.panes[0]
      const remainingCardId =
        remaining?.cardId ?? paneViews.find((pane) => pane.id === remaining?.id)?.card?.id
      if (remainingCardId) onActiveCardChange?.(remainingCardId)
    }
  }

  const setComparePaneAttachments = (
    paneId: ComparePaneId,
    value: ChatAttachment[],
  ) => updateComparePane(paneId, { attachments: value })

  const setComparePaneInput = (paneId: ComparePaneId, value: string) =>
    updateComparePane(paneId, { input: value })

  return {
    addComparePane,
    canAddComparePane: comparePanes.length < MAX_COMPARE_PANES,
    canRemoveComparePane: canRemovePane(comparePanes),
    removeComparePane,
    setComparePaneAttachments,
    setComparePaneCard,
    setComparePaneInput,
    setComparePanePromptInjectionMode,
    setComparePaneProvider,
    setComparePaneThinkingMode,
    updateComparePane,
  }
}
