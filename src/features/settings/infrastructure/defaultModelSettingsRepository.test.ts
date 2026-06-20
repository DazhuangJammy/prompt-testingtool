import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/shared/storage/db'
import { defaultModelSettingsRepository } from './defaultModelSettingsRepository'
import type { DefaultModelSettings } from '@/shared/types'
import {
  DEFAULT_ASSISTANT_PROMPT,
  FLOWCHART_ASSISTANT_PROMPT,
  FLOWCHART_MODEL_SETTINGS_ID,
} from '../model/defaultModelSettings'

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

  it('creates flowchart model settings when missing', async () => {
    vi.mocked(db.defaultModelSettings.get).mockResolvedValue(undefined)

    const settings = await defaultModelSettingsRepository.ensureFlowchart()

    expect(db.defaultModelSettings.get).toHaveBeenCalledWith(FLOWCHART_MODEL_SETTINGS_ID)
    expect(settings).toMatchObject({
      id: FLOWCHART_MODEL_SETTINGS_ID,
      assistantName: '流程图生成助手',
      prompt: FLOWCHART_ASSISTANT_PROMPT,
    })
    expect(db.defaultModelSettings.put).toHaveBeenCalledWith(settings)
  })

  it('persists upgraded legacy flowchart prompt limits when reading settings', async () => {
    vi.mocked(db.defaultModelSettings.get).mockResolvedValue({
      id: FLOWCHART_MODEL_SETTINGS_ID,
      assistantName: '流程图生成助手',
      prompt: [
        '# 自定义流程图助手',
        '- 每个 step 节点最多连接 3 个 prompt 节点，可以没有 prompt 节点。',
        '- 如果一个步骤包含超过 3 个智能体，只选择最关键的 3 个生成 prompt 节点，其余智能体写入对应 step 的 body。',
        '4. 判断每个步骤是否需要提示词节点；如果需要，最多生成 3 个最关键的提示词节点。',
      ].join('\n'),
      createdAt: 'created',
      updatedAt: 'old',
    } as DefaultModelSettings)

    const settings = await defaultModelSettingsRepository.get(
      FLOWCHART_MODEL_SETTINGS_ID,
    )

    expect(settings?.prompt).toContain('# 自定义流程图助手')
    expect(settings?.prompt).toContain('不设置数量上限')
    expect(settings?.prompt).not.toContain('最多连接 3 个')
    expect(settings?.prompt).not.toContain('最多生成 3 个')
    expect(db.defaultModelSettings.put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: FLOWCHART_MODEL_SETTINGS_ID,
        prompt: settings?.prompt,
        updatedAt: expect.any(String),
      }),
    )
  })
})
