import { describe, expect, it, vi } from 'vitest'
import { db } from '@/shared/storage/db'
import { canvasRepository } from './canvasRepository'
import type { PromptCard } from '@/shared/types'

vi.mock('@/shared/storage/db', () => ({
  db: {
    canvases: { update: vi.fn() },
    canvasEdges: {
      bulkPut: vi.fn(),
      delete: vi.fn(),
      put: vi.fn(),
      update: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          delete: vi.fn(),
          sortBy: vi.fn(() => []),
        })),
      })),
    },
    canvasShapeNodes: {
      bulkPut: vi.fn(),
      delete: vi.fn(),
      put: vi.fn(),
      update: vi.fn(),
      where: vi.fn(() => ({ equals: vi.fn(() => ({ sortBy: vi.fn(() => []) })) })),
    },
    canvasImageNodes: {
      bulkPut: vi.fn(),
      delete: vi.fn(),
      put: vi.fn(),
      update: vi.fn(),
      where: vi.fn(() => ({ equals: vi.fn(() => ({ sortBy: vi.fn(() => []) })) })),
    },
    canvasStrokes: {
      bulkPut: vi.fn(),
      delete: vi.fn(),
      put: vi.fn(),
      update: vi.fn(),
      where: vi.fn(() => ({ equals: vi.fn(() => ({ sortBy: vi.fn(() => []) })) })),
    },
    canvasTextNodes: {
      bulkPut: vi.fn(),
      delete: vi.fn(),
      put: vi.fn(),
      update: vi.fn(),
      where: vi.fn(() => ({ equals: vi.fn(() => ({ sortBy: vi.fn(() => []) })) })),
    },
    promptCards: { bulkPut: vi.fn(), put: vi.fn(), update: vi.fn() },
    transaction: vi.fn(async (_mode, _tables, callback) => callback()),
  },
}))

const card: PromptCard = {
  id: 'card',
  canvasId: 'canvas',
  title: 'T',
  position: { x: 0, y: 0 },
  sections: {},
  createdAt: 'now',
  updatedAt: 'now',
}

