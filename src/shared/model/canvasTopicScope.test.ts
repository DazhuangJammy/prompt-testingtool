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
})
