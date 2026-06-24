import { db } from '@/shared/storage/db'
import type { QuickPhrase, QuickPhraseGroup } from '@/shared/types'
import { nowIso } from '@/shared/utils/time'
import {
  createQuickPhrase,
  createQuickPhraseGroup,
  getNextSortOrder,
  normalizeQuickPhrase,
  normalizeQuickPhraseGroup,
  sortQuickPhraseGroups,
  sortQuickPhrases,
  type QuickPhraseDraft,
  type QuickPhraseGroupDraft,
} from '../model/quickPhrases'

export const quickPhraseRepository = {
  async listGroups() {
    return sortQuickPhraseGroups(await db.quickPhraseGroups.toArray())
  },

  async listPhrases() {
    return sortQuickPhrases(await db.quickPhrases.toArray())
  },

  async createGroup(draft: QuickPhraseGroupDraft) {
    const groups = await this.listGroups()
    const group = createQuickPhraseGroup(draft, getNextSortOrder(groups))
    await db.quickPhraseGroups.add(group)
    return group
  },

  async updateGroup(id: string, updates: Partial<QuickPhraseGroup>) {
    const existing = await db.quickPhraseGroups.get(id)
    if (!existing) return
    await db.quickPhraseGroups.put(
      normalizeQuickPhraseGroup({
        ...existing,
        ...updates,
        updatedAt: nowIso(),
      }),
    )
  },

  async deleteGroup(id: string) {
    await db.transaction('rw', db.quickPhraseGroups, db.quickPhrases, async () => {
      await db.quickPhraseGroups.delete(id)
      await db.quickPhrases.where('groupId').equals(id).modify((phrase) => {
        delete phrase.groupId
        phrase.updatedAt = nowIso()
      })
    })
  },

  async createPhrase(draft: QuickPhraseDraft) {
    const phrases = await this.listPhrases()
    const phrase = createQuickPhrase(draft, getNextSortOrder(phrases))
    await db.quickPhrases.add(phrase)
    return phrase
  },

  async updatePhrase(id: string, updates: Partial<QuickPhrase>) {
    const existing = await db.quickPhrases.get(id)
    if (!existing) return
    await db.quickPhrases.put(
      normalizeQuickPhrase({
        ...existing,
        ...updates,
        updatedAt: nowIso(),
      }),
    )
  },

  async deletePhrase(id: string) {
    await db.quickPhrases.delete(id)
  },
}