describe('canvas repository', () => {
  it('saves prompt card and touches canvas', async () => {
    await canvasRepository.savePromptCard(card)

    expect(db.promptCards.put).toHaveBeenCalledWith(card)
    expect(db.canvases.update).toHaveBeenCalledWith('canvas', expect.any(Object))
  })

  it('updates prompt card position', async () => {
    await canvasRepository.updatePromptCardPosition('card', { x: 1, y: 2 })

    expect(db.promptCards.update).toHaveBeenCalledWith('card', {
      position: { x: 1, y: 2 },
      updatedAt: expect.any(String),
    })
  })

  it('touches canvas', async () => {
    await canvasRepository.touchCanvas('canvas')

    expect(db.canvases.update).toHaveBeenCalledWith('canvas', expect.any(Object))
  })

  it('saves and updates shape nodes', async () => {
    const node = {
      id: 'shape',
      canvasId: 'canvas',
      kind: 'step' as const,
      title: 'Step',
      body: 'Body',
      position: { x: 1, y: 2 },
      width: 200,
      height: 100,
      createdAt: 'now',
      updatedAt: 'now',
    }

    await canvasRepository.saveShapeNode(node)
    await canvasRepository.updateShapeNode('shape', { title: 'Next' })

    expect(db.canvasShapeNodes.put).toHaveBeenCalledWith(node)
    expect(db.canvasShapeNodes.update).toHaveBeenCalledWith('shape', {
      title: 'Next',
      updatedAt: expect.any(String),
    })
    expect(db.canvases.update).toHaveBeenCalledWith('canvas', expect.any(Object))
  })

  it('deletes and lists shape nodes', async () => {
    await canvasRepository.deleteShapeNode('shape')
    await canvasRepository.listShapeNodesByCanvas('canvas')

    expect(db.canvasShapeNodes.delete).toHaveBeenCalledWith('shape')
    expect(db.canvasShapeNodes.where).toHaveBeenCalledWith('canvasId')
  })

  it('saves edges and deletes edges for a node', async () => {
    await canvasRepository.saveEdge({
      id: 'edge',
      canvasId: 'canvas',
      sourceId: 'a',
      targetId: 'b',
      createdAt: 'now',
      updatedAt: 'now',
    })
    await canvasRepository.deleteEdgesForNode('a')

    expect(db.canvasEdges.put).toHaveBeenCalledWith(expect.objectContaining({ id: 'edge' }))
    expect(db.canvasEdges.where).toHaveBeenCalledWith('sourceId')
    expect(db.canvasEdges.where).toHaveBeenCalledWith('targetId')
  })

  it('deletes and lists edges', async () => {
    await canvasRepository.deleteEdge('edge')
    await canvasRepository.listEdgesByCanvas('canvas')

    expect(db.canvasEdges.delete).toHaveBeenCalledWith('edge')
    expect(db.canvasEdges.where).toHaveBeenCalledWith('canvasId')
  })

  it('updates edge connections', async () => {
    await canvasRepository.updateEdge('edge', {
      sourceId: 'next-a',
      targetId: 'next-b',
      sourceHandle: 'right',
      targetHandle: 'left',
    })

    expect(db.canvasEdges.update).toHaveBeenCalledWith('edge', {
      sourceId: 'next-a',
      targetId: 'next-b',
      sourceHandle: 'right',
      targetHandle: 'left',
      updatedAt: expect.any(String),
    })
  })

  it('saves strokes', async () => {
    await canvasRepository.saveStroke({
      id: 'stroke',
      canvasId: 'canvas',
      points: [{ x: 1, y: 2 }],
      color: '#fff',
      strokeWidth: 3,
      createdAt: 'now',
      updatedAt: 'now',
    })

    expect(db.canvasStrokes.put).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'stroke' }),
    )
    expect(db.canvases.update).toHaveBeenCalledWith('canvas', expect.any(Object))
  })

  it('updates strokes', async () => {
    await canvasRepository.updateStroke('stroke', {
      color: '#fff',
      points: [{ x: 3, y: 4 }],
    })

    expect(db.canvasStrokes.update).toHaveBeenCalledWith('stroke', {
      color: '#fff',
      points: [{ x: 3, y: 4 }],
      updatedAt: expect.any(String),
    })
  })

  it('deletes and lists strokes', async () => {
    await canvasRepository.deleteStroke('stroke')
    await canvasRepository.listStrokesByCanvas('canvas')

    expect(db.canvasStrokes.delete).toHaveBeenCalledWith('stroke')
    expect(db.canvasStrokes.where).toHaveBeenCalledWith('canvasId')
  })

  it('saves, updates, deletes and lists free text nodes', async () => {
    await canvasRepository.saveTextNode({
      id: 'text',
      canvasId: 'canvas',
      text: 'Text',
      position: { x: 1, y: 2 },
      width: 180,
      color: '#fff',
      fontSize: 18,
      backgroundColor: 'transparent',
      createdAt: 'now',
      updatedAt: 'now',
    })
    await canvasRepository.updateTextNode('text', {
      color: '#000',
      fontSize: 24,
    })
    await canvasRepository.deleteTextNode('text')
    await canvasRepository.listTextNodesByCanvas('canvas')

    expect(db.canvasTextNodes.put).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'text' }),
    )
    expect(db.canvasTextNodes.update).toHaveBeenCalledWith('text', {
      color: '#000',
      fontSize: 24,
      updatedAt: expect.any(String),
    })
    expect(db.canvasTextNodes.delete).toHaveBeenCalledWith('text')
    expect(db.canvasTextNodes.where).toHaveBeenCalledWith('canvasId')
  })

  it('saves, updates, deletes and lists image nodes', async () => {
    await canvasRepository.saveImageNode({
      id: 'image',
      canvasId: 'canvas',
      name: 'chart.png',
      mimeType: 'image/png',
      dataUrl: 'data:image/png;base64,abc',
      position: { x: 1, y: 2 },
      width: 200,
      height: 120,
      createdAt: 'now',
      updatedAt: 'now',
    })
    await canvasRepository.updateImageNode('image', {
      height: 160,
      width: 240,
    })
    await canvasRepository.deleteImageNode('image')
    await canvasRepository.listImageNodesByCanvas('canvas')

    expect(db.canvasImageNodes.put).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'image' }),
    )
    expect(db.canvasImageNodes.update).toHaveBeenCalledWith('image', {
      height: 160,
      width: 240,
      updatedAt: expect.any(String),
    })
    expect(db.canvasImageNodes.delete).toHaveBeenCalledWith('image')
    expect(db.canvasImageNodes.where).toHaveBeenCalledWith('canvasId')
  })

  it('saves pasted elements in one transaction and touches canvas', async () => {
    await canvasRepository.savePastedElements({
      canvasId: 'canvas',
      edges: [
        {
          id: 'edge',
          canvasId: 'canvas',
          sourceId: 'card',
          targetId: 'shape',
          createdAt: 'now',
          updatedAt: 'now',
        },
      ],
      imageNodes: [
        {
          id: 'image',
          canvasId: 'canvas',
          name: 'chart.png',
          mimeType: 'image/png',
          dataUrl: 'data:image/png;base64,abc',
          position: { x: 1, y: 2 },
          width: 200,
          height: 120,
          createdAt: 'now',
          updatedAt: 'now',
        },
      ],
      promptCards: [card],
      shapeNodes: [
        {
          id: 'shape',
          canvasId: 'canvas',
          kind: 'step',
          title: 'Step',
          body: 'Body',
          position: { x: 1, y: 2 },
          width: 200,
          height: 100,
          createdAt: 'now',
          updatedAt: 'now',
        },
      ],
      strokes: [
        {
          id: 'stroke',
          canvasId: 'canvas',
          points: [{ x: 1, y: 2 }],
          color: '#fff',
          strokeWidth: 3,
          createdAt: 'now',
          updatedAt: 'now',
        },
      ],
      textNodes: [
        {
          id: 'text',
          canvasId: 'canvas',
          text: 'Text',
          position: { x: 1, y: 2 },
          width: 180,
          color: '#fff',
          fontSize: 18,
          backgroundColor: 'transparent',
          createdAt: 'now',
          updatedAt: 'now',
        },
      ],
    })

    expect(db.transaction).toHaveBeenCalled()
    expect(db.promptCards.bulkPut).toHaveBeenCalledWith([card])
    expect(db.canvasShapeNodes.bulkPut).toHaveBeenCalled()
    expect(db.canvasImageNodes.bulkPut).toHaveBeenCalled()
    expect(db.canvasTextNodes.bulkPut).toHaveBeenCalled()
    expect(db.canvasStrokes.bulkPut).toHaveBeenCalled()
    expect(db.canvasEdges.bulkPut).toHaveBeenCalled()
    expect(db.canvases.update).toHaveBeenCalledWith('canvas', expect.any(Object))
  })
})
