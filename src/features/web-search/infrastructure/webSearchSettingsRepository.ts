import { db } from '@/shared/storage/db'
import type { WebSearchSettings } from '@/shared/types'
import { nowIso } from '@/shared/utils/time'
import {
  WEB_SEARCH_SETTINGS_ID,
  createDefaultWebSearchSettings,
  normalizeWebSearchSettings,
} from '../model/webSearchSettings'

export const webSearchSettingsRepository = {
  async get() {
    const existing = await db.webSearchSettings.get(WEB_SEARCH_SETTINGS_ID)
    if (!existing) return undefined
    return normalizeWebSearchSettings(existing)
  },

  async save(settings: WebSearchSettings) {
    await db.webSearchSettings.put(
      normalizeWebSearchSettings({
        ...settings,
        updatedAt: nowIso(),
      }),
    )
  },

  async ensure() {
    const existing = await this.get()
    if (existing) return existing

    const next = createDefaultWebSearchSettings()
    await db.webSearchSettings.put(next)
    return next
  },
}
