import { db } from '@/shared/storage/db'
import type { DefaultModelSettings } from '@/shared/types'
import { nowIso } from '@/shared/utils/time'
import {
  createDefaultModelSettings,
  createFlowchartModelSettings,
  DEFAULT_MODEL_SETTINGS_ID,
  FLOWCHART_MODEL_SETTINGS_ID,
  normalizeDefaultModelSettings,
} from '../model/defaultModelSettings'

export const defaultModelSettingsRepository = {
  async get(id = DEFAULT_MODEL_SETTINGS_ID) {
    const existing = await db.defaultModelSettings.get(id)
    if (!existing) return undefined
    return persistUpgradedFlowchartSettings(existing)
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

  async ensureFlowchart() {
    const existing = await this.get(FLOWCHART_MODEL_SETTINGS_ID)
    if (existing) return existing

    const next = createFlowchartModelSettings()
    await db.defaultModelSettings.put(next)
    return next
  },
}

async function persistUpgradedFlowchartSettings(settings: DefaultModelSettings) {
  const normalized = normalizeDefaultModelSettings(settings)
  if (
    normalized.id !== FLOWCHART_MODEL_SETTINGS_ID ||
    normalized.prompt === settings.prompt
  ) {
    return normalized
  }

  const upgraded = {
    ...normalized,
    updatedAt: nowIso(),
  }
  await db.defaultModelSettings.put(upgraded)
  return upgraded
}
