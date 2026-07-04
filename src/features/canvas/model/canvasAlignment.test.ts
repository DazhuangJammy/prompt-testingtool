import type { Edge } from '@xyflow/react'
import { describe, expect, it } from 'vitest'
import {
  isCanvasAlignmentNode,
  microArrangeCanvasNodes,
  snapCanvasNodeToNearbyNodes,
} from './canvasAlignment'
import type { CanvasFlowNode } from './canvasFlowMapping'

function shapeNode(
  id: string,
  position: { x: number; y: number },
  size = { height: 100, width: 200 },
): CanvasFlowNode {
  return {
    id,
    position,
    style: size,
    type: 'flowShape',
    data: {
      node: {
        id,
        body: '',
        canvasId: 'canvas',
        createdAt: 'now',
        height: size.height,
        kind: 'step',
        position,
        title: id,
        updatedAt: 'now',
        width: size.width,
      },
      onSelect: () => undefined,
      onUpdate: () => undefined,
    },
  }
}

function promptNode(id: string, position: { x: number; y: number }): CanvasFlowNode {
  return {
    id,
    position,
    type: 'promptCard',
    data: {
      card: {
        id,
        canvasId: 'canvas',
        createdAt: 'now',
        position,
        sections: {},
        title: id,
        updatedAt: 'now',
      },
      onChange: () => undefined,
      onSelect: () => undefined,
    },
  }
}

function textNode(id: string, position: { x: number; y: number }): CanvasFlowNode {
  return {
    id,
    position,
    style: { width: '160px' },
    type: 'freeText',
    data: {
      node: {
        id,
        backgroundColor: 'transparent',
        canvasId: 'canvas',
        color: '#ededed',
        createdAt: 'now',
        fontSize: 18,
        position,
        text: id,
        updatedAt: 'now',
        width: 160,
      },
      onSelect: () => undefined,
      onUpdate: () => undefined,
    },
  } as CanvasFlowNode
}

function strokeNode(id: string, position: { x: number; y: number }): CanvasFlowNode {
  return {
    id,
    position,
    type: 'freehandStroke',
    data: {
      bounds: { height: 40, minX: position.x, minY: position.y, width: 40 },
      onSelect: () => undefined,
      stroke: {
        id,
        canvasId: 'canvas',
        color: '#ededed',
        createdAt: 'now',
        points: [position],
        strokeWidth: 3,
        updatedAt: 'now',
      },
      viewPoints: [{ x: 0, y: 0 }],
    },
  }
}

