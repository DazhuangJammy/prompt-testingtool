import { getAttachmentCapability } from '@/features/chat/model/attachments'
import {
  getThinkingCapability,
  normalizeThinkingMode,
} from '@/shared/model/thinking'
import type {
  ChatAttachment,
  ChatMessage,
  ChatSession,
  PromptCard,
  PromptInjectionMode,
  ProviderConfig,
  ThinkingMode,
} from '@/shared/types'
import { createId } from '@/shared/utils/identity'

export const MIN_COMPARE_PANES = 2
export const MIN_RETAINED_COMPARE_PANES = 1
export const MAX_COMPARE_PANES = 6
export const COMPARE_PANE_MIN_WIDTH = 380
export const COMPARE_PANEL_GUTTER = 1

export type ComparePaneId = string
export type ActiveRequest = 'main' | ComparePaneId

export interface ComparePaneState {
  id: ComparePaneId
  attachments: ChatAttachment[]
  cardId?: string
  input: string
  parentSessionId?: string
  promptInjectionMode: PromptInjectionMode
  providerId?: string
  sessionId?: string
  thinkingMode?: ThinkingMode
}

export interface ComparePaneView {
  id: ComparePaneId
  attachments: ChatAttachment[]
  card?: PromptCard
  index: number
  input: string
  messages: ChatMessage[]
  parentSessionId?: string
  promptInjectionMode: PromptInjectionMode
  provider?: ProviderConfig
  sessionId?: string
  attachmentCapability: ReturnType<typeof getAttachmentCapability>
  thinkingCapability: ReturnType<typeof getThinkingCapability>
  thinkingMode: ThinkingMode
}

export function createInitialComparePanes() {
  return Array.from({ length: MIN_COMPARE_PANES }, () => createComparePane())
}

export function createComparePane(
  overrides: Partial<ComparePaneState> = {},
): ComparePaneState {
  return {
    id: `pane-${createId()}`,
    attachments: [],
    input: '',
    promptInjectionMode: 'system',
    ...overrides,
  }
}

export function syncComparePanes(
  current: ComparePaneState[],
  activeCard: PromptCard | undefined,
  promptCards: PromptCard[],
  compareOpen: boolean,
  parentSessionId?: string,
  childSessions: ChatSession[] = [],
) {
  const panes = ensureMinimumComparePanes(current)
  const childSessionByIndex = new Map(
    selectActiveCompareChildSessions(childSessions)
      .map((session) => [session.comparePaneIndex, session]),
  )
  const activeCardId = activeCard?.id ?? promptCards[0]?.id
  const nextPanes = panes.map((pane, index) => {
    const childSession = compareOpen ? childSessionByIndex.get(index) : undefined
    const cardExists = promptCards.some((item) => item.id === pane.cardId)
    const sameParentSession = pane.parentSessionId === parentSessionId
    const nextCardId =
      compareOpen && sameParentSession && cardExists
        ? pane.cardId
        : childSession?.promptCardId ??
          (compareOpen && cardExists
            ? pane.cardId
            : index === 0
              ? activeCardId
              : pickCardForPane(index, panes, promptCards, activeCardId))

    const nextSessionId = childSession?.id

    return nextCardId === pane.cardId &&
      sameParentSession &&
      nextSessionId === pane.sessionId
      ? pane
      : {
          ...pane,
          cardId: nextCardId,
          parentSessionId,
          sessionId: nextSessionId,
        }
  })

  return areComparePanesEqual(current, nextPanes) ? current : nextPanes
}

export function selectActiveCompareChildSessions(childSessions: ChatSession[]) {
  const sessionByIndex = new Map<number, ChatSession>()

  childSessions.forEach((session) => {
    if (typeof session.comparePaneIndex !== 'number') return

    const currentSession = sessionByIndex.get(session.comparePaneIndex)
    if (!currentSession || compareChildSessionFreshness(session, currentSession) > 0) {
      sessionByIndex.set(session.comparePaneIndex, session)
    }
  })

  return Array.from(sessionByIndex.values()).sort(
    (left, right) => left.comparePaneIndex! - right.comparePaneIndex!,
  )
}

