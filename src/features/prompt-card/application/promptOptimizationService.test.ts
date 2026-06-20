import { describe, expect, it, vi } from 'vitest'
import { requestCompletionStream } from '@/shared/api/ai'
import type { ProviderConfig } from '@/shared/types'
import {
  buildSelectionPromptOptimizationMessages,
  normalizeOptimizationOutput,
  optimizeFullPrompt,
  optimizeSelectedPromptText,
  stripThinkingBlocks,
} from './promptOptimizationService'

vi.mock('@/shared/api/ai', () => ({
  requestCompletionStream: vi.fn(),
}))

const provider: ProviderConfig = {
  id: 'provider',
  name: '百炼',
  baseUrl: 'https://api.example.com',
  apiKey: 'key',
  model: 'qwen-plus',
  createdAt: 'now',
  updatedAt: 'now',
}

describe('prompt optimization service', () => {
  it('asks the model to return a full replacement prompt', async () => {
    vi.mocked(requestCompletionStream).mockImplementation(
      async (_provider, _messages, handlers) => {
        handlers.onText('```markdown\n# 新提示词\n```')
        return '```markdown\n# 新提示词\n```'
      },
    )

    const result = await optimizeFullPrompt({
      instruction: '更清晰',
      promptMarkdown: '# 旧提示词',
      provider,
      systemPrompt: '保持中文',
      thinkingMode: 'auto',
    })

    expect(result).toBe('# 新提示词')
    expect(requestCompletionStream).toHaveBeenCalledWith(
      provider,
      [
        expect.objectContaining({
          role: 'system',
          content: expect.stringContaining('保持中文'),
        }),
        expect.objectContaining({
          role: 'user',
          content: expect.stringContaining('当前完整提示词'),
        }),
      ],
      expect.any(Object),
      'auto',
      undefined,
    )
  })

  it('asks the model to return only the optimized selected text', async () => {
    vi.mocked(requestCompletionStream).mockImplementation(
      async (_provider, _messages, handlers) => {
        handlers.onText('优化后的片段')
        return '优化后的片段'
      },
    )

    await optimizeSelectedPromptText({
      instruction: '更具体',
      promptMarkdown: '# 角色\n\n你是助手',
      provider,
      selectedText: '你是助手',
    })

    const messages = vi.mocked(requestCompletionStream).mock.calls.at(-1)?.[1] ?? []
    expect(messages[1].content).toContain('当前完整提示词')
    expect(messages[1].content).toContain('需要替换的选中片段')
    expect(messages[1].content).toContain('你是助手')
  })

  it('builds selection messages that forbid full-prompt replacement', () => {
    const messages = buildSelectionPromptOptimizationMessages({
      instruction: '更专业',
      promptMarkdown: '完整提示词',
      selectedText: '这一段',
    })

    expect(messages[1].content).toContain('只输出优化后的选中片段文本')
  })

  it('rejects empty optimization output', () => {
    expect(() => normalizeOptimizationOutput('   ')).toThrow('模型返回为空')
  })

  it('streams visible text without thinking blocks', async () => {
    vi.mocked(requestCompletionStream).mockImplementation(
      async (_provider, _messages, handlers) => {
        handlers.onText('<thi')
        handlers.onText('nk>内部推理</think>```markdown\n# 新')
        handlers.onText('提示词\n```')
        return '<think>内部推理</think>```markdown\n# 新提示词\n```'
      },
    )
    const updates: string[] = []

    const result = await optimizeFullPrompt({
      instruction: '更清晰',
      onUpdate: (text) => updates.push(text),
      promptMarkdown: '',
      provider,
    })

    expect(result).toBe('# 新提示词')
    expect(updates.every((text) => !text.includes('内部推理'))).toBe(true)
    expect(updates.at(-1)).toBe('# 新提示词')
  })

  it('strips complete and partial thinking blocks', () => {
    expect(stripThinkingBlocks('开头<think>过程</think>答案')).toBe('开头答案')
    expect(stripThinkingBlocks('<think>未结束')).toBe('')
    expect(stripThinkingBlocks('答案<thi')).toBe('答案')
  })
})
