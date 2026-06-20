import { describe, expect, it, vi } from 'vitest'
import {
  createCanvasFlowEdges,
  createCanvasFlowNodes,
  syncCanvasEdges,
  syncCanvasNodes,
} from './canvasFlowMapping'
import type {
  CanvasImageNode,
  CanvasShapeNode,
  CanvasStroke,
  CanvasTextNode,
  PromptCard,
} from '@/shared/types'

const card: PromptCard = {
  id: 'card',
  canvasId: 'canvas',
  title: 'Prompt',
  position: { x: 1, y: 2 },
  sections: {},
  createdAt: 'now',
  updatedAt: 'now',
}

const shape: CanvasShapeNode = {
  id: 'shape',
  canvasId: 'canvas',
  kind: 'step',
  title: 'Step',
  body: 'Body',
  position: { x: 3, y: 4 },
  width: 200,
  height: 100,
  createdAt: 'now',
  updatedAt: 'now',
}

const imageNode: CanvasImageNode = {
  id: 'image',
  canvasId: 'canvas',
  name: 'chart.png',
  mimeType: 'image/png',
  dataUrl: 'data:image/png;base64,abc',
  position: { x: 11, y: 12 },
  width: 260,
  height: 180,
  createdAt: 'now',
  updatedAt: 'now',
}

const stroke: CanvasStroke = {
  id: 'stroke',
  canvasId: 'canvas',
  points: [
    { x: 20, y: 30 },
    { x: 40, y: 50 },
  ],
  color: '#ff6b6b',
  strokeWidth: 3,
  createdAt: 'now',
  updatedAt: 'now',
}

const textNode: CanvasTextNode = {
  id: 'text',
  canvasId: 'canvas',
  text: 'Free text',
  position: { x: 7, y: 8 },
  width: 180,
  color: '#ededed',
  fontSize: 18,
  backgroundColor: 'transparent',
  createdAt: 'now',
  updatedAt: 'now',
}

const baseHandlers = {
  onSavePromptCard: vi.fn(),
  onSelectPrompt: vi.fn(),
  onSelectImage: vi.fn(),
  onSelectShape: vi.fn(),
  onSelectText: vi.fn(),
  onUpdateImage: vi.fn(),
  onUpdateShape: vi.fn(),
  onUpdateText: vi.fn(),
}

