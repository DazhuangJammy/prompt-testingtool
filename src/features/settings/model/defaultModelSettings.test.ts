import { describe, expect, it } from 'vitest'
import type { DefaultModelSettings, ProviderConfig } from '@/shared/types'
import {
  appendDefaultAssistantPrompt,
  createDefaultModelSettings,
  DEFAULT_ASSISTANT_NAME,
  DEFAULT_ASSISTANT_PROMPT,
  deriveEnabledModelOptions,
  normalizeDefaultModelSettings,
  resolveDefaultModelOption,
  resolveDefaultModelProvider,
} from './defaultModelSettings'

const provider: ProviderConfig = {
  id: 'provider',
  name: '百炼',
  baseUrl: 'https://api.example.com',
  apiKey: 'key',
  model: 'qwen-plus',
  enabled: true,
  models: [
    { id: 'qwen-plus', name: 'Qwen Plus', enabled: true },
    { id: 'qwen-max', enabled: false },
  ],
  createdAt: 'now',
  updatedAt: 'now',
}

describe('default model settings', () => {
  it('normalizes empty names and model identifiers', () => {
    expect(
      normalizeDefaultModelSettings({
        id: '',
        providerId: ' provider ',
        modelId: ' qwen-plus ',
        assistantName: ' ',
        prompt: 'prompt',
        thinkingMode: 'deep',
        createdAt: 'now',
        updatedAt: 'now',
      }),
    ).toMatchObject({
      id: 'default-model',
      providerId: 'provider',
      modelId: 'qwen-plus',
      assistantName: DEFAULT_ASSISTANT_NAME,
      prompt: 'prompt',
      thinkingMode: 'deep',
    })
  })

  it('normalizes an empty assistant prompt to the built-in optimization prompt', () => {
    expect(
      normalizeDefaultModelSettings({
        id: 'default-model',
        assistantName: DEFAULT_ASSISTANT_NAME,
        prompt: ' ',
        createdAt: 'now',
        updatedAt: 'now',
      }),
    ).toMatchObject({
      prompt: DEFAULT_ASSISTANT_PROMPT,
    })
  })

  it('creates prompt optimization settings', () => {
    expect(createDefaultModelSettings()).toMatchObject({
      id: 'default-model',
      assistantName: DEFAULT_ASSISTANT_NAME,
      prompt: DEFAULT_ASSISTANT_PROMPT,
      thinkingMode: 'off',
    })
  })

  it('derives only enabled models from enabled providers', () => {
    const options = deriveEnabledModelOptions([
      provider,
      { ...provider, id: 'disabled-provider', enabled: false },
    ])

    expect(options).toEqual([
      {
        id: 'provider::qwen-plus',
        providerId: 'provider',
        modelId: 'qwen-plus',
        label: 'Qwen Plus · 百炼',
        providerName: '百炼',
        modelName: 'Qwen Plus',
      },
    ])
  })

  it('resolves the configured option and provider snapshot', () => {
    const settings: DefaultModelSettings = {
      id: 'default-model',
      providerId: 'provider',
      modelId: 'qwen-plus',
      assistantName: '默认助手',
      prompt: '你要简洁回答',
      thinkingMode: 'off',
      createdAt: 'now',
      updatedAt: 'now',
    }
    const options = deriveEnabledModelOptions([provider])

    expect(resolveDefaultModelOption(settings, options)).toMatchObject({
      modelId: 'qwen-plus',
    })
    expect(resolveDefaultModelProvider([provider], settings)).toMatchObject({
      id: 'provider::qwen-plus',
      sourceProviderId: 'provider',
      name: '百炼 · Qwen Plus',
      model: 'qwen-plus',
    })
  })

  it('appends the default assistant prompt before the card prompt', () => {
    expect(appendDefaultAssistantPrompt('卡片提示词', ' 默认提示词 ')).toBe(
      '默认提示词\n\n卡片提示词',
    )
    expect(appendDefaultAssistantPrompt('卡片提示词', ' ')).toBe('卡片提示词')
    expect(appendDefaultAssistantPrompt('', '默认提示词')).toBe('默认提示词')
  })
})
