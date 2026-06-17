import { describe, expect, it, vi } from 'vitest'
import { canvasRepository } from '@/features/canvas/infrastructure/canvasRepository'
import {
  deleteCanvasEdge,
  deleteCanvasStroke,
  deleteImageNodeCascade,
  deleteShapeNodeCascade,
  deleteTextNodeCascade,
  persistCanvasStrokePosition,
  persistImageNodePosition,
  persistPromptNodeChanges,
  persistPromptNodePosition,
  persistShapeNodePosition,
  persistTextNodePosition,
  pasteCanvasClipboard,
  reconnectCanvasEdge,
} from './canvasService'
import type { PromptCard } from '@/shared/types'
import type { PromptNodeData } from '@/features/prompt-card/PromptCardNode.types'

vi.mock('@/features/canvas/infrastructure/canvasRepository', () => ({
  canvasRepository: {
    deleteEdgesForNode: vi.fn(),
    deleteEdge: vi.fn(),
    deleteShapeNode: vi.fn(),
    deleteImageNode: vi.fn(),
    deleteStroke: vi.fn(),
    deleteTextNode: vi.fn(),
    touchCanvas: vi.fn(),
    updateEdge: vi.fn(),
    savePastedElements: vi.fn(),
    updateStroke: vi.fn(),
    updateImageNode: vi.fn(),
    updateShapeNode: vi.fn(),
    updateTextNode: vi.fn(),
    updatePromptCardPosition: vi.fn(),
  },
}))

const card: PromptCard = {
  id: 'card-1',
  canvasId: 'canvas-1',
  title: 'Prompt',
  position: { x: 0, y: 0 },
  sections: {},
  createdAt: 'now',
  updatedAt: 'now',
}

const nodeData: PromptNodeData = {
  card,
  onChange: vi.fn(),
  onSelect: vi.fn(),
}

