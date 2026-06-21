import {
  getChatComparePaneCardsStorageKey,
  normalizeChatComparePaneCards,
  type ChatComparePaneCardMap,
} from '@/features/chat/model/chatComparePaneCards'
import {
  getChatComparePanesStorageKey,
  normalizeChatComparePanes,
  type ChatComparePaneMap,
} from '@/features/chat/model/chatComparePanes'
import {
  getChatCompareModeStorageKey,
  normalizeChatCompareMode,
  type ChatCompareModeMap,
} from '@/features/chat/model/chatCompareMode'
import {
  getChatPanelCollapseStorageKey,
  normalizeChatPanelCollapse,
  type ChatPanelCollapseMap,
} from '@/features/chat/model/chatPanelCollapse'
import {
  getChatPanelWidthStorageKey,
  normalizeChatPanelWidths,
  type ChatPanelWidthMap,
} from '@/features/chat/model/chatPanelWidth'

export function readStoredCompareMode() {
  return readStoredJson(getChatCompareModeStorageKey(), normalizeChatCompareMode)
}

export function writeStoredCompareMode(compareOpenBySession: ChatCompareModeMap) {
  writeStoredJson(getChatCompareModeStorageKey(), compareOpenBySession)
}

export function readStoredComparePaneCards() {
  return readStoredJson(
    getChatComparePaneCardsStorageKey(),
    normalizeChatComparePaneCards,
  )
}

export function writeStoredComparePaneCards(
  comparePaneCardsBySession: ChatComparePaneCardMap,
) {
  writeStoredJson(getChatComparePaneCardsStorageKey(), comparePaneCardsBySession)
}

export function readStoredComparePanes() {
  return readStoredJson(getChatComparePanesStorageKey(), normalizeChatComparePanes)
}

export function writeStoredComparePanes(comparePanesBySession: ChatComparePaneMap) {
  writeStoredJson(getChatComparePanesStorageKey(), comparePanesBySession)
}

export function readStoredChatPanelWidths() {
  return readStoredJson(getChatPanelWidthStorageKey(), normalizeChatPanelWidths)
}

export function writeStoredChatPanelWidths(chatWidthBySession: ChatPanelWidthMap) {
  writeStoredJson(getChatPanelWidthStorageKey(), chatWidthBySession)
}

export function readStoredChatPanelCollapse() {
  return readStoredJson(
    getChatPanelCollapseStorageKey(),
    normalizeChatPanelCollapse,
  )
}

export function writeStoredChatPanelCollapse(
  chatCollapsedBySession: ChatPanelCollapseMap,
) {
  writeStoredJson(getChatPanelCollapseStorageKey(), chatCollapsedBySession)
}

function readStoredJson<T>(key: string, normalize: (value: unknown) => T) {
  try {
    return normalize(JSON.parse(localStorage.getItem(key) ?? '{}'))
  } catch {
    return normalize(undefined)
  }
}

function writeStoredJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage can be unavailable in restricted browser modes.
  }
}
