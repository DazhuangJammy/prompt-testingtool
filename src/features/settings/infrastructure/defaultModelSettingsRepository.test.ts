import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/shared/storage/db'
import { defaultModelSettingsRepository } from './defaultModelSettingsRepository'
import type { DefaultModelSettings } from '@/shared/types'
import { DEFAULT_ASSISTANT_PROMPT } from '../model/defaultModelSettings'

vi.mock('@/shared/storage/db', () => ({
  db: {
    defaultModelSettings: {
      get: vi.fn(),
      put: vi.fn(),
    },
  },
}))

describe('default model settings repository', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns normalized stored settings', async () => {
    vi.mocked(db.defaultModelSettings.get).mockResolvedValue({
      id: '',
      providerId: ' p ',
      modelId: ' m ',
      assistantName: '',
      prompt: 'prompt',
      createdAt: 'now',
      updatedAt: 'now',
    } as DefaultModelSettings)

    await expect(defaultModelSettingsRepository.get()).resolves.toMatchObject({
      id: 'default-model',
      providerId: 'p',
      modelId: 'm',
      assistantName: '提示词优化助手',
    })
  })

  it('saves normalized settings', async () => {
    await defaultModelSettingsRepository.save({
      id: 'default-model',
      providerId: ' p ',
      modelId: ' m ',
      assistantName: '',
      prompt: 'prompt',
      createdAt: 'now',
      updatedAt: 'now',
    })

    expect(db.defaultModelSettings.put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'default-model',
        providerId: 'p',
        modelId: 'm',
        assistantName: '提示词优化助手',
        prompt: 'prompt',
      }),
    )
  })

  it('creates settings when missing', async () => {
    vi.mocked(db.defaultModelSettings.get).mockResolvedValue(undefined)

    const settings = await defaultModelSettingsRepository.ensure()

    expect(settings).toMatchObject({
      id: 'default-model',
      assistantName: '提示词优化助手',
      prompt: DEFAULT_ASSISTANT_PROMPT,
    })
    expect(db.defaultModelSettings.put).toHaveBeenCalledWith(settings)
  })
})
