import { db } from '@/shared/storage/db'
import type {
  SkillGraph,
  SkillLabMessage,
  SkillsLabSettings,
  SkillTopic,
} from '@/shared/types'
import { nowIso } from '@/shared/utils/time'
import { normalizeSkillsLabSettings } from '@/features/skills-lab/model/skillSettings'
import {
  createDuplicateSkillTopicTitle,
  getSkillTopicTitleFromPath,
  sortSkillTopicsForSidebar,
} from '@/features/skills-lab/model/skillTopic'

export const skillsLabRepository = {
  async createTopic(title?: string, skillPath?: string) {
    const at = nowIso()
    const topics = await db.skillTopics.toArray()
    const topic: SkillTopic = {
      id: crypto.randomUUID(),
      title: title?.trim() || getSkillTopicTitleFromPath(skillPath),
      skillPath: skillPath?.trim() || undefined,
      status: 'idle',
      sortOrder: topics.length + 1,
      createdAt: at,
      updatedAt: at,
    }
    await db.skillTopics.add(topic)
    return topic
  },

  async duplicateTopic(source: SkillTopic) {
    const at = nowIso()
    const topics = await db.skillTopics.toArray()
    const siblingTitles = topics.map((topic) => topic.title)
    const topic: SkillTopic = {
      ...source,
      id: crypto.randomUUID(),
      title: createDuplicateSkillTopicTitle(source.title, siblingTitles),
      status: 'idle',
      error: undefined,
      sortOrder: topics.length + 1,
      createdAt: at,
      updatedAt: at,
    }
    const messages = await db.skillLabMessages
      .where('topicId')
      .equals(source.id)
      .toArray()
    const copiedMessages = messages.map((message): SkillLabMessage => ({
      ...message,
      id: crypto.randomUUID(),
      topicId: topic.id,
    }))

    await db.transaction('rw', [db.skillTopics, db.skillLabMessages], async () => {
      await db.skillTopics.add(topic)
      if (copiedMessages.length) await db.skillLabMessages.bulkAdd(copiedMessages)
    })

    return topic
  },

  async deleteTopicCascade(topicId: string) {
    await db.transaction('rw', [db.skillTopics, db.skillLabMessages, db.skillAnalysisSnapshots], async () => {
      await db.skillLabMessages.where('topicId').equals(topicId).delete()
      await db.skillAnalysisSnapshots.where('topicId').equals(topicId).delete()
      await db.skillTopics.delete(topicId)
    })
  },

  async listTopics() {
    return sortSkillTopicsForSidebar(await db.skillTopics.toArray())
  },

  async getTopic(topicId: string) {
    return db.skillTopics.get(topicId)
  },

  async renameTopic(topicId: string, title: string) {
    await db.skillTopics.update(topicId, {
      title: title.trim() || '未命名 Skills 话题',
      updatedAt: nowIso(),
    })
  },

  async updateTopic(topicId: string, updates: Partial<SkillTopic>) {
    await db.skillTopics.update(topicId, {
      ...updates,
      updatedAt: nowIso(),
    })
  },

  async updateTopicSortOrders(updates: { id: string; sortOrder: number }[]) {
    if (!updates.length) return
    const at = nowIso()
    await db.transaction('rw', db.skillTopics, async () => {
      await Promise.all(
        updates.map((update) =>
          db.skillTopics.update(update.id, {
            sortOrder: update.sortOrder,
            updatedAt: at,
          }),
        ),
      )
    })
  },

  async bindSkillPath(topicId: string, skillPath: string) {
    const topic = await db.skillTopics.get(topicId)
    await db.skillTopics.update(topicId, {
      skillPath: skillPath.trim(),
      agentSessionId:
        topic?.skillPath && topic.skillPath !== skillPath.trim()
          ? undefined
          : topic?.agentSessionId,
      title:
        topic?.title && topic.title !== '未绑定 Skill'
          ? topic.title
          : getSkillTopicTitleFromPath(skillPath),
      error: undefined,
      status: 'idle',
      updatedAt: nowIso(),
    })
  },

  async removeSkillBinding(topicId: string) {
    await db.skillTopics.update(topicId, {
      skillPath: undefined,
      agentSessionId: undefined,
      graph: undefined,
      lastAnalysisAt: undefined,
      lastFileSignature: undefined,
      status: 'idle',
      error: undefined,
      updatedAt: nowIso(),
    })
  },

  async saveAnalysis(topicId: string, graph: SkillGraph, fileSignature?: string) {
    const at = nowIso()
    await db.transaction('rw', [db.skillTopics, db.skillAnalysisSnapshots], async () => {
      await db.skillTopics.update(topicId, {
        graph,
        lastAnalysisAt: graph.generatedAt,
        lastFileSignature: fileSignature,
        status: 'idle',
        error: undefined,
        updatedAt: at,
      })
      await db.skillAnalysisSnapshots.add({
        id: crypto.randomUUID(),
        topicId,
        graph,
        fileSignature,
        createdAt: at,
      })
    })
  },

  async saveAnalysisWithTopicUpdates(
    topicId: string,
    graph: SkillGraph,
    fileSignature: string | undefined,
    updates: Partial<SkillTopic>,
  ) {
    const at = nowIso()
    await db.transaction('rw', [db.skillTopics, db.skillAnalysisSnapshots], async () => {
      await db.skillTopics.update(topicId, {
        ...updates,
        graph,
        lastAnalysisAt: graph.generatedAt,
        lastFileSignature: fileSignature,
        status: 'idle',
        error: undefined,
        updatedAt: at,
      })
      await db.skillAnalysisSnapshots.add({
        id: crypto.randomUUID(),
        topicId,
        graph,
        fileSignature,
        createdAt: at,
      })
    })
  },

  async addMessage(message: Omit<SkillLabMessage, 'id' | 'createdAt'>) {
    const nextMessage: SkillLabMessage = {
      ...message,
      id: crypto.randomUUID(),
      createdAt: nowIso(),
    }
    await db.skillLabMessages.add(nextMessage)
    await db.skillTopics.update(message.topicId, { updatedAt: nextMessage.createdAt })
    return nextMessage
  },

  async updateMessage(messageId: string, updates: Partial<SkillLabMessage>) {
    await db.skillLabMessages.update(messageId, updates)
  },

  async clearMessages(topicId: string) {
    await db.skillLabMessages.where('topicId').equals(topicId).delete()
  },

  async listMessages(topicId: string) {
    return db.skillLabMessages.where('topicId').equals(topicId).sortBy('createdAt')
  },

  async getSettings() {
    const settings = await db.skillsLabSettings.get('skills-lab')
    return normalizeSkillsLabSettings(settings)
  },

  async ensureSettings() {
    const settings = await db.skillsLabSettings.get('skills-lab')
    if (!settings) await db.skillsLabSettings.put(normalizeSkillsLabSettings())
  },

  async saveSettings(settings: SkillsLabSettings) {
    await db.skillsLabSettings.put(normalizeSkillsLabSettings(settings))
  },
}
