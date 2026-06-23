import { db } from '@/shared/storage/db'
import type {
  ChatMessage,
  ChatSession,
  CompareRun,
  PromptVersion,
} from '@/shared/types'
import { nowIso } from '@/shared/utils/time'
import { sortChatSessionsForSidebar } from '@/features/chat/model/chatSessionOrdering'

export const chatRepository = {
  async addMessage(message: ChatMessage) {
    await db.chatMessages.add(message)
  },

  async clearMessages(sessionId: string) {
    await db.chatMessages.where('sessionId').equals(sessionId).delete()
  },

  async createSession(session: ChatSession) {
    await db.chatSessions.add(session)
  },

  async deleteSessionCascade(sessionId: string) {
    const childSessions = await db.chatSessions
      .where('parentSessionId')
      .equals(sessionId)
      .toArray()
    const sessionIds = [sessionId, ...childSessions.map((session) => session.id)]

    await Promise.all([
      db.chatMessages.where('sessionId').anyOf(sessionIds).delete(),
      db.chatSessions.where('parentSessionId').equals(sessionId).delete(),
      db.chatSessions.delete(sessionId),
    ])
  },

  async saveCompareRun(run: CompareRun) {
    await db.compareRuns.add(run)
  },

  async savePromptVersion(version: PromptVersion) {
    await db.promptVersions.add(version)
  },

  async updateSessionAfterReply(sessionId: string) {
    await db.chatSessions.update(sessionId, {
      updatedAt: nowIso(),
    })
  },

  async getSession(sessionId: string) {
    return db.chatSessions.get(sessionId)
  },

  async updateSessionTitle(sessionId: string, title: string) {
    await db.chatSessions.update(sessionId, {
      title: title.trim() || '未命名话题',
      updatedAt: nowIso(),
    })
  },

  async updateSessionSortOrders(updates: { id: string; sortOrder: number }[]) {
    if (!updates.length) return
    const at = nowIso()
    await db.transaction('rw', db.chatSessions, async () => {
      await Promise.all(
        updates.map((update) =>
          db.chatSessions.update(update.id, {
            sortOrder: update.sortOrder,
            updatedAt: at,
          }),
        ),
      )
    })
  },

  async updateSessionPromptCard(sessionId: string, promptCardId: string) {
    await db.chatSessions.update(sessionId, {
      promptCardId,
      updatedAt: nowIso(),
    })
  },

  async updateMessageContent(id: string, content: string) {
    await db.chatMessages.update(id, { content })
  },

  async updateAssistantMessage(
    id: string,
    updates: Pick<ChatMessage, 'content'> &
      Partial<Pick<ChatMessage, 'knowledgeReferences' | 'status' | 'thinkingDurationMs'>>,
  ) {
    await db.chatMessages.update(id, updates)
  },

  async deleteMessagesAfter(sessionId: string, createdAt: string) {
    await db.chatMessages
      .where('sessionId')
      .equals(sessionId)
      .filter((message) => message.createdAt > createdAt)
      .delete()
  },

  async listSessionsByPromptCard(promptCardId: string) {
    return db.chatSessions
      .where('promptCardId')
      .equals(promptCardId)
      .reverse()
      .sortBy('updatedAt')
  },

  async listSessionsByCanvas(canvasId: string) {
    const cards = await db.promptCards.where('canvasId').equals(canvasId).toArray()
    const cardIds = cards.map((card) => card.id)
    const [canvasSessions, legacySessions] = await Promise.all([
      db.chatSessions.where('canvasId').equals(canvasId).toArray(),
      cardIds.length
        ? db.chatSessions.where('promptCardId').anyOf(cardIds).toArray()
        : Promise.resolve([] as ChatSession[]),
    ])

    return uniqueSessions([...canvasSessions, ...legacySessions])
      .filter((session) => !session.hidden)
  },

  async listSessionsByUpdatedAt() {
    const sessions = await db.chatSessions.toArray()
    return sortChatSessionsForSidebar(
      sessions.filter((session) => !session.hidden),
    )
  },

  async listMessagesBySession(sessionId: string) {
    return db.chatMessages.where('sessionId').equals(sessionId).sortBy('createdAt')
  },

  async listChildSessions(parentSessionId: string) {
    return db.chatSessions
      .where('parentSessionId')
      .equals(parentSessionId)
      .toArray()
  },

  async listVersionsByPromptCard(promptCardId: string) {
    return db.promptVersions
      .where('promptCardId')
      .equals(promptCardId)
      .reverse()
      .sortBy('createdAt')
  },

  async listCompareRunsByPromptCard(promptCardId: string) {
    return db.compareRuns
      .where('promptCardId')
      .equals(promptCardId)
      .reverse()
      .sortBy('createdAt')
  },
}

function uniqueSessions(sessions: ChatSession[]) {
  return sortChatSessionsForSidebar(
    Array.from(new Map(sessions.map((session) => [session.id, session])).values()),
  )
}
