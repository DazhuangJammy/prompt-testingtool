import { describe, expect, it } from 'vitest'
import {
  formatGenerationDuration,
  formatMessageTime,
  formatThinkingSeconds,
  getThinkingCapability,
  normalizeThinkingMode,
  splitThinkingBlock,
} from './thinking'
import type { ProviderConfig } from '@/shared/types'

describe('thinking model', () => {
  it('splits thinking blocks from assistant content', () => {
    expect(splitThinkingBlock('<think>step</think>answer')).toEqual({
      answer: 'answer',
      thinking: 'step',
    })
  })

  it('keeps plain assistant content unchanged', () => {
    expect(splitThinkingBlock('answer')).toEqual({
      answer: 'answer',
      thinking: '',
    })
  })

  it('formats thinking duration seconds', () => {
    expect(formatThinkingSeconds(1200)).toBe('1s')
    expect(formatThinkingSeconds(2600)).toBe('3s')
    expect(formatThinkingSeconds(65_000)).toBe('1m 5s')
    expect(formatThinkingSeconds(3_600_000)).toBe('1h')
    expect(formatThinkingSeconds()).toBe('')
    expect(formatGenerationDuration(2600)).toBe(' · 3s')
    expect(formatGenerationDuration()).toBe('')
  })

  it('detects thinking-capable models', () => {
    const provider = (model: string, name = '') =>
      ({ model, name } as ProviderConfig)

    expect(getThinkingCapability(provider('deepseek-reasoner')).supportsThinking).toBe(
      true,
    )
    expect(getThinkingCapability(provider('kimi-k2.5-thinking')).supportsDeepMode).toBe(
      true,
    )
    expect(getThinkingCapability(provider('minimax-m2'))).toEqual(
      expect.objectContaining({
        defaultMode: 'off',
        supportsThinking: true,
      }),
    )
    expect(getThinkingCapability(provider('qwen3.7-plus'))).toEqual(
      expect.objectContaining({
        defaultMode: 'auto',
        supportsDeepMode: true,
        supportsThinking: true,
      }),
    )
    expect(getThinkingCapability(provider('gpt-4.1')).supportsThinking).toBe(false)
    expect(normalizeThinkingMode(provider('minimax-m2'), 'deep')).toBe('on')
    expect(normalizeThinkingMode(provider('minimax-m2'), 'light')).toBe('on')
    expect(normalizeThinkingMode(provider('gpt-4.1'), 'on')).toBe('off')
  })

  it('formats message time', () => {
    expect(formatMessageTime('bad')).toBe('')
    expect(formatMessageTime('2026-06-02T12:34:00.000Z')).toBeTruthy()
  })
})
