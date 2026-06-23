import { db } from '@/shared/storage/db'
import type { ProviderConfig } from '@/shared/types'
import {
  createBuiltInProviders,
  mergeBuiltInProviderModels,
  normalizeProviderConfig,
} from '../model/providerCatalog'

export const providerRepository = {
  async save(provider: ProviderConfig) {
    await db.providerConfigs.put(normalizeProviderConfig(provider))
  },

  async delete(id: string) {
    await db.providerConfigs.delete(id)
  },

  async ensureBuiltInProviders() {
    const existing = await db.providerConfigs.toArray()
    const existingTypes = new Set(existing.map((provider) => provider.type))
    const existingNames = new Set(existing.map((provider) => provider.name))
    const syncedExisting = existing
      .map(mergeBuiltInProviderModels)
      .filter((provider, index) => {
        const current = normalizeProviderConfig(existing[index])
        return JSON.stringify(provider.models) !== JSON.stringify(current.models)
      })
    const missing = createBuiltInProviders().filter(
      (provider) =>
        !existingTypes.has(provider.type) && !existingNames.has(provider.name),
    )

    const updates = [...syncedExisting, ...missing]
    if (updates.length) {
      await db.providerConfigs.bulkPut(updates)
    }
  },
}
