import { useEffect, useState } from 'react'
import {
  copyChatComparePaneCards,
  resolveVisibleComparePaneCardIds,
  resolveChatComparePaneCards,
  setChatComparePaneCards,
  type ChatComparePaneCardMap,
} from '@/features/chat/model/chatComparePaneCards'
import {
  copyChatComparePanes,
  resolveChatComparePanes,
  setChatComparePanes,
  type ChatComparePaneMap,
} from '@/features/chat/model/chatComparePanes'
import {
  copyChatCompareOpen,
  setChatCompareOpen,
  type ChatCompareModeMap,
} from '@/features/chat/model/chatCompareMode'
import {
  copyChatPanelCollapsed,
  resolveChatPanelCollapsed,
  setChatPanelCollapsed,
  type ChatPanelCollapseMap,
} from '@/features/chat/model/chatPanelCollapse'
import {
  copyChatPanelWidth,
  resolveChatPanelWidth,
  setChatPanelWidth,
  type ChatPanelWidthMap,
} from '@/features/chat/model/chatPanelWidth'
import type { ComparePaneState } from '@/features/chat/model/comparePanes'
import type { PromptCard } from '@/shared/types'
import {
  readStoredChatPanelCollapse,
  readStoredChatPanelWidths,
  readStoredCompareMode,
  readStoredComparePaneCards,
  readStoredComparePanes,
  writeStoredChatPanelCollapse,
  writeStoredChatPanelWidths,
  writeStoredCompareMode,
  writeStoredComparePaneCards,
  writeStoredComparePanes,
} from './chatPanelStorage'

export function useChatPanelSessionState(
  activeSessionId: string | undefined,
  fallbackCollapsed: boolean,
) {
  const [compareOpenBySession, setCompareOpenBySession] =
    useState<ChatCompareModeMap>(readStoredCompareMode)
  const [comparePaneCardsBySession, setComparePaneCardsBySession] =
    useState<ChatComparePaneCardMap>(readStoredComparePaneCards)
  const [comparePanesBySession, setComparePanesBySession] =
    useState<ChatComparePaneMap>(readStoredComparePanes)
  const [chatWidthBySession, setChatWidthBySession] =
    useState<ChatPanelWidthMap>(readStoredChatPanelWidths)
  const [chatCollapsedBySession, setChatCollapsedBySession] =
    useState<ChatPanelCollapseMap>(readStoredChatPanelCollapse)

  useEffect(() => {
    writeStoredCompareMode(compareOpenBySession)
  }, [compareOpenBySession])

  useEffect(() => {
    writeStoredComparePaneCards(comparePaneCardsBySession)
  }, [comparePaneCardsBySession])

  useEffect(() => {
    writeStoredComparePanes(comparePanesBySession)
  }, [comparePanesBySession])

  useEffect(() => {
    writeStoredChatPanelWidths(chatWidthBySession)
  }, [chatWidthBySession])

  useEffect(() => {
    writeStoredChatPanelCollapse(chatCollapsedBySession)
  }, [chatCollapsedBySession])

  const compareOpen = Boolean(
    activeSessionId && compareOpenBySession[activeSessionId],
  )
  const comparePaneCardIds = resolveChatComparePaneCards(
    comparePaneCardsBySession,
    activeSessionId,
  )
  const comparePanes = resolveChatComparePanes(comparePanesBySession, activeSessionId)
  const chatWidth = resolveChatPanelWidth(chatWidthBySession, activeSessionId)
  const chatCollapsed = resolveChatPanelCollapsed(
    chatCollapsedBySession,
    activeSessionId,
    fallbackCollapsed,
  )

  return {
    chatCollapsed,
    chatWidth,
    compareOpen,
    comparePaneCardIds,
    comparePanes,
    getComparePaneCardIds: (
      sessionId: string,
      activeCard?: PromptCard,
      promptCards: PromptCard[] = [],
    ) => {
      const cardIds = resolveChatComparePaneCards(comparePaneCardsBySession, sessionId)
      const panes = resolveChatComparePanes(comparePanesBySession, sessionId)
      return resolveVisibleComparePaneCardIds(cardIds, panes, activeCard, promptCards)
    },
    copySessionState: (
      sourceSessionId: string,
      targetSessionId: string,
      fallbackWidth: number,
      cardIdMap: Record<string, string> = {},
      sourceCardIds: string[] = [],
    ) => {
      const sourcePanes = resolveChatComparePanes(comparePanesBySession, sourceSessionId)
      setCompareOpenBySession((current) =>
        copyChatCompareOpen(current, sourceSessionId, targetSessionId),
      )
      setComparePaneCardsBySession((current) =>
        copyChatComparePaneCards(
          current,
          sourceSessionId,
          targetSessionId,
          cardIdMap,
          sourcePanes,
          sourceCardIds,
        ),
      )
      setComparePanesBySession((current) =>
        copyChatComparePanes(
          current,
          sourceSessionId,
          targetSessionId,
          cardIdMap,
          sourceCardIds,
        ),
      )
      setChatWidthBySession((current) =>
        copyChatPanelWidth(current, sourceSessionId, targetSessionId, fallbackWidth),
      )
      setChatCollapsedBySession((current) =>
        copyChatPanelCollapsed(
          current,
          sourceSessionId,
          targetSessionId,
          fallbackCollapsed,
        ),
      )
    },
    setChatCollapsed: (collapsed: boolean) => {
      setChatCollapsedBySession((current) =>
        setChatPanelCollapsed(current, activeSessionId, collapsed),
      )
    },
    setChatWidth: (value: number | ((current: number) => number)) => {
      setChatWidthBySession((current) => {
        const nextWidth =
          typeof value === 'function'
            ? value(resolveChatPanelWidth(current, activeSessionId))
            : value
        return setChatPanelWidth(current, activeSessionId, nextWidth)
      })
    },
    setCompareOpen: (open: boolean) => {
      setCompareOpenBySession((current) =>
        setChatCompareOpen(current, activeSessionId, open),
      )
    },
    setComparePaneCardIds: (cardIds: string[]) => {
      setComparePaneCardsBySession((current) =>
        setChatComparePaneCards(current, activeSessionId, cardIds),
      )
    },
    setComparePanes: (
      panes: ComparePaneState[] | ((current: ComparePaneState[]) => ComparePaneState[]),
    ) => {
      setComparePanesBySession((current) =>
        setChatComparePanes(current, activeSessionId, panes),
      )
    },
  }
}
