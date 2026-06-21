import type { ChatAttachment, PromptInjectionMode, ThinkingMode } from '@/shared/types'
import {
  MAX_COMPARE_PANES,
  areComparePanesEqual,
  createComparePane,
  type ComparePaneState,
} from './comparePanes'

export type ChatComparePaneMap = Record<string, ComparePaneState[]>

const storageKey = 'prompt-chat-compare-panes-by-session'

export function getChatComparePanesStorageKey() {
  return storageKey
}

export function normalizeChatComparePanes(value: unknown): ChatComparePaneMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  return Object.fromEntries(
    Object.entries(value)
      .map(([sessionId, panes]) => ({
        panes: normalizeComparePanes(panes),
        sessionId: sessionId.trim(),
      }))
      .filter((entry) => entry.sessionId && entry.panes.length)
      .map(({ sessionId, panes }) => [sessionId, panes]),
  )
}

export function resolveChatComparePanes(
  current: ChatComparePaneMap,
  sessionId?: string,
) {
  return sessionId ? (current[sessionId] ?? []) : []
}

export function setChatComparePanes(
  current: ChatComparePaneMap,
  sessionId: string | undefined,
  panes: ComparePaneState[] | ((current: ComparePaneState[]) => ComparePaneState[]),
) {
  if (!sessionId) return current

  const currentPanes = current[sessionId] ?? []
  const normalizedPanes = normalizeComparePanes(
    typeof panes === 'function' ? panes(currentPanes) : panes,
  )
  const next = { ...current }

  if (normalizedPanes.length) next[sessionId] = normalizedPanes
  else delete next[sessionId]

  return areComparePanesEqual(currentPanes, next[sessionId] ?? []) ? current : next
}

export function copyChatComparePanes(
  current: ChatComparePaneMap,
  sourceSessionId: string,
  targetSessionId: string,
  cardIdMap: Record<string, string> = {},
  sourceCardIds: string[] = [],
) {
  return setChatComparePanes(
    current,
    targetSessionId,
    (current[sourceSessionId] ?? []).map((pane, index) => {
      const cardId = sourceCardIds[index] || pane.cardId
      return createComparePane({
        ...pane,
        cardId: cardId ? (cardIdMap[cardId] ?? cardId) : undefined,
      })
    }),
  )
}

export function getComparePaneStateKey(panes: ComparePaneState[]) {
  return JSON.stringify(
    panes.map((pane) => ({
      id: pane.id,
      attachments: pane.attachments,
      cardId: pane.cardId,
      input: pane.input,
      parentSessionId: pane.parentSessionId,
      promptInjectionMode: pane.promptInjectionMode,
      providerId: pane.providerId,
      sessionId: pane.sessionId,
      thinkingMode: pane.thinkingMode,
    })),
  )
}

function normalizeComparePanes(value: unknown) {
  if (!Array.isArray(value)) return []

  return value
    .slice(0, MAX_COMPARE_PANES)
    .map(normalizeComparePane)
    .filter((pane): pane is ComparePaneState => Boolean(pane))
}

function normalizeComparePane(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>
  const id = normalizeString(record.id)

  return createComparePane({
    id: id || undefined,
    attachments: normalizeAttachments(record.attachments),
    cardId: normalizeString(record.cardId),
    input: normalizeString(record.input) ?? '',
    parentSessionId: normalizeString(record.parentSessionId),
    promptInjectionMode: normalizePromptInjectionMode(record.promptInjectionMode),
    providerId: normalizeString(record.providerId),
    sessionId: normalizeString(record.sessionId),
    thinkingMode: normalizeThinkingMode(record.thinkingMode),
  })
}

function normalizeAttachments(value: unknown): ChatAttachment[] {
  if (!Array.isArray(value)) return []

  return value
    .map(normalizeAttachment)
    .filter((item): item is ChatAttachment => Boolean(item))
}

function normalizeAttachment(value: unknown): ChatAttachment | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>
  const id = normalizeString(record.id)
  const name = normalizeString(record.name)
  const mimeType = normalizeString(record.mimeType)
  const kind = record.kind

  if (!id || !name || !mimeType) return undefined
  if (kind !== 'image' && kind !== 'text' && kind !== 'document') return undefined

  return {
    id,
    name,
    mimeType,
    size: typeof record.size === 'number' && Number.isFinite(record.size)
      ? record.size
      : 0,
    kind,
    dataUrl: normalizeString(record.dataUrl),
    text: normalizeString(record.text),
  }
}

function normalizePromptInjectionMode(value: unknown): PromptInjectionMode {
  return value === 'user' ? 'user' : 'system'
}

function normalizeThinkingMode(value: unknown): ThinkingMode | undefined {
  return value === 'auto' ||
    value === 'off' ||
    value === 'light' ||
    value === 'on' ||
    value === 'deep'
    ? value
    : undefined
}

function normalizeString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}
