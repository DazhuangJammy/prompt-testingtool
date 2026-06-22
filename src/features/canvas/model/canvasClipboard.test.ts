import { describe, expect, it } from 'vitest'
import {
  createCanvasClipboard,
  createCanvasPastePayload,
  type CanvasClipboardSnapshot,
} from './canvasClipboard'
import type {
  CanvasEdge,
  CanvasImageNode,
  InputCard,
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

const inputCard: InputCard = {
  id: 'input',
  canvasId: 'canvas',
  title: 'Input',
  markdown: '# 第一轮\n\n正文',
  position: { x: 10, y: 25 },
  createdAt: 'old',
  updatedAt: 'old',
}

const imageNode: CanvasImageNode = {
  id: 'image',
  canvasId: 'canvas',
  name: 'chart.png',
  mimeType: 'image/png',
  dataUrl: 'data:image/png;base64,abc',
  position: { x: 90, y: 110 },
  width: 220,
  height: 140,
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
  color: '#ededed',
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
  it('copies input cards and keeps their internal prompt edge', () => {
    const edge: CanvasEdge = {
      id: 'input-edge',
      canvasId: 'canvas',
      sourceId: 'input',
      sourceHandle: 'right',
      targetId: 'card',
      targetHandle: 'left',
      createdAt: 'old',
      updatedAt: 'old',
    }

    const clipboard = createCanvasClipboard({
      edges: [edge],
      imageNodes: [],
      inputCards: [inputCard],
      promptCards: [card],
      selectedNodeIds: ['input', 'card'],
      shapeNodes: [],
      strokes: [],
      textNodes: [],
    })

    expect(clipboard?.inputCards).toEqual([inputCard])
    expect(clipboard?.edges).toEqual([edge])

    const ids = ['new-card', 'new-step', 'new-input', 'new-edge']
    const pasted = createCanvasPastePayload({
      anchor: { x: 100, y: 200 },
      canvasId: 'next',
      clipboard: clipboard!,
      createNextId: () => ids.shift() ?? 'missing',
      now: () => 'now',
    })

    expect(pasted.nodeIds).toEqual(['new-card', 'new-input'])
    expect(pasted.payload.inputCards?.[0]).toMatchObject({
      id: 'new-input',
      markdown: inputCard.markdown,
      title: 'Input 副本',
    })
    expect(pasted.payload.edges[0]).toMatchObject({
      sourceId: 'new-input',
      targetId: 'new-card',
    })
  })

  it('captures selected elements and only keeps internal edges', () => {
    const clipboard = createCanvasClipboard({
      edges: [internalEdge, externalEdge],
      imageNodes: [imageNode],
      promptCards: [card],
      selectedNodeIds: ['card', 'shape'],
      shapeNodes: [shape],
      strokes: [stroke],
      textNodes: [textNode],
    })

    expect(clipboard?.promptCards).toHaveLength(1)
    expect(clipboard?.imageNodes).toHaveLength(0)
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
        imageNodes: [imageNode],
        promptCards: [card],
        selectedNodeIds: [],
        shapeNodes: [shape],
        strokes: [stroke],
        textNodes: [textNode],
      }),
    ).toBeUndefined()
  })

  it('pastes elements at the cursor while preserving relative positions', () => {
    const ids = [
      'new-card',
      'new-step',
      'new-shape',
      'new-image',
      'new-text',
      'new-stroke',
      'new-edge',
    ]
    const result = createCanvasPastePayload({
      anchor: { x: 200, y: 240 },
      canvasId: 'next-canvas',
      clipboard: {
        edges: [internalEdge],
        imageNodes: [imageNode],
        origin: { x: 20, y: 30 },
        promptCards: [card],
        shapeNodes: [shape],
        strokes: [stroke],
        textNodes: [textNode],
      },
      createNextId: () => ids.shift() ?? 'missing',
      now: () => 'now',
      topicSessionId: 'topic',
    })

    expect(result.nodeIds).toEqual([
      'new-card',
      'new-shape',
      'new-image',
      'new-text',
      'new-stroke',
    ])
    expect(result.promptCardIds).toEqual(['new-card'])
    expect(result.payload.promptCards[0]).toMatchObject({
      canvasId: 'next-canvas',
      id: 'new-card',
      position: { x: 200, y: 240 },
      topicSessionId: 'topic',
      title: 'Prompt 副本',
    })
    expect(
      result.payload.promptCards[0].sections.workflow.workflowSteps?.[0].id,
    ).toBe('new-step')
    expect(result.payload.shapeNodes[0].position).toEqual({ x: 300, y: 290 })
    expect(result.payload.shapeNodes[0].topicSessionId).toBe('topic')
    expect(result.payload.edges[0].topicSessionId).toBe('topic')
    expect(result.payload.imageNodes[0].position).toEqual({ x: 270, y: 320 })
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
      imageNodes: [],
      promptCards: [],
      selectedNodeIds: ['stroke'],
      shapeNodes: [],
      strokes: [stroke],
      textNodes: [],
    }) as CanvasClipboardSnapshot

    expect(clipboard.origin).toEqual({ x: 29, y: 39 })
  })

  it('pastes legacy clipboard snapshots without input cards', () => {
    const result = createCanvasPastePayload({
      anchor: { x: 100, y: 120 },
      canvasId: 'next-canvas',
      clipboard: {
        edges: [],
        imageNodes: [],
        origin: { x: 20, y: 30 },
        promptCards: [],
        shapeNodes: [shape],
        strokes: [],
        textNodes: [textNode],
      },
      createNextId: () => crypto.randomUUID(),
      now: () => 'now',
    })

    expect(result.payload.inputCards).toEqual([])
    expect(result.payload.shapeNodes[0].position).toEqual({ x: 200, y: 170 })
    expect(result.payload.textNodes[0].position).toEqual({ x: 140, y: 180 })
  })
})
