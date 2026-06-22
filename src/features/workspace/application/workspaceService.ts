import { workspaceRepository } from '@/features/workspace/infrastructure/workspaceRepository'
import {
  repairAllLegacyTopicScopes,
  repairLegacyTopicScope,
} from '@/features/workspace/infrastructure/legacyTopicScopeRepair'
import {
  createDuplicateChatSessionSortOrder,
  createDuplicateChatSessionTitle,
} from '@/features/chat/model/chatSessionOrdering'
import { createReorderedCanvasSortUpdates } from '@/features/workspace/model/canvasOrdering'
import type {
  Canvas,
  ChatTopicExportPayload,
  ChatSession,
  ExportPayload,
  InputCard,
  PromptCard,
} from '@/shared/types'
import { nowIso } from '@/shared/utils/time'

export async function createNextCanvas(canvases: Canvas[]) {
  return workspaceRepository.createCanvas(`画布 ${canvases.length + 1}`)
}

export async function reorderCanvases(
  canvases: Canvas[],
  draggedId: string,
  targetId: string,
) {
  const updates = createReorderedCanvasSortUpdates(canvases, draggedId, targetId)
  if (!updates.length) return
  await workspaceRepository.updateCanvasSortOrders(updates)
}

export async function addPromptCardToCanvas(
  canvasId: string | undefined,
  promptCards: PromptCard[],
  position?: PromptCard['position'],
  topicSessionId?: string,
) {
  if (!canvasId) return undefined
  const scopedPromptCards = topicSessionId
    ? promptCards.filter((card) => card.topicSessionId === topicSessionId)
    : promptCards
  return workspaceRepository.createPromptCard(
    canvasId,
    scopedPromptCards.length,
    position,
    topicSessionId,
  )
}

export async function addInputCardToCanvas(
  canvasId: string | undefined,
  inputCards: InputCard[],
  position?: InputCard['position'],
  topicSessionId?: string,
) {
  if (!canvasId) return undefined
  const scopedInputCards = topicSessionId
    ? inputCards.filter((card) => card.topicSessionId === topicSessionId)
    : inputCards
  return workspaceRepository.createInputCard(
    canvasId,
    scopedInputCards.length,
    position,
    topicSessionId,
  )
}

export async function deleteCanvasAndPickNext(id: string, canvases: Canvas[]) {
  const remaining = canvases.filter((canvas) => canvas.id !== id)
  await workspaceRepository.deleteCanvasCascade(id)
  return remaining[0]?.id
}

export async function importWorkspaceFile(file: File) {
  const text = await file.text()
  await workspaceRepository.importWorkspace(JSON.parse(text) as ExportPayload)
  const nextCanvases = await workspaceRepository.listCanvasesByUpdatedAt()
  return nextCanvases[0]?.id
}

export async function createWorkspaceExport() {
  const payload = await workspaceRepository.exportWorkspace()
  return {
    filename: `prompt-canvas-${new Date().toISOString().slice(0, 10)}.json`,
    text: JSON.stringify(payload, null, 2),
  }
}

export async function createChatTopicExport(sessionId: string) {
  const payload = await workspaceRepository.exportChatTopic(sessionId)
  return {
    filename: `prompt-topic-${safeFilename(payload.chatSession.title)}-${new Date()
      .toISOString()
      .slice(0, 10)}.json`,
    text: JSON.stringify(payload, null, 2),
  }
}

export async function duplicateChatTopic(
  session: ChatSession,
  siblingSessions: ChatSession[],
  comparePaneCardIds: string[] = [],
) {
  const payload = await workspaceRepository.exportChatTopic(session.id)
  const at = nowIso()
  const includedPromptCardIds = new Set(payload.promptCards.map((card) => card.id))
  const extraPromptCardIds = uniqueStrings(comparePaneCardIds)
    .filter((cardId) => cardId && !includedPromptCardIds.has(cardId))
  const availablePromptCards = extraPromptCardIds.length && session.canvasId
    ? await workspaceRepository.listPromptCardsByCanvas(session.canvasId)
    : payload.promptCards
  const extraPromptCards = collectExtraPromptCards(
    extraPromptCardIds,
    availablePromptCards,
  )
  const nextSession: ChatSession = {
    ...payload.chatSession,
    title: createDuplicateChatSessionTitle(
      payload.chatSession.title,
      siblingSessions.map((item) => item.title),
    ),
    sortOrder: createDuplicateChatSessionSortOrder(session, siblingSessions),
    createdAt: at,
    updatedAt: at,
  }
  const result = await workspaceRepository.importChatTopic(
    {
      ...payload,
      chatSession: nextSession,
      promptCards: [...payload.promptCards, ...extraPromptCards],
    },
    session.canvasId ?? payload.chatSession.canvasId,
  )
  return {
    ...nextSession,
    id: result.sessionId,
    canvasId: result.canvasId,
    promptCardId: result.promptCardId,
    promptCardIdMap: result.promptCardIdMap,
  }
}

function collectExtraPromptCards(
  cardIds: string[],
  availableCards: PromptCard[],
) {
  const cardById = new Map(availableCards.map((card) => [card.id, card]))
  return cardIds
    .map((cardId) => cardById.get(cardId))
    .filter((card): card is PromptCard => Boolean(card))
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values))
}

export async function assignPromptCardToChatTopic(
  promptCardId: string | undefined,
  sessionId: string,
) {
  if (!promptCardId) return
  await workspaceRepository.assignPromptCardToTopic(promptCardId, sessionId)
}

export async function repairLegacyChatTopicScope(sessionId?: string) {
  if (!sessionId) return
  await repairLegacyTopicScope(sessionId)
}

export async function repairLegacyWorkspaceTopicScopes() {
  await repairAllLegacyTopicScopes()
}

export async function importChatTopicFile(file: File, targetCanvasId?: string) {
  const text = await file.text()
  const payload = JSON.parse(text) as ChatTopicExportPayload
  return workspaceRepository.importChatTopic(payload, targetCanvasId)
}

function safeFilename(value: string) {
  return (value.trim() || 'topic')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 42)
}
