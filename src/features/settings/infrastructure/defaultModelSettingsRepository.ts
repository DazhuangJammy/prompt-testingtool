import { db } from '@/shared/storage/db'
import type { DefaultModelSettings } from '@/shared/types'
import { nowIso } from '@/shared/utils/time'
import {
  createDefaultModelSettings,
  DEFAULT_MODEL_SETTINGS_ID,
  normalizeDefaultModelSettings,
} from '../model/defaultModelSettings'

export const defaultModelSettingsRepository = {
  async get() {
    const existing = await db.defaultModelSettings.get(DEFAULT_MODEL_SETTINGS_ID)
    return existing ? normalizeDefaultModelSettings(existing) : undefined
  },

  async save(settings: DefaultModelSettings) {
    await db.defaultModelSettings.put(
      normalizeDefaultModelSettings({
        ...settings,
        updatedAt: nowIso(),
      }),
    )
  },

  async ensure() {
    const existing = await this.get()
    if (existing) return existing

    const next = createDefaultModelSettings()
    await db.defaultModelSettings.put(next)
    return next
  },
}