describe('canvas service', () => {
  it('persists moved node positions and touches canvas', async () => {
    vi.mocked(canvasRepository.updatePromptCardPosition).mockResolvedValue(undefined)

    await persistPromptNodeChanges(
      [{ id: 'card-1', type: 'position', position: { x: 12, y: 4 } }],
      [{ id: 'card-1', position: card.position, data: nodeData }],
      [card],
      'canvas-1',
    )

    expect(canvasRepository.updatePromptCardPosition).toHaveBeenCalledWith(
      'card-1',
      { x: 12, y: 4 },
    )
    expect(canvasRepository.touchCanvas).toHaveBeenCalledWith('canvas-1')
  })

  it('skips unchanged positions', async () => {
    vi.clearAllMocks()

    await persistPromptNodeChanges(
      [{ id: 'card-1', type: 'select', selected: true }],
      [{ id: 'card-1', position: card.position, data: nodeData }],
      [card],
      'canvas-1',
    )

    expect(canvasRepository.updatePromptCardPosition).not.toHaveBeenCalled()
    expect(canvasRepository.touchCanvas).not.toHaveBeenCalled()
  })

  it('persists a final drag-stop position', async () => {
    vi.clearAllMocks()

    await persistPromptNodePosition(
      'card-1',
      { x: 20, y: 24 },
      [card],
      'canvas-1',
    )

    expect(canvasRepository.updatePromptCardPosition).toHaveBeenCalledWith(
      'card-1',
      { x: 20, y: 24 },
    )
    expect(canvasRepository.touchCanvas).toHaveBeenCalledWith('canvas-1')
  })

  it('skips missing or unchanged drag-stop positions', async () => {
    vi.clearAllMocks()

    await persistPromptNodePosition('missing', { x: 20, y: 24 }, [card])
    await persistPromptNodePosition('card-1', card.position, [card])

    expect(canvasRepository.updatePromptCardPosition).not.toHaveBeenCalled()
    expect(canvasRepository.touchCanvas).not.toHaveBeenCalled()
  })

  it('persists shape node positions', async () => {
    vi.clearAllMocks()

    await persistShapeNodePosition(
      'shape',
      { x: 10, y: 14 },
      [
        {
          id: 'shape',
          canvasId: 'canvas-1',
          kind: 'step',
          title: 'Step',
          body: '',
          position: { x: 0, y: 0 },
          width: 200,
          height: 100,
          createdAt: 'now',
          updatedAt: 'now',
        },
      ],
      'canvas-1',
    )

    expect(canvasRepository.updateShapeNode).toHaveBeenCalledWith('shape', {
      position: { x: 10, y: 14 },
    })
    expect(canvasRepository.touchCanvas).toHaveBeenCalledWith('canvas-1')
  })

  it('persists free text node positions', async () => {
    vi.clearAllMocks()

    await persistTextNodePosition(
      'text',
      { x: 12, y: 18 },
      [
        {
          id: 'text',
          canvasId: 'canvas-1',
          text: 'Text',
          position: { x: 0, y: 0 },
          width: 160,
          color: '#fff',
          fontSize: 18,
          backgroundColor: 'transparent',
          createdAt: 'now',
          updatedAt: 'now',
        },
      ],
      'canvas-1',
    )

    expect(canvasRepository.updateTextNode).toHaveBeenCalledWith('text', {
      position: { x: 12, y: 18 },
    })
    expect(canvasRepository.touchCanvas).toHaveBeenCalledWith('canvas-1')
  })

  it('persists image node positions', async () => {
    vi.clearAllMocks()

    await persistImageNodePosition(
      'image',
      { x: 12, y: 18 },
      [
        {
          id: 'image',
          canvasId: 'canvas-1',
          name: 'chart.png',
          mimeType: 'image/png',
          dataUrl: 'data:image/png;base64,abc',
          position: { x: 0, y: 0 },
          width: 200,
          height: 120,
          createdAt: 'now',
          updatedAt: 'now',
        },
      ],
      'canvas-1',
    )

    expect(canvasRepository.updateImageNode).toHaveBeenCalledWith('image', {
      position: { x: 12, y: 18 },
    })
    expect(canvasRepository.touchCanvas).toHaveBeenCalledWith('canvas-1')
  })


  it('persists moved stroke points from the final node position', async () => {
    vi.clearAllMocks()

    await persistCanvasStrokePosition(
      'stroke',
      { x: 20, y: 30 },
      [
        {
          id: 'stroke',
          canvasId: 'canvas-1',
          points: [
            { x: 10, y: 10 },
            { x: 30, y: 20 },
          ],
          color: '#fff',
          strokeWidth: 3,
          createdAt: 'now',
          updatedAt: 'now',
        },
      ],
      'canvas-1',
    )

    expect(canvasRepository.updateStroke).toHaveBeenCalledWith('stroke', {
      points: [
        { x: 31, y: 41 },
        { x: 51, y: 51 },
      ],
    })
    expect(canvasRepository.touchCanvas).toHaveBeenCalledWith('canvas-1')
  })

  it('skips unchanged stroke positions', async () => {
    vi.clearAllMocks()

    await persistCanvasStrokePosition(
      'stroke',
      { x: -1, y: -1 },
      [
        {
          id: 'stroke',
          canvasId: 'canvas-1',
          points: [{ x: 10, y: 10 }],
          color: '#fff',
          strokeWidth: 3,
          createdAt: 'now',
          updatedAt: 'now',
        },
      ],
      'canvas-1',
    )

    expect(canvasRepository.updateStroke).not.toHaveBeenCalled()
    expect(canvasRepository.touchCanvas).not.toHaveBeenCalled()
  })

  it('deletes shape nodes with related edges', async () => {
    vi.clearAllMocks()

    await deleteShapeNodeCascade('shape', 'canvas-1')

    expect(canvasRepository.deleteEdgesForNode).toHaveBeenCalledWith('shape')
    expect(canvasRepository.deleteShapeNode).toHaveBeenCalledWith('shape')
    expect(canvasRepository.touchCanvas).toHaveBeenCalledWith('canvas-1')
  })

  it('deletes free text nodes with related edges', async () => {
    vi.clearAllMocks()

    await deleteTextNodeCascade('text', 'canvas-1')

    expect(canvasRepository.deleteEdgesForNode).toHaveBeenCalledWith('text')
    expect(canvasRepository.deleteTextNode).toHaveBeenCalledWith('text')
    expect(canvasRepository.touchCanvas).toHaveBeenCalledWith('canvas-1')
  })

  it('deletes image nodes with related edges', async () => {
    vi.clearAllMocks()

    await deleteImageNodeCascade('image', 'canvas-1')

    expect(canvasRepository.deleteEdgesForNode).toHaveBeenCalledWith('image')
    expect(canvasRepository.deleteImageNode).toHaveBeenCalledWith('image')
    expect(canvasRepository.touchCanvas).toHaveBeenCalledWith('canvas-1')
  })


  it('deletes selected edges and strokes', async () => {
    vi.clearAllMocks()

    await deleteCanvasEdge('edge', 'canvas-1')
    await deleteCanvasStroke('stroke', 'canvas-1')

    expect(canvasRepository.deleteEdge).toHaveBeenCalledWith('edge')
    expect(canvasRepository.deleteStroke).toHaveBeenCalledWith('stroke')
    expect(canvasRepository.touchCanvas).toHaveBeenCalledTimes(2)
  })

  it('reconnects canvas edges', async () => {
    vi.clearAllMocks()

    await reconnectCanvasEdge(
      'edge',
      {
        sourceId: 'a',
        targetId: 'b',
        sourceHandle: 'right',
        targetHandle: 'left',
      },
      'canvas-1',
    )

    expect(canvasRepository.updateEdge).toHaveBeenCalledWith('edge', {
      sourceId: 'a',
      targetId: 'b',
      sourceHandle: 'right',
      targetHandle: 'left',
    })
    expect(canvasRepository.touchCanvas).toHaveBeenCalledWith('canvas-1')
  })

  it('pastes clipboard elements through the repository', async () => {
    vi.clearAllMocks()

    const result = await pasteCanvasClipboard(
      'canvas-1',
      {
        edges: [],
        imageNodes: [],
        origin: { x: 0, y: 0 },
        promptCards: [card],
        shapeNodes: [],
        strokes: [],
        textNodes: [],
      },
      { x: 40, y: 60 },
    )

    expect(canvasRepository.savePastedElements).toHaveBeenCalledWith(
      expect.objectContaining({
        canvasId: 'canvas-1',
        promptCards: [
          expect.objectContaining({
            canvasId: 'canvas-1',
            position: { x: 40, y: 60 },
            title: 'Prompt 副本',
          }),
        ],
      }),
    )
    expect(result?.nodeIds).toHaveLength(1)
    expect(result?.promptCardIds).toHaveLength(1)
  })

  it('skips paste without canvas or clipboard', async () => {
    vi.clearAllMocks()

    await expect(
      pasteCanvasClipboard(undefined, undefined, { x: 1, y: 2 }),
    ).resolves.toBeUndefined()

    expect(canvasRepository.savePastedElements).not.toHaveBeenCalled()
  })
})
