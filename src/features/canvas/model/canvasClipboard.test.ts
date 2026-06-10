import { describe, expect, it } from 'vitest'
import {
  createCanvasClipboard,
  createCanvasPastePayload,
  type CanvasClipboardSnapshot,
} from './canvasClipboard'
import type {
  CanvasEdge,
  CanvasShapeNode,
  CanvasStroke,
  CanvasTextNode,
  PromptCard,
} from '@/shared/types'

const card: PromptCard = {
  id: 'card',
  canvasId: 'canvas',
  title: 'Prompt',
  position: { x: 20, y: 30 },
  sections: {
    workflow: {
      markdown: '',
      workflowSteps: [{ id: 'step-a', title: 'A', markdown: 'Do', order: 0 }],
    },
  },
  createdAt: 'old',
  updatedAt: 'old',
}

const shape: CanvasShapeNode = {
  id: 'shape',
  canvasId: 'canvas',
  kind: 'step',
  title: 'Shape',
  body: 'Body',
  position: { x: 120, y: 80 },
  width: 200,
  height: 100,
  createdAt: 'old',
  updatedAt: 'old',
}

const textNode: CanvasTextNode = {
  id: 'text',
  canvasId: 'canvas',
  text: 'Text',
  position: { x: 60, y: 90 },
  width: 180,
  color: '#fff',
  fontSize: 18,
  backgroundColor: 'transparent',
  createdAt: 'old',
  updatedAt: 'old',
}

const stroke: CanvasStroke = {
  id: 'stroke',
  canvasId: 'canvas',
  points: [
    { x: 40, y: 50 },
    { x: 80, y: 70 },
  ],
  color: '#78d18b',
  strokeWidth: 3,
  createdAt: 'old',
  updatedAt: 'old',
}

const internalEdge: CanvasEdge = {
  id: 'edge-a',
  canvasId: 'canvas',
  sourceId: 'card',
  targetId: 'shape',
  sourceHandle: 'right',
  targetHandle: 'left',
  createdAt: 'old',
  updatedAt: 'old',
}

const externalEdge: CanvasEdge = {
  id: 'edge-b',
  canvasId: 'canvas',
  sourceId: 'shape',
  targetId: 'outside',
  createdAt: 'old',
  updatedAt: 'old',
}

describe('canvas clipboard', () => {
  it('captures selected elements and only keeps internal edges', () => {
    const clipboard = createCanvasClipboard({
      edges: [internalEdge, externalEdge],
      promptCards: [card],
      selectedNodeIds: ['card', 'shape'],
      shapeNodes: [shape],
      strokes: [stroke],
      textNodes: [textNode],
    })

    expect(clipboard?.promptCards).toHaveLength(1)
    expect(clipboard?.shapeNodes).toHaveLength(1)
    expect(clipboard?.textNodes).toHaveLength(0)
    expect(clipboard?.strokes).toHaveLength(0)
    expect(clipboard?.edges).toEqual([internalEdge])
    expect(clipboard?.origin).toEqual({ x: 20, y: 30 })
  })

  it('returns empty when no node is selected', () => {
    expect(
      createCanvasClipboard({
        edges: [internalEdge],
        promptCards: [card],
        selectedNodeIds: [],
        shapeNodes: [shape],
        strokes: [stroke],
        textNodes: [textNode],
      }),
    ).toBeUndefined()
  })

  it('pastes elements at the cursor while preserving relative positions', () => {
    const ids = ['new-card', 'new-step', 'new-shape', 'new-text', 'new-stroke', 'new-edge']
    const result = createCanvasPastePayload({
      anchor: { x: 200, y: 240 },
      canvasId: 'next-canvas',
      clipboard: {
        edges: [internalEdge],
        origin: { x: 20, y: 30 },
        promptCards: [card],
        shapeNodes: [shape],
        strokes: [stroke],
        textNodes: [textNode],
      },
      createNextId: () => ids.shift() ?? 'missing',
      now: () => 'now',
    })

    expect(result.nodeIds).toEqual(['new-card', 'new-shape', 'new-text', 'new-stroke'])
    expect(result.promptCardIds).toEqual(['new-card'])
    expect(result.payload.promptCards[0]).toMatchObject({
      canvasId: 'next-canvas',
      id: 'new-card',
      position: { x: 200, y: 240 },
      title: 'Prompt 副本',
    })
    expect(
      result.payload.promptCards[0].sections.workflow.workflowSteps?.[0].id,
    ).toBe('new-step')
    expect(result.payload.shapeNodes[0].position).toEqual({ x: 300, y: 290 })
    expect(result.payload.textNodes[0].position).toEqual({ x: 240, y: 300 })
    expect(result.payload.strokes[0].points).toEqual([
      { x: 220, y: 260 },
      { x: 260, y: 280 },
    ])
    expect(result.payload.edges[0]).toMatchObject({
      id: 'new-edge',
      sourceId: 'new-card',
      targetId: 'new-shape',
    })
  })

  it('uses stroke bounds as origin when only a stroke is copied', () => {
    const clipboard = createCanvasClipboard({
      edges: [],
      promptCards: [],
      selectedNodeIds: ['stroke'],
      shapeNodes: [],
      strokes: [stroke],
      textNodes: [],
    }) as CanvasClipboardSnapshot

    expect(clipboard.origin).toEqual({ x: 29, y: 39 })
  })
})
