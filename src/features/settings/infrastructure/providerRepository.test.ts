import { describe, expect, it, vi } from 'vitest'
import { db } from '@/shared/storage/db'
import { providerRepository } from './providerRepository'
import type { ProviderConfig } from '@/shared/types'

vi.mock('@/shared/storage/db', () => ({
  db: {
    providerConfigs: {
      delete: vi.fn(),
      put: vi.fn(),
    },
  },
}))

describe('provider repository', () => {
  it('saves and deletes providers', async () => {
    const provider = { id: 'p' } as ProviderConfig

    await providerRepository.save(provider)
    await providerRepository.delete('p')

    expect(db.providerConfigs.put).toHaveBeenCalledWith(provider)
    expect(db.providerConfigs.delete).toHaveBeenCalledWith('p')
  })
})
