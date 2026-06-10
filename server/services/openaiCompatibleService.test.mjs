import { describe, expect, it } from 'vitest'
import {
  buildChatEndpoint,
  buildChatRequestBody,
  buildThinkingOptions,
} from './openaiCompatibleService.mjs'

const messages = [{ role: 'user', content: 'ping' }]

describe('openai compatible service', () => {
  it('builds chat completion endpoints from provider base urls', () => {
    expect(buildChatEndpoint('https://api.moonshot.cn').href).toBe(
      'https://api.moonshot.cn/v1/chat/completions',
    )
    expect(buildChatEndpoint('https://api.moonshot.cn/v1').href).toBe(
      'https://api.moonshot.cn/v1/chat/completions',
    )
    expect(
      buildChatEndpoint('https://api.moonshot.cn/v1/chat/completions').href,
    ).toBe('https://api.moonshot.cn/v1/chat/completions')
  })

  it('omits sampling parameters for Moonshot Kimi K2.6 requests', () => {
    const body = buildChatRequestBody({
      provider: { baseUrl: 'https://api.moonshot.cn' },
      model: 'kimi-k2.6',
      messages,
      stream: true,
      temperature: 0.7,
      thinkingMode: 'off',
    })

    expect(body).toEqual({
      model: 'kimi-k2.6',
      messages,
      stream: true,
      thinking: { type: 'disabled' },
    })
  })

  it('maps Moonshot Kimi thinking modes to official thinking values', () => {
    const provider = { baseUrl: 'https://api.moonshot.cn' }

    expect(
      buildThinkingOptions({ provider, model: 'kimi-k2.6', thinkingMode: 'off' }),
    ).toEqual({ thinking: { type: 'disabled' } })
    expect(
      buildThinkingOptions({ provider, model: 'kimi-k2.6', thinkingMode: 'on' }),
    ).toEqual({ thinking: { type: 'enabled' } })
    expect(
      buildThinkingOptions({ provider, model: 'kimi-k2.6', thinkingMode: 'deep' }),
    ).toEqual({ thinking: { type: 'enabled' } })
  })

  it('maps Qwen thinking depth to enable_thinking budgets', () => {
    const provider = { baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1' }

    expect(
      buildThinkingOptions({ provider, model: 'qwen3.7-plus', thinkingMode: 'auto' }),
    ).toEqual({})
    expect(
      buildThinkingOptions({ provider, model: 'qwen3.7-plus', thinkingMode: 'off' }),
    ).toEqual({ enable_thinking: false })
    expect(
      buildThinkingOptions({ provider, model: 'qwen3.7-plus', thinkingMode: 'light' }),
    ).toEqual({ enable_thinking: true, thinking_budget: 512 })
    expect(
      buildThinkingOptions({ provider, model: 'qwen3.7-plus', thinkingMode: 'on' }),
    ).toEqual({ enable_thinking: true, thinking_budget: 1536 })
    expect(
      buildThinkingOptions({ provider, model: 'qwen3.7-plus', thinkingMode: 'deep' }),
    ).toEqual({ enable_thinking: true, thinking_budget: 4096 })
  })
})
