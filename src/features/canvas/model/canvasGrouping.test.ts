import { describe, expect, it } from 'vitest'
import {
  createCanvasGroupAssignments,
  createCanvasGroupLookup,
  expandCanvasNodeIdsByGroups,
  getCanvasFlowSelectionBounds,
  resolveCanvasGroupAction,
} from './canvasGrouping'
import type { CanvasFlowNode } from './canvasFlowMapping'
import type { CanvasImageNode, CanvasShapeNode, CanvasTextNode } from '@/shared/types'

const shapeA: CanvasShapeNode = {
  id: 'shape-a',
  canvasId: 'canvas',
  kind: 'step',
  title: 'A',
  body: 'Body',
  position: { x: 10, y: 20 },
  width: 200,
  height: 100,
  groupId: 'group-1',
  createdAt: 'now',
  updatedAt: 'now',
}

const shapeB: CanvasShapeNode = {
  ...shapeA,
  id: 'shape-b',
  position: { x: 260, y: 40 },
}

const image: CanvasImageNode = {
  id: 'image',
  canvasId: 'canvas',
  name: 'image.png',
  mimeType: 'image/png',
  dataUrl: 'data:image/png;base64,abc',
  position: { x: 80, y: 180 },
  width: 160,
  height: 90,
  createdAt: 'now',
  updatedAt: 'now',
}

const text: CanvasTextNode = {
  id: 'text',
  canvasId: 'canvas',
  text: 'Title',
  position: { x: 80, y: 160 },
  width: 120,
  color: '#ededed',
  fontSize: 18,
  backgroundColor: 'transparent',
  groupId: 'group-1',
  createdAt: 'now',
  updatedAt: 'now',
}

const elements = {
  imageNodes: [image],
  inputCards: [],
  promptCards: [],
  shapeNodes: [shapeA, shapeB],
  strokes: [],
  textNodes: [text],
}

describe('canvas grouping model', () => {
  it('expands selected node ids to every node in the same group', () => {
    const lookup = createCanvasGroupLookup(elements)

    expect(expandCanvasNodeIdsByGroups(['shape-a'], lookup)).toEqual([
      'shape-a',
      'shape-b',
      'text',
    ])
    expect(expandCanvasNodeIdsByGroups(['image'], lookup)).toEqual(['image'])
  })

  it('resolves group and ungroup actions from the current selection', () => {
    const lookup = createCanvasGroupLookup(elements)

    expect(resolveCanvasGroupAction(['shape-a', 'image'], lookup)).toEqual({
      kind: 'group',
    })
    expect(resolveCanvasGroupAction(['shape-a', 'shape-b', 'text'], lookup)).toEqual({
      groupId: 'group-1',
      kind: 'ungroup',
    })
    expect(resolveCanvasGroupAction(['shape-a'], lookup)).toBeUndefined()
  })

  it('creates assignments only for selected groupable nodes', () => {
    expect(
      createCanvasGroupAssignments({
        elements,
        groupId: 'next-group',
        nodeIds: ['shape-a', 'image', 'missing'],
      }),
    ).toEqual([
      { groupId: 'next-group', id: 'shape-a', kind: 'flowShape' },
      { groupId: 'next-group', id: 'image', kind: 'canvasImage' },
    ])
  })

  it('calculates selection bounds from flow node dimensions', () => {
    const nodes = [
      {
        id: 'shape-a',
        position: { x: 10, y: 20 },
        style: { height: 100, width: 200 },
        type: 'flowShape',
      },
      {
        id: 'image',
        position: { x: 80, y: 180 },
        style: { height: 90, width: 160 },
        type: 'canvasImage',
      },
    ] as CanvasFlowNode[]

    expect(getCanvasFlowSelectionBounds(nodes, ['shape-a', 'image'])).toEqual({
      height: 250,
      width: 230,
      x: 10,
      y: 20,
    })
  })
})
