import { db } from '@/shared/storage/db'
import type { ProviderConfig } from '@/shared/types'

export const providerRepository = {
  async save(provider: ProviderConfig) {
    await db.providerConfigs.put(provider)
  },

  async delete(id: string) {
    await db.providerConfigs.delete(id)
  },
}
