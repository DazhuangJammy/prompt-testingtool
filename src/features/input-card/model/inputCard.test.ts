import { describe, expect, it } from 'vitest'
import {
  createInputCard,
  findPromptInputSources,
  getInputCardCollapsedMarkdownHeadingIds,
  hasInputCardCollapsedMarkdownHeadingState,
  moveInputSegment,
  normalizeInputCard,
  parseInputCardOutline,
  parseInputSegments,
  resolvePromptInputSource,
  updateInputCollapsedMarkdownHeadingIds,
  updateInputCardMarkdown,
} from './inputCard'
import type { CanvasEdge, InputCard, PromptCard } from '@/shared/types'

describe('input card model', () => {
  it('creates a default input card with headed markdown', () => {
    const card = createInputCard('canvas-1', 1, { x: 10, y: 20 }, 'topic-1')

    expect(card).toMatchObject({
      canvasId: 'canvas-1',
      topicSessionId: 'topic-1',
      title: '输入卡片 2',
      position: { x: 10, y: 20 },
    })
    expect(parseInputSegments(card.markdown)).toHaveLength(2)
  })

  it('normalizes markdown and parses the input card outline', () => {
    const card = createTestInputCard('# 输入\r\n\r\n正文')

    expect(normalizeInputCard(card).markdown).toBe('# 输入\n\n正文')
    expect(parseInputCardOutline(card).nodes[0]).toMatchObject({
      title: '输入',
      body: '正文',
    })
    expect(updateInputCardMarkdown(card, '  # 新输入\r\n正文  ').markdown)
      .toBe('# 新输入\n正文')
  })

  it('normalizes and updates collapsed heading ids on input cards', () => {
    const card = createTestInputCard('# 输入\n\n正文')

    expect(hasInputCardCollapsedMarkdownHeadingState(card)).toBe(false)
    expect(getInputCardCollapsedMarkdownHeadingIds(card)).toEqual([])

    const updated = updateInputCollapsedMarkdownHeadingIds(card, [
      '0-1-输入',
      1 as never,
    ])

    expect(hasInputCardCollapsedMarkdownHeadingState(updated)).toBe(true)
    expect(updated.collapsedMarkdownHeadingIds).toEqual(['0-1-输入'])
    expect(normalizeInputCard(updated).collapsedMarkdownHeadingIds).toEqual([
      '0-1-输入',
    ])
  })

  it('remaps collapsed input heading ids after markdown edits', () => {
    const card = {
      ...createTestInputCard('# 输入\n\n正文\n\n# 规则\n\n正文'),
      collapsedMarkdownHeadingIds: ['0-1-输入'],
    }

    const updated = updateInputCardMarkdown(
      card,
      '# 前言\n\n新增\n\n# 输入\n\n正文\n\n# 规则\n\n正文',
    )

    expect(updated.collapsedMarkdownHeadingIds).toEqual(['4-1-输入'])
  })

  it('parses only first-level headings as send segments', () => {
    const markdown = [
      '前置说明不发送',
      '# 第一轮',
      '正文 A',
      '## 细节',
      '正文 B',
      '# 第二轮',
      '正文 C',
    ].join('\n\n')

    expect(parseInputSegments(markdown)).toEqual([
      {
        id: '2-1-第一轮',
        title: '第一轮',
        content: '正文 A\n\n## 细节\n\n正文 B',
        order: 0,
      },
      {
        id: '10-1-第二轮',
        title: '第二轮',
        content: '正文 C',
        order: 1,
      },
    ])
  })

  it('moves first-level input segments with their full body', () => {
    const card = createTestInputCard([
      '# 第一轮',
      '正文 A',
      '## 细节',
      '正文 B',
      '# 第二轮',
      '正文 C',
    ].join('\n\n'))
    const segments = parseInputSegments(card.markdown)

    const moved = moveInputSegment(card, segments[0].id, segments[1].id)

    expect(moved.markdown.startsWith('# 第二轮\n\n正文 C\n\n# 第一轮')).toBe(true)
    expect(moved.markdown).toContain('## 细节\n\n正文 B')
  })

  it('finds input cards connected from right handle into prompt left handle', () => {
    const inputCard = createTestInputCard('# 输入\n\n正文')
    const promptCard = createTestPromptCard()
    const matchingEdge = createEdge({
      sourceHandle: 'right',
      sourceId: inputCard.id,
      targetHandle: 'left',
      targetId: promptCard.id,
    })
    const ignoredEdge = createEdge({
      sourceHandle: 'bottom',
      sourceId: inputCard.id,
      targetHandle: 'left',
      targetId: promptCard.id,
    })

    const sources = findPromptInputSources({
      edges: [ignoredEdge, matchingEdge],
      inputCards: [inputCard],
      promptCard,
    })

    expect(sources).toHaveLength(1)
    expect(sources[0].inputCard.id).toBe(inputCard.id)
    expect(sources[0].segments[0]).toMatchObject({
      content: '正文',
      title: '输入',
    })
    expect(resolvePromptInputSource(sources, inputCard.id)?.inputCard.id).toBe(
      inputCard.id,
    )
    expect(resolvePromptInputSource(sources, 'missing')?.inputCard.id).toBe(
      inputCard.id,
    )
    expect(resolvePromptInputSource([])).toBeUndefined()
  })

  it('ignores non-input-card links and non-left prompt targets', () => {
    const inputCard = createTestInputCard('# 输入\n\n正文')
    const promptCard = createTestPromptCard()

    expect(
      findPromptInputSources({
        edges: [
          createEdge({
            sourceHandle: 'right',
            sourceId: inputCard.id,
            targetHandle: 'right',
            targetId: promptCard.id,
          }),
          createEdge({
            sourceHandle: 'right',
            sourceId: 'missing-input',
            targetHandle: 'left',
            targetId: promptCard.id,
          }),
          createEdge({
            sourceHandle: 'right',
            sourceId: inputCard.id,
            targetHandle: 'left',
            targetId: 'other-prompt',
          }),
        ],
        inputCards: [inputCard],
        promptCard,
      }),
    ).toEqual([])
  })

  it('normalizes cards with a missing markdown value from old data', () => {
    const card = {
      ...createTestInputCard('# 输入\n\n正文'),
      markdown: undefined,
    } as unknown as InputCard

    expect(normalizeInputCard(card).markdown).toBe('')
  })

  it('returns no input sources without an active prompt card', () => {
    expect(
      findPromptInputSources({
        edges: [createEdge({ sourceId: 'input-1', targetId: 'prompt-1' })],
        inputCards: [createTestInputCard('# 输入\n\n正文')],
      }),
    ).toEqual([])
  })
})

function createTestInputCard(markdown: string): InputCard {
  return {
    id: 'input-1',
    canvasId: 'canvas-1',
    title: '输入',
    markdown,
    position: { x: 0, y: 0 },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function createTestPromptCard(): PromptCard {
  return {
    id: 'prompt-1',
    canvasId: 'canvas-1',
    title: '提示词',
    position: { x: 0, y: 0 },
    sections: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function createEdge(updates: Partial<CanvasEdge>): CanvasEdge {
  return {
    id: `edge-${updates.sourceHandle ?? 'x'}`,
    canvasId: 'canvas-1',
    sourceId: 'source',
    targetId: 'target',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...updates,
  }
}
