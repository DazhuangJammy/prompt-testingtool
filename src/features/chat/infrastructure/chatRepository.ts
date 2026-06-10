import { db } from '@/shared/storage/db'
import type {
  ChatMessage,
  ChatSession,
  CompareRun,
  PromptVersion,
} from '@/shared/types'
import { nowIso } from '@/shared/utils/time'

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

  async saveCompareRun(run: CompareRun) {
    await db.compareRuns.add(run)
  },

  async savePromptVersion(version: PromptVersion) {
    await db.promptVersions.add(version)
  },

  async updateSessionAfterReply(sessionId: string, title: string) {
    await db.chatSessions.update(sessionId, {
      updatedAt: nowIso(),
      title: title.slice(0, 20) || '测试',
    })
  },

  async updateMessageContent(id: string, content: string) {
    await db.chatMessages.update(id, { content })
  },

  async updateAssistantMessage(
    id: string,
    updates: Pick<ChatMessage, 'content'> &
      Partial<Pick<ChatMessage, 'status' | 'thinkingDurationMs'>>,
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

  async listMessagesBySession(sessionId: string) {
    return db.chatMessages.where('sessionId').equals(sessionId).sortBy('createdAt')
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
