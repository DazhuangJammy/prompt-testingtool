import { describe, expect, it } from 'vitest'
import {
  getModelCapabilities,
  getVisibleModelCapabilityTags,
  inferModelCapabilities,
} from './providerModelCapabilities'

describe('provider model capabilities', () => {
  it('matches Cherry Studio Qwen vision boundaries', () => {
    expect(inferModelCapabilities('qwen3.7-plus')).toEqual([
      'chat',
      'reasoning',
      'vision',
      'function-call',
    ])
    expect(inferModelCapabilities('qwen3.5-plus')).toContain('vision')
    expect(inferModelCapabilities('qwen3.5-397b-a17b')).toContain('vision')
    expect(inferModelCapabilities('qwen-vl-max')).toContain('vision')
    expect(inferModelCapabilities('qwen3.7-max')).not.toContain('vision')
    expect(inferModelCapabilities('qwen3.5-max')).not.toContain('vision')
    expect(inferModelCapabilities('qwen-max')).not.toContain('vision')
  })

  it('keeps knowledge-only models out of chat and tool tags', () => {
    expect(inferModelCapabilities('text-embedding-v4')).toEqual(['embedding'])
    expect(inferModelCapabilities('gte-rerank-v2')).toEqual(['rerank'])
    expect(inferModelCapabilities('qwen-image-plus')).toEqual([])
  })

  it('merges explicit tags with inferred tags for fetched models', () => {
    expect(
      getModelCapabilities({
        id: 'qwen3.7-plus',
        capabilities: ['chat', 'reasoning', 'function-call'],
      }),
    ).toEqual(['chat', 'reasoning', 'vision', 'function-call'])
    expect(
      getModelCapabilities({
        id: 'gte-rerank-v2',
        capabilities: ['embedding', 'rerank'],
      }),
    ).toEqual(['embedding', 'rerank'])
  })

  it('orders visible tags like Cherry Studio and hides the generic chat tag', () => {
    expect(
      getVisibleModelCapabilityTags([
        'chat',
        'function-call',
        'reasoning',
        'vision',
      ]),
    ).toEqual(['vision', 'reasoning', 'function-call'])
  })
})
