import { describe, expect, it } from 'vitest'
import { filterCanvasRecordsForTopic } from './canvasTopicScope'
import type { CanvasEdge, CanvasShapeNode, PromptCard } from '@/shared/types'

const card = (
  id: string,
  createdAt: string,
  topicSessionId?: string,
): PromptCard => ({
  id,
  canvasId: 'canvas',
  topicSessionId,
  title: id,
  position: { x: 0, y: 0 },
  sections: {},
  createdAt,
  updatedAt: createdAt,
})

const shape = (
  id: string,
  createdAt: string,
  topicSessionId?: string,
): CanvasShapeNode => ({
  id,
  canvasId: 'canvas',
  topicSessionId,
  kind: 'step',
  title: id,
  body: '',
  position: { x: 0, y: 0 },
  width: 100,
  height: 80,
  createdAt,
  updatedAt: createdAt,
})

const edge = (
  id: string,
  sourceId: string,
  targetId: string,
  createdAt: string,
  topicSessionId?: string,
): CanvasEdge => ({
  id,
  canvasId: 'canvas',
  topicSessionId,
  sourceId,
  targetId,
  createdAt,
  updatedAt: createdAt,
})

describe('canvas topic scope', () => {
  it('shows only records tagged for the active topic session', () => {
    const scoped = filterCanvasRecordsForTopic({
      sessionId: 'topic-a',
      promptCardId: 'card-a',
      promptCards: [card('card-a', '1', 'topic-a'), card('card-b', '1', 'topic-b')],
      canvasShapeNodes: [
        shape('shape-a', '1', 'topic-a'),
        shape('shape-b', '1', 'topic-b'),
      ],
      canvasImageNodes: [],
      canvasStrokes: [],
      canvasTextNodes: [],
      canvasEdges: [
        edge('edge-a', 'card-a', 'shape-a', '1', 'topic-a'),
        edge('edge-b', 'card-b', 'shape-b', '1', 'topic-b'),
      ],
    })

    expect(scoped.promptCards.map((item) => item.id)).toEqual(['card-a'])
    expect(scoped.canvasShapeNodes.map((item) => item.id)).toEqual(['shape-a'])
    expect(scoped.canvasEdges.map((item) => item.id)).toEqual(['edge-a'])
  })

  it('isolates an old duplicated batch by prompt card created time', () => {
    const scoped = filterCanvasRecordsForTopic({
      sessionId: 'legacy-copy',
      promptCardId: 'copy-card',
      promptCards: [
        card('original-card', 'old'),
        card('copy-card', 'copy-time'),
        card('copy-card-2', 'copy-time'),
      ],
      canvasShapeNodes: [shape('copy-shape', 'copy-time'), shape('old-shape', 'old')],
      canvasImageNodes: [],
      canvasStrokes: [],
      canvasTextNodes: [],
      canvasEdges: [
        edge('copy-edge', 'copy-card', 'copy-shape', 'copy-time'),
        edge('old-edge', 'original-card', 'old-shape', 'old'),
      ],
    })

    expect(scoped.promptCards.map((item) => item.id)).toEqual([
      'copy-card',
      'copy-card-2',
    ])
    expect(scoped.canvasShapeNodes.map((item) => item.id)).toEqual(['copy-shape'])
    expect(scoped.canvasEdges.map((item) => item.id)).toEqual(['copy-edge'])
  })

  it('keeps legacy nodes visible when only the prompt card was already scoped', () => {
    const scoped = filterCanvasRecordsForTopic({
      sessionId: 'topic-a',
      promptCardId: 'card-a',
      promptCards: [
        card('card-a', 'copy-time', 'topic-a'),
        card('other-card', 'old-time'),
      ],
      canvasShapeNodes: [shape('shape-a', 'copy-time'), shape('old-shape', 'old-time')],
      canvasImageNodes: [],
      canvasStrokes: [],
      canvasTextNodes: [],
      canvasEdges: [
        edge('edge-a', 'card-a', 'shape-a', 'copy-time'),
        edge('old-edge', 'other-card', 'old-shape', 'old-time'),
      ],
    })

    expect(scoped.promptCards.map((item) => item.id)).toEqual(['card-a'])
    expect(scoped.canvasShapeNodes.map((item) => item.id)).toEqual(['shape-a'])
    expect(scoped.canvasEdges.map((item) => item.id)).toEqual(['edge-a'])
  })

  it('keeps legacy topic records when a newly scoped card becomes selected', () => {
    const scoped = filterCanvasRecordsForTopic({
      sessionId: 'topic-a',
      promptCardId: 'new-card',
      promptCards: [
        card('legacy-card', 'copy-time', 'topic-a'),
        card('new-card', 'new-time', 'topic-a'),
      ],
      canvasShapeNodes: [shape('legacy-shape', 'copy-time')],
      canvasImageNodes: [],
      canvasStrokes: [],
      canvasTextNodes: [],
      canvasEdges: [
        edge('legacy-edge', 'legacy-card', 'legacy-shape', 'copy-time'),
      ],
    })

    expect(scoped.promptCards.map((item) => item.id)).toEqual([
      'legacy-card',
      'new-card',
    ])
    expect(scoped.canvasShapeNodes.map((item) => item.id)).toEqual([
      'legacy-shape',
    ])
    expect(scoped.canvasEdges.map((item) => item.id)).toEqual(['legacy-edge'])
  })

  it('keeps unscoped legacy nodes visible after adding scoped nodes to a topic without a prompt card anchor', () => {
    const scoped = filterCanvasRecordsForTopic({
      sessionId: 'sop-topic',
      sessionCreatedAt: '2026-01-01T00:00:00.000Z',
      promptCards: [],
      canvasShapeNodes: [
        shape('legacy-step', '2026-01-01T00:00:01.000Z'),
        shape('new-step', '2026-01-01T00:00:02.000Z', 'sop-topic'),
      ],
      canvasImageNodes: [],
      canvasStrokes: [],
      canvasTextNodes: [],
      canvasEdges: [
        edge(
          'legacy-to-new',
          'legacy-step',
          'new-step',
          '2026-01-01T00:00:02.000Z',
          'sop-topic',
        ),
      ],
    })

    expect(scoped.canvasShapeNodes.map((item) => item.id)).toEqual([
      'new-step',
      'legacy-step',
    ])
    expect(scoped.canvasEdges.map((item) => item.id)).toEqual(['legacy-to-new'])
  })

  it('keeps a new blank topic empty instead of inheriting older unscoped canvas nodes', () => {
    const scoped = filterCanvasRecordsForTopic({
      sessionId: 'new-topic',
      sessionCreatedAt: '2026-01-02T00:00:00.000Z',
      promptCards: [],
      canvasShapeNodes: [
        shape('topic-one-step', '2026-01-01T00:00:00.000Z'),
      ],
      canvasImageNodes: [],
      canvasStrokes: [],
      canvasTextNodes: [],
      canvasEdges: [],
    })

    expect(scoped.canvasShapeNodes).toEqual([])
    expect(scoped.promptCards).toEqual([])
  })

  it('does not merge unrelated unscoped nodes when the topic is anchored by a prompt card', () => {
    const scoped = filterCanvasRecordsForTopic({
      sessionId: 'topic-a',
      promptCardId: 'card-a',
      promptCards: [card('card-a', 'card-time', 'topic-a')],
      canvasShapeNodes: [
        shape('new-step', 'new-time', 'topic-a'),
        shape('unrelated-legacy-step', 'other-time'),
      ],
      canvasImageNodes: [],
      canvasStrokes: [],
      canvasTextNodes: [],
      canvasEdges: [
        edge('unrelated-edge', 'unrelated-legacy-step', 'new-step', 'other-time'),
      ],
    })

    expect(scoped.canvasShapeNodes.map((item) => item.id)).toEqual(['new-step'])
    expect(scoped.canvasEdges).toEqual([])
  })
})
