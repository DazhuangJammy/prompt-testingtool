import { describe, expect, it } from 'vitest'
import {
  buildChatMessages,
  createCompareRun,
  createPromptVersion,
} from './chatCompletion'
import type { ChatMessage, PromptCard, PromptVersion } from '@/shared/types'

describe('chat completion model', () => {
  it('builds chat messages with system prompt and skips system history', () => {
    const history: ChatMessage[] = [
      {
        id: '1',
        sessionId: 's',
        role: 'system',
        content: 'old system',
        createdAt: 'now',
      },
      {
        id: '2',
        sessionId: 's',
        role: 'assistant',
        content: 'answer',
        createdAt: 'now',
      },
    ]

    expect(buildChatMessages('new system', history, 'question')).toEqual([
      { role: 'system', content: 'new system' },
      { role: 'assistant', content: 'answer' },
      { role: 'user', content: 'question' },
    ])
  })

  it('can inject prompt as the first user message', () => {
    expect(buildChatMessages('prompt', [], 'question', 'user')).toEqual([
      { role: 'user', content: 'prompt' },
      { role: 'user', content: 'question' },
    ])
  })

  it('strips assistant thinking blocks from history', () => {
    const history: ChatMessage[] = [
      {
        id: '1',
        sessionId: 's',
        role: 'assistant',
        content: '<think>hidden</think>answer',
        createdAt: 'now',
      },
    ]

    expect(buildChatMessages('prompt', history, 'next')).toEqual([
      { role: 'system', content: 'prompt' },
      { role: 'assistant', content: 'answer' },
      { role: 'user', content: 'next' },
    ])
  })

  it('builds multimodal user messages from attachments', () => {
    const imageAttachment = {
      id: 'image',
      kind: 'image' as const,
      name: 'shot.png',
      mimeType: 'image/png',
      size: 12,
      dataUrl: 'data:image/png;base64,abc',
    }
    const textAttachment = {
      id: 'text',
      kind: 'text' as const,
      name: 'note.txt',
      mimeType: 'text/plain',
      size: 4,
      text: 'file text',
    }

    expect(
      buildChatMessages('prompt', [], 'question', 'system', [
        imageAttachment,
        textAttachment,
      ]),
    ).toEqual([
      { role: 'system', content: 'prompt' },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: 'data:image/png;base64,abc' },
          },
          { type: 'text', text: 'question\n\n[note.txt]\nfile text' },
        ],
      },
    ])
  })

  it('creates prompt versions from compiled prompt markdown', () => {
    const card: PromptCard = {
      id: 'card',
      canvasId: 'canvas',
      title: 'T',
      position: { x: 0, y: 0 },
      sections: {
        role: { markdown: '角色' },
        rules: { markdown: '' },
        examples: { markdown: '' },
        workflow: { markdown: '', workflowSteps: [] },
        outputFormat: { markdown: '' },
        starter: { markdown: '开始' },
      },
      createdAt: 'now',
      updatedAt: 'now',
    }

    const version = createPromptVersion(card, 'manual')

    expect(version.promptCardId).toBe('card')
    expect(version.compiledMarkdown).toContain('# 角色')
  })

  it('prepends the default assistant prompt to prompt versions', () => {
    const card: PromptCard = {
      id: 'card',
      canvasId: 'canvas',
      title: 'T',
      position: { x: 0, y: 0 },
      sections: {
        role: { markdown: '角色' },
        rules: { markdown: '' },
        examples: { markdown: '' },
        workflow: { markdown: '', workflowSteps: [] },
        outputFormat: { markdown: '' },
        starter: { markdown: '' },
      },
      createdAt: 'now',
      updatedAt: 'now',
    }

    const version = createPromptVersion(card, 'manual', '默认助手提示词')

    expect(version.compiledMarkdown.startsWith('默认助手提示词\n\n')).toBe(true)
    expect(version.compiledMarkdown).toContain('# 角色')
  })

  it('creates compare runs', () => {
    const oldVersion = { id: 'old' } as PromptVersion
    const newVersion = { id: 'new' } as PromptVersion

    const run = createCompareRun(
      'card',
      oldVersion,
      newVersion,
      'input',
      'old output',
      'new output',
    )

    expect(run.oldVersionId).toBe('old')
    expect(run.newVersionId).toBe('new')
  })
})
