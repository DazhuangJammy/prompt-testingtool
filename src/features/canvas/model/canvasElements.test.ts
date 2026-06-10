import { describe, expect, it, vi } from 'vitest'
import {
  createCanvasEdge,
  createCanvasShapeNode,
  createCanvasStroke,
  createCanvasTextNode,
} from './canvasElements'

vi.mock('@/shared/utils/identity', () => ({
  createId: vi.fn(() => 'id-1'),
}))

vi.mock('@/shared/utils/time', () => ({
  nowIso: vi.fn(() => 'now'),
}))

describe('canvas elements model', () => {
  it('creates default shape nodes by kind', () => {
    expect(createCanvasShapeNode('canvas', 'step', { x: 1, y: 2 })).toMatchObject({
      body: '流程说明',
      canvasId: 'canvas',
      height: 112,
      id: 'id-1',
      kind: 'step',
      position: { x: 1, y: 2 },
      title: '步骤',
      width: 200,
    })

    expect(createCanvasShapeNode('canvas', 'decision', { x: 3, y: 4 })).toMatchObject({
      body: '分支条件',
      height: 120,
      kind: 'decision',
      title: '判断',
      width: 180,
    })
  })

  it('creates edges with optional handles normalized', () => {
    expect(
      createCanvasEdge('canvas', 'source', 'target', null, 'top'),
    ).toMatchObject({
      canvasId: 'canvas',
      sourceHandle: undefined,
      sourceId: 'source',
      targetHandle: 'top',
      targetId: 'target',
    })
  })

  it('creates strokes with defaults', () => {
    expect(createCanvasStroke('canvas', [{ x: 1, y: 2 }])).toMatchObject({
      canvasId: 'canvas',
      color: '#78d18b',
      points: [{ x: 1, y: 2 }],
      strokeWidth: 3,
    })
  })

  it('creates free text nodes with style defaults', () => {
    expect(createCanvasTextNode('canvas', { x: 5, y: 6 })).toMatchObject({
      backgroundColor: 'transparent',
      canvasId: 'canvas',
      color: '#ededed',
      fontSize: 18,
      position: { x: 5, y: 6 },
      text: '双击编辑文字',
      width: 220,
    })
  })
})
