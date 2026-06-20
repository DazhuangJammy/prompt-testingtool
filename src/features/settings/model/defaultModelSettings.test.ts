import { describe, expect, it } from 'vitest'
import type { DefaultModelSettings, ProviderConfig } from '@/shared/types'
import {
  appendDefaultAssistantPrompt,
  createDefaultModelSettings,
  createFlowchartModelSettings,
  DEFAULT_ASSISTANT_NAME,
  DEFAULT_ASSISTANT_PROMPT,
  deriveEnabledModelOptions,
  FLOWCHART_ASSISTANT_NAME,
  FLOWCHART_ASSISTANT_PROMPT,
  FLOWCHART_MODEL_SETTINGS_ID,
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

  it('creates and normalizes flowchart model settings with flowchart defaults', () => {
    expect(createFlowchartModelSettings()).toMatchObject({
      id: FLOWCHART_MODEL_SETTINGS_ID,
      assistantName: FLOWCHART_ASSISTANT_NAME,
      prompt: FLOWCHART_ASSISTANT_PROMPT,
      thinkingMode: 'off',
    })

    expect(
      normalizeDefaultModelSettings({
        id: FLOWCHART_MODEL_SETTINGS_ID,
        assistantName: '',
        prompt: '',
        createdAt: 'now',
        updatedAt: 'now',
      }),
    ).toMatchObject({
      assistantName: FLOWCHART_ASSISTANT_NAME,
      prompt: FLOWCHART_ASSISTANT_PROMPT,
    })
  })

  it('keeps flowchart model prompt unlimited for prompt nodes', () => {
    expect(FLOWCHART_ASSISTANT_PROMPT).not.toContain('最多连接 3 个')
    expect(FLOWCHART_ASSISTANT_PROMPT).not.toContain('超过 3 个智能体')
    expect(FLOWCHART_ASSISTANT_PROMPT).not.toContain('最多生成 3 个')
    expect(FLOWCHART_ASSISTANT_PROMPT).toContain('不设置数量上限')
  })

  it('upgrades old flowchart prompt limits without replacing custom content', () => {
    const settings =
      normalizeDefaultModelSettings({
        id: FLOWCHART_MODEL_SETTINGS_ID,
        assistantName: FLOWCHART_ASSISTANT_NAME,
        prompt: [
          '# 自定义流程图助手',
          '- 保留这条自定义规则。',
          '- 每个 step 节点最多连接 3 个 prompt 节点，可以没有 prompt 节点。',
          '- 如果一个步骤包含超过 3 个智能体，只选择最关键的 3 个生成 prompt 节点，其余智能体写入对应 step 的 body。',
          '4. 判断每个步骤是否需要提示词节点；如果需要，最多生成 3 个最关键的提示词节点。',
        ].join('\n'),
        createdAt: 'now',
        updatedAt: 'now',
      })

    expect(settings.prompt).toContain('# 自定义流程图助手')
    expect(settings.prompt).toContain('保留这条自定义规则')
    expect(settings.prompt).not.toContain('最多连接 3 个')
    expect(settings.prompt).not.toContain('超过 3 个智能体')
    expect(settings.prompt).not.toContain('最多生成 3 个')
    expect(settings.prompt).toContain('不设置数量上限')
    expect(settings.prompt).toContain('不要因为数量多而合并或省略')
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