describe('canvas alignment', () => {
  it('only treats block-like canvas nodes as alignment targets', () => {
    expect(isCanvasAlignmentNode(shapeNode('shape', { x: 0, y: 0 }))).toBe(true)
    expect(isCanvasAlignmentNode(promptNode('prompt', { x: 0, y: 0 }))).toBe(true)
    expect(isCanvasAlignmentNode(textNode('text', { x: 0, y: 0 }))).toBe(true)
    expect(
      isCanvasAlignmentNode({
        ...shapeNode('image', { x: 0, y: 0 }),
        type: 'canvasImage',
      } as CanvasFlowNode),
    ).toBe(true)
    expect(isCanvasAlignmentNode(strokeNode('stroke', { x: 0, y: 0 }))).toBe(false)
  })

  it('does not snap unsupported nodes', () => {
    const stroke = strokeNode('stroke', { x: 196, y: 105 })
    const target = shapeNode('target', { x: 0, y: 0 })
    const result = snapCanvasNodeToNearbyNodes(stroke, [stroke, target])

    expect(result.position).toEqual({ x: 196, y: 105 })
    expect(result.guides).toEqual([])
  })

  it('snaps a dragged node to nearby vertical and horizontal anchors', () => {
    const dragged = shapeNode('dragged', { x: 196, y: 105 })
    const target = shapeNode('target', { x: 0, y: 0 })
    const result = snapCanvasNodeToNearbyNodes(dragged, [dragged, target])

    expect(result.position).toEqual({ x: 200, y: 100 })
    expect(result.guides).toHaveLength(2)
    expect(result.guides.map((guide) => guide.axis).sort()).toEqual(['x', 'y'])
  })

  it('does not snap when the nearest anchor is outside the threshold', () => {
    const dragged = shapeNode('dragged', { x: 186, y: 112 })
    const target = shapeNode('target', { x: 0, y: 0 })
    const result = snapCanvasNodeToNearbyNodes(dragged, [dragged, target])

    expect(result.position).toEqual({ x: 186, y: 112 })
    expect(result.guides).toEqual([])
  })

  it('chooses the closest snap candidate when multiple anchors are nearby', () => {
    const dragged = shapeNode('dragged', { x: 194, y: 0 })
    const closer = shapeNode('closer', { x: 200, y: 0 })
    const wider = shapeNode('wider', { x: 202, y: 140 })
    const result = snapCanvasNodeToNearbyNodes(dragged, [dragged, closer, wider])

    expect(result.position.x).toBe(200)
  })

  it('uses default prompt and text target dimensions when measurements are absent', () => {
    const dragged = shapeNode('dragged', { x: 416, y: 93 })
    const targetPrompt = promptNode('target-prompt', { x: 0, y: 0 })
    const targetText = textNode('target-text', { x: 800, y: 0 })
    const result = snapCanvasNodeToNearbyNodes(dragged, [
      dragged,
      targetPrompt,
      targetText,
    ])

    expect(result.position).toEqual({ x: 420, y: 96 })
  })

  it('uses measured dimensions before style dimensions', () => {
    const dragged = {
      ...shapeNode('dragged', { x: 145, y: 0 }, { height: 100, width: 100 }),
      measured: { height: 80, width: 150 },
      style: { height: 100, width: 100 },
    } as CanvasFlowNode
    const target = shapeNode('target', { x: 0, y: 0 }, { height: 80, width: 150 })
    const result = snapCanvasNodeToNearbyNodes(dragged, [dragged, target])

    expect(result.position.x).toBe(150)
  })

  it('micro-arranges lightly misaligned connected vertical nodes', () => {
    const source = shapeNode('source', { x: 0, y: 0 })
    const target = shapeNode('target', { x: 24, y: 180 })
    const edge: Edge = { id: 'edge', source: 'source', target: 'target' }
    const result = microArrangeCanvasNodes([source, target], [edge], [])

    expect(result.changedNodes).toHaveLength(1)
    expect(result.nodes.find((node) => node.id === 'target')?.position).toEqual({
      x: 0,
      y: 180,
    })
  })

  it('micro-arranges lightly misaligned connected horizontal nodes', () => {
    const source = shapeNode('source', { x: 0, y: 24 })
    const target = shapeNode('target', { x: 260, y: 0 })
    const edge: Edge = { id: 'edge', source: 'source', target: 'target' }
    const result = microArrangeCanvasNodes([source, target], [edge], [])

    expect(result.nodes.find((node) => node.id === 'target')?.position).toEqual({
      x: 260,
      y: 24,
    })
  })

  it('ignores edges whose endpoints cannot be arranged', () => {
    const source = shapeNode('source', { x: 0, y: 0 })
    const edge: Edge = { id: 'edge', source: 'source', target: 'missing' }
    const result = microArrangeCanvasNodes([source], [edge], [])

    expect(result.changedNodes).toEqual([])
    expect(result.nodes[0]).toBe(source)
  })

  it('keeps unselected connected nodes untouched when selection excludes them', () => {
    const source = shapeNode('source', { x: 0, y: 0 })
    const target = shapeNode('target', { x: 24, y: 180 })
    const edge: Edge = { id: 'edge', source: 'source', target: 'target' }
    const result = microArrangeCanvasNodes([source, target], [edge], ['other'])

    expect(result.changedNodes).toEqual([])
    expect(result.nodes.find((node) => node.id === 'target')?.position).toEqual({
      x: 24,
      y: 180,
    })
  })

  it('does not rewrite nodes that are already aligned', () => {
    const source = shapeNode('source', { x: 0, y: 0 })
    const target = shapeNode('target', { x: 0, y: 180 })
    const edge: Edge = { id: 'edge', source: 'source', target: 'target' }
    const result = microArrangeCanvasNodes([source, target], [edge], [])

    expect(result.changedNodes).toEqual([])
    expect(result.nodes[1]).toBe(target)
  })

  it('leaves intentionally far connected nodes in place', () => {
    const source = shapeNode('source', { x: 0, y: 0 })
    const target = shapeNode('target', { x: 180, y: 180 })
    const edge: Edge = { id: 'edge', source: 'source', target: 'target' }
    const result = microArrangeCanvasNodes([source, target], [edge], [])

    expect(result.changedNodes).toEqual([])
    expect(result.nodes.find((node) => node.id === 'target')?.position).toEqual({
      x: 180,
      y: 180,
    })
  })

  it('only moves selected nodes when a selection exists', () => {
    const source = shapeNode('source', { x: 20, y: 0 })
    const target = shapeNode('target', { x: 0, y: 180 })
    const edge: Edge = { id: 'edge', source: 'source', target: 'target' }
    const result = microArrangeCanvasNodes([source, target], [edge], ['source'])

    expect(result.changedNodes).toHaveLength(1)
    expect(result.nodes.find((node) => node.id === 'source')?.position).toEqual({
      x: 0,
      y: 0,
    })
    expect(result.nodes.find((node) => node.id === 'target')?.position).toEqual({
      x: 0,
      y: 180,
    })
  })
})
