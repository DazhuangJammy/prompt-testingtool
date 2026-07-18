import { db } from '@/shared/storage/db'
import type {
  ChatKnowledgeSelection,
  KnowledgeBase,
  KnowledgeChunk,
  KnowledgeItem,
} from '@/shared/types'
import { normalizeKnowledgeConfig } from '../model/knowledge'

export const knowledgeRepository = {
  async listBases() {
    const bases = await db.knowledgeBases.orderBy('updatedAt').reverse().toArray()
    return bases.map(normalizeKnowledgeBase)
  },

  async getBase(baseId: string) {
    const base = await db.knowledgeBases.get(baseId)
    return base ? normalizeKnowledgeBase(base) : undefined
  },

  async saveBase(base: KnowledgeBase) {
    await db.knowledgeBases.put(normalizeKnowledgeBase(base))
  },

  async deleteBaseCascade(baseId: string) {
    await db.transaction(
      'rw',
      db.knowledgeBases,
      db.knowledgeItems,
      db.knowledgeChunks,
      db.chatKnowledgeSelections,
      async () => {
        await db.knowledgeBases.delete(baseId)
        await db.knowledgeItems.where('baseId').equals(baseId).delete()
        await db.knowledgeChunks.where('baseId').equals(baseId).delete()
        const selections = await db.chatKnowledgeSelections.toArray()
        await db.chatKnowledgeSelections.bulkPut(
          selections
            .map((selection) => ({
              ...selection,
              baseIds: selection.baseIds.filter((id) => id !== baseId),
            }))
            .filter((selection) => selection.baseIds.length > 0),
        )
        const emptySelectionIds = selections
          .filter((selection) => selection.baseIds.length > 0)
          .filter((selection) => selection.baseIds.every((id) => id === baseId))
          .map((selection) => selection.id)
        if (emptySelectionIds.length) {
          await db.chatKnowledgeSelections.bulkDelete(emptySelectionIds)
        }
      },
    )
  },

  async listItems(baseId: string) {
    return db.knowledgeItems.where('baseId').equals(baseId).sortBy('updatedAt')
  },

  async listAllItems() {
    return db.knowledgeItems.toArray()
  },

  async getItem(itemId: string) {
    return db.knowledgeItems.get(itemId)
  },

  async saveItems(items: KnowledgeItem[]) {
    if (items.length) await db.knowledgeItems.bulkPut(items)
  },

  async replaceBaseItems(baseId: string, items: KnowledgeItem[]) {
    await db.transaction('rw', db.knowledgeItems, db.knowledgeChunks, async () => {
      await db.knowledgeItems.where('baseId').equals(baseId).delete()
      await db.knowledgeChunks.where('baseId').equals(baseId).delete()
      if (items.length) await db.knowledgeItems.bulkPut(items)
    })
  },

  async updateItem(itemId: string, updates: Partial<KnowledgeItem>) {
    await db.knowledgeItems.update(itemId, updates)
  },

  async deleteItems(baseId: string, itemIds: string[]) {
    if (!itemIds.length) return
    await db.transaction('rw', db.knowledgeItems, db.knowledgeChunks, async () => {
      await db.knowledgeItems.where('id').anyOf(itemIds).delete()
      await Promise.all(
        itemIds.map((itemId) =>
          db.knowledgeChunks.where('[baseId+itemId]').equals([baseId, itemId]).delete(),
        ),
      )
    })
  },

  async replaceItemChunks(baseId: string, itemId: string, chunks: KnowledgeChunk[]) {
    await db.transaction('rw', db.knowledgeChunks, async () => {
      await db.knowledgeChunks.where('[baseId+itemId]').equals([baseId, itemId]).delete()
      if (chunks.length) await db.knowledgeChunks.bulkPut(chunks)
    })
  },

  async listChunks(baseId: string, itemId: string) {
    return db.knowledgeChunks
      .where('[baseId+itemId]')
      .equals([baseId, itemId])
      .sortBy('index')
  },

  async listChunksByBase(baseId: string) {
    return db.knowledgeChunks.where('baseId').equals(baseId).toArray()
  },

  async saveChunks(chunks: KnowledgeChunk[]) {
    if (chunks.length) await db.knowledgeChunks.bulkPut(chunks)
  },

  async getSelection(sessionId: string) {
    return db.chatKnowledgeSelections.where('sessionId').equals(sessionId).first()
  },

  async saveSelection(selection: ChatKnowledgeSelection) {
    await db.chatKnowledgeSelections.put(selection)
  },

  async deleteSelection(selectionId: string) {
    await db.chatKnowledgeSelections.delete(selectionId)
  },
}

function normalizeKnowledgeBase(base: KnowledgeBase): KnowledgeBase {
  return {
    ...base,
    config: normalizeKnowledgeConfig(base.config),
  }
}