function compareChildSessionFreshness(left: ChatSession, right: ChatSession) {
  const updatedCompare = left.updatedAt.localeCompare(right.updatedAt)
  if (updatedCompare !== 0) return updatedCompare
  return left.createdAt.localeCompare(right.createdAt)
}

export function ensureMinimumComparePanes(panes: ComparePaneState[]) {
  if (panes.length >= MIN_COMPARE_PANES) return panes.slice(0, MAX_COMPARE_PANES)

  return [
    ...panes,
    ...Array.from({ length: MIN_COMPARE_PANES - panes.length }, () =>
      createComparePane(),
    ),
  ]
}

export function canRemoveComparePane(panes: ComparePaneState[]) {
  return panes.length > MIN_RETAINED_COMPARE_PANES
}

export function removeComparePaneById(
  panes: ComparePaneState[],
  paneId: ComparePaneId,
) {
  if (!canRemoveComparePane(panes)) {
    return { panes, removed: false, shouldExitCompare: false }
  }

  const nextPanes = panes.filter((pane) => pane.id !== paneId)
  if (nextPanes.length === panes.length) {
    return { panes, removed: false, shouldExitCompare: false }
  }

  return {
    panes: nextPanes,
    removed: true,
    shouldExitCompare: nextPanes.length === MIN_RETAINED_COMPARE_PANES,
  }
}

export function resolvePaneCard(
  pane: ComparePaneState,
  index: number,
  activeCard: PromptCard | undefined,
  promptCards: PromptCard[],
  panes: ComparePaneState[],
) {
  return (
    promptCards.find((item) => item.id === pane.cardId) ??
    promptCards.find(
      (item) => item.id === pickCardForPane(index, panes, promptCards, activeCard?.id),
    ) ??
    activeCard
  )
}

export function pickCardForPane(
  index: number,
  panes: ComparePaneState[],
  promptCards: PromptCard[],
  fallbackId?: string,
) {
  const usedIds = new Set(panes.slice(0, index).map((pane) => pane.cardId))
  return (
    promptCards.find((item) => !usedIds.has(item.id))?.id ??
    promptCards[index]?.id ??
    fallbackId ??
    promptCards[0]?.id
  )
}

export function areComparePanesEqual(
  current: ComparePaneState[],
  next: ComparePaneState[],
) {
  return (
    current.length === next.length &&
    current.every((pane, index) => {
      const nextPane = next[index]
      return (
        pane.id === nextPane.id &&
        pane.attachments === nextPane.attachments &&
        pane.cardId === nextPane.cardId &&
        pane.input === nextPane.input &&
        pane.parentSessionId === nextPane.parentSessionId &&
        pane.promptInjectionMode === nextPane.promptInjectionMode &&
        pane.providerId === nextPane.providerId &&
        pane.sessionId === nextPane.sessionId &&
        pane.thinkingMode === nextPane.thinkingMode
      )
    })
  )
}

export function getProviderThinkingMode(
  provider: ProviderConfig | undefined,
  defaultMode: ThinkingMode,
  modes: Record<string, ThinkingMode>,
) {
  return normalizeThinkingMode(
    provider,
    provider ? (modes[provider.id] ?? defaultMode) : 'off',
  )
}

export function getPaneThinkingMode(
  provider: ProviderConfig | undefined,
  mode: ThinkingMode,
) {
  return normalizeThinkingMode(provider, provider ? mode : 'off')
}

export function getComparePanelWidth(paneCount: number) {
  const count = Math.max(MIN_COMPARE_PANES, Math.min(MAX_COMPARE_PANES, paneCount))
  return count * COMPARE_PANE_MIN_WIDTH + (count - 1) * COMPARE_PANEL_GUTTER
}