describe('canvas flow mapping', () => {
  it('maps prompt cards and shapes to flow nodes', () => {
    const nodes = createCanvasFlowNodes({
      promptCards: [card],
      selectedNodeIds: ['card'],
      imageNodes: [],
      shapeNodes: [shape],
      strokes: [],
      textNodes: [],
      ...baseHandlers,
    })

    expect(nodes).toHaveLength(2)
    expect(nodes[0]).toMatchObject({
      dragHandle: '.prompt-node-drag-area',
      id: 'card',
      type: 'promptCard',
    })
    expect(nodes[0].data.selectedCardId).toBe('card')
    expect(nodes[1]).toMatchObject({
      dragHandle: '.flow-shape-drag-area',
      id: 'shape',
      style: { height: 100, width: 200 },
      type: 'flowShape',
    })
    expect(nodes[0].data.onCopy).toBeUndefined()
    expect(nodes[0].data.onDelete).toBeUndefined()
  })

  it('maps free text nodes without using shape cards', () => {
    const nodes = createCanvasFlowNodes({
      promptCards: [],
      selectedNodeIds: ['text'],
      imageNodes: [],
      shapeNodes: [],
      strokes: [],
      textNodes: [textNode],
      ...baseHandlers,
    })

    expect(nodes[0]).toMatchObject({
      dragHandle: '.free-text-drag-area',
      id: 'text',
      position: { x: 7, y: 8 },
      selected: true,
      style: { width: 180 },
      type: 'freeText',
    })
    expect(nodes[0].data.selectedNodeId).toBe('text')
  })

  it('maps pasted image nodes with resize dimensions', () => {
    const nodes = createCanvasFlowNodes({
      promptCards: [],
      selectedNodeIds: ['image'],
      imageNodes: [imageNode],
      shapeNodes: [],
      strokes: [],
      textNodes: [],
      ...baseHandlers,
    })

    expect(nodes[0]).toMatchObject({
      dragHandle: '.canvas-image-drag-area',
      id: 'image',
      position: { x: 11, y: 12 },
      selected: true,
      style: { height: 180, width: 260 },
      type: 'canvasImage',
    })
    expect(nodes[0].data.selectedNodeId).toBe('image')
  })

  it('maps freehand strokes to draggable flow nodes', () => {
    const nodes = createCanvasFlowNodes({
      promptCards: [],
      selectedNodeIds: ['stroke'],
      imageNodes: [],
      shapeNodes: [],
      strokes: [stroke],
      textNodes: [],
      ...baseHandlers,
    })

    expect(nodes[0]).toMatchObject({
      draggable: true,
      id: 'stroke',
      position: { x: 9, y: 19 },
      type: 'freehandStroke',
    })
    expect(nodes[0].data.selectedNodeId).toBe('stroke')
    expect(nodes[0].data.viewPoints).toEqual([
      { x: 11, y: 11 },
      { x: 31, y: 31 },
    ])
  })

  it('maps canvas edges to reconnectable flow edges', () => {
    expect(
      createCanvasFlowEdges([
        {
          id: 'edge',
          canvasId: 'canvas',
          sourceId: 'a',
          targetId: 'b',
          createdAt: 'now',
          updatedAt: 'now',
        },
      ])[0],
    ).toMatchObject({ id: 'edge', source: 'a', target: 'b' })
    expect(
      createCanvasFlowEdges([
        {
          id: 'edge',
          canvasId: 'canvas',
          sourceId: 'a',
          targetId: 'b',
          createdAt: 'now',
          updatedAt: 'now',
        },
      ])[0].reconnectable,
    ).toBe(true)
  })

  it('syncs latest business positions into flow nodes', () => {
    const [businessNode] = createCanvasFlowNodes({
      promptCards: [card],
      selectedNodeIds: [],
      imageNodes: [],
      shapeNodes: [],
      strokes: [],
      textNodes: [],
      ...baseHandlers,
    })

    expect(
      syncCanvasNodes([{ ...businessNode, position: { x: 10, y: 10 } }], [
        businessNode,
      ])[0].position,
    ).toEqual({ x: 1, y: 2 })
  })

  it('keeps transient React Flow selection while syncing business data', () => {
    const [businessNode] = createCanvasFlowNodes({
      promptCards: [card],
      selectedNodeIds: [],
      imageNodes: [],
      shapeNodes: [],
      strokes: [],
      textNodes: [],
      ...baseHandlers,
    })

    const [syncedNode] = syncCanvasNodes(
      [{ ...businessNode, selected: true }],
      [businessNode],
    )

    expect(syncedNode.selected).toBe(true)
  })

  it('keeps flowchart preview nodes while syncing business data', () => {
    const [businessNode] = createCanvasFlowNodes({
      promptCards: [card],
      selectedNodeIds: [],
      imageNodes: [],
      shapeNodes: [],
      strokes: [],
      textNodes: [],
      ...baseHandlers,
    })
    const previewNode = {
      ...businessNode,
      id: 'flow-preview-step-01',
      position: { x: 99, y: 100 },
    }

    const syncedNodes = syncCanvasNodes([businessNode, previewNode], [businessNode])

    expect(syncedNodes.map((node) => node.id)).toEqual([
      'card',
      'flow-preview-step-01',
    ])
    expect(syncedNodes[1].position).toEqual({ x: 99, y: 100 })
  })

  it('keeps transient React Flow edge selection while syncing business data', () => {
    const [businessEdge] = createCanvasFlowEdges([
      {
        id: 'edge',
        canvasId: 'canvas',
        sourceId: 'a',
        targetId: 'b',
        createdAt: 'now',
        updatedAt: 'now',
      },
    ])

    const [syncedEdge] = syncCanvasEdges(
      [{ ...businessEdge, selected: true }],
      [businessEdge],
    )

    expect(syncedEdge.selected).toBe(true)
  })

  it('keeps flowchart preview edges while syncing business data', () => {
    const [businessEdge] = createCanvasFlowEdges([
      {
        id: 'edge',
        canvasId: 'canvas',
        sourceId: 'a',
        targetId: 'b',
        createdAt: 'now',
        updatedAt: 'now',
      },
    ])
    const previewEdge = {
      ...businessEdge,
      id: 'flow-preview-edge-01',
      source: 'flow-preview-step-01',
      target: 'flow-preview-step-02',
    }

    const syncedEdges = syncCanvasEdges([businessEdge, previewEdge], [businessEdge])

    expect(syncedEdges.map((edge) => edge.id)).toEqual([
      'edge',
      'flow-preview-edge-01',
    ])
    expect(syncedEdges[1]).toMatchObject({
      source: 'flow-preview-step-01',
      target: 'flow-preview-step-02',
    })
  })
})
