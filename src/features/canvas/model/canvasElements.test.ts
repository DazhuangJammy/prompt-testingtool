import { describe, expect, it, vi } from 'vitest'
import {
  createCanvasEdge,
  createCanvasImageNode,
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
      color: '#ededed',
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

  it('creates image nodes fitted to the default preview size', () => {
    expect(
      createCanvasImageNode('canvas', { x: 9, y: 10 }, {
        dataUrl: 'data:image/png;base64,abc',
        mimeType: 'image/png',
        name: 'wide.png',
        naturalHeight: 600,
        naturalWidth: 1200,
      }),
    ).toMatchObject({
      canvasId: 'canvas',
      dataUrl: 'data:image/png;base64,abc',
      height: 210,
      id: 'id-1',
      mimeType: 'image/png',
      name: 'wide.png',
      position: { x: 9, y: 10 },
      width: 420,
    })
  })

  it('creates image nodes with safe defaults for missing metadata', () => {
    expect(
      createCanvasImageNode('canvas', { x: 0, y: 0 }, {
        dataUrl: 'data:image/png;base64,abc',
        mimeType: '',
        name: '   ',
        naturalHeight: 0,
        naturalWidth: Number.NaN,
      }),
    ).toMatchObject({
      height: 280,
      mimeType: 'image/png',
      name: '粘贴图片',
      width: 420,
    })
  })
})
