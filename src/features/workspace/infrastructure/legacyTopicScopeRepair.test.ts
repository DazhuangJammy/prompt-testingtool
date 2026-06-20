import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/shared/storage/db'
import {
  repairAllLegacyTopicScopes,
  repairLegacyTopicScope,
  repairLegacyTopicScopeRecords,
} from './legacyTopicScopeRepair'

const chain = (result: unknown[]) => ({
  equals: vi.fn(() => ({
    toArray: vi.fn(() => result),
  })),
})

vi.mock('@/shared/storage/db', () => ({
  db: {
    canvasEdges: { update: vi.fn(), where: vi.fn() },
    canvasImageNodes: { update: vi.fn(), where: vi.fn() },
    canvasShapeNodes: { update: vi.fn(), where: vi.fn() },
    canvasStrokes: { update: vi.fn(), where: vi.fn() },
    canvasTextNodes: { update: vi.fn(), where: vi.fn() },
    chatSessions: { get: vi.fn(), toArray: vi.fn(() => []) },
    promptCards: { get: vi.fn(), update: vi.fn(), where: vi.fn() },
  },
}))

describe('legacy topic scope repair', () => {
  beforeEach(() => vi.clearAllMocks())

  it('tags one old duplicated canvas batch with the active topic session', async () => {
    vi.mocked(db.promptCards.get).mockResolvedValueOnce({
      id: 'copy-card',
      canvasId: 'canvas',
      title: '副本',
      position: { x: 0, y: 0 },
      sections: {},
      createdAt: 'copy-time',
      updatedAt: 'copy-time',
    })
    mockCanvasRecords({
      promptCards: [
        legacyCard('copy-card', 'copy-time'),
        legacyCard('copy-card-2', 'copy-time'),
        legacyCard('original-card', 'old-time'),
        legacyCard('scoped-card', 'copy-time', 'other-topic'),
      ],
      shapeNodes: [
        legacyShape('copy-shape', 'copy-time'),
        legacyShape('old-shape', 'old-time'),
        legacyShape('scoped-shape', 'copy-time', 'other-topic'),
      ],
      imageNodes: [legacyImage('copy-image', 'copy-time')],
      strokes: [legacyStroke('copy-stroke', 'copy-time')],
      textNodes: [legacyText('copy-text', 'copy-time')],
      edges: [
        legacyEdge('copy-edge', 'copy-card', 'copy-shape', 'copy-time'),
        legacyEdge('cross-edge', 'copy-card', 'old-shape', 'copy-time'),
        legacyEdge('old-edge', 'original-card', 'old-shape', 'old-time'),
      ],
    })

    await repairLegacyTopicScopeRecords({
      canvasId: 'canvas',
      promptCardId: 'copy-card',
      sessionId: 'copy-session',
    })

    expect(db.promptCards.update).toHaveBeenCalledWith('copy-card', {
      topicSessionId: 'copy-session',
    })
    expect(db.promptCards.update).toHaveBeenCalledWith('copy-card-2', {
      topicSessionId: 'copy-session',
    })
    expect(db.promptCards.update).not.toHaveBeenCalledWith(
      'original-card',
      expect.any(Object),
    )
    expect(db.canvasShapeNodes.update).toHaveBeenCalledWith('copy-shape', {
      topicSessionId: 'copy-session',
    })
    expect(db.canvasImageNodes.update).toHaveBeenCalledWith('copy-image', {
      topicSessionId: 'copy-session',
    })
    expect(db.canvasStrokes.update).toHaveBeenCalledWith('copy-stroke', {
      topicSessionId: 'copy-session',
    })
    expect(db.canvasTextNodes.update).toHaveBeenCalledWith('copy-text', {
      topicSessionId: 'copy-session',
    })
    expect(db.canvasEdges.update).toHaveBeenCalledWith('copy-edge', {
      topicSessionId: 'copy-session',
    })
    expect(db.canvasEdges.update).not.toHaveBeenCalledWith(
      'cross-edge',
      expect.any(Object),
    )
  })

  it('does not touch records when the prompt card is missing or already scoped', async () => {
    vi.mocked(db.promptCards.get).mockResolvedValueOnce(undefined)

    await repairLegacyTopicScopeRecords({
      canvasId: 'canvas',
      promptCardId: 'missing',
      sessionId: 'session',
    })

    expect(db.promptCards.where).not.toHaveBeenCalled()

    vi.clearAllMocks()
    vi.mocked(db.promptCards.get).mockResolvedValueOnce(
      legacyCard('card', 'now', 'session'),
    )
    mockCanvasRecords({
      promptCards: [legacyCard('card', 'now', 'session')],
      shapeNodes: [legacyShape('shape', 'now')],
      imageNodes: [],
      strokes: [],
      textNodes: [],
      edges: [legacyEdge('edge', 'card', 'shape', 'now')],
    })

    await repairLegacyTopicScopeRecords({
      canvasId: 'canvas',
      promptCardId: 'card',
      sessionId: 'session',
    })

    expect(db.promptCards.update).not.toHaveBeenCalledWith(
      'card',
      expect.any(Object),
    )
    expect(db.canvasShapeNodes.update).toHaveBeenCalledWith('shape', {
      topicSessionId: 'session',
    })
    expect(db.canvasEdges.update).toHaveBeenCalledWith('edge', {
      topicSessionId: 'session',
    })

    vi.clearAllMocks()
    vi.mocked(db.promptCards.get).mockResolvedValueOnce(
      legacyCard('card', 'now', 'other-session'),
    )

    await repairLegacyTopicScopeRecords({
      canvasId: 'canvas',
      promptCardId: 'card',
      sessionId: 'session',
    })

    expect(db.promptCards.where).not.toHaveBeenCalled()
  })

  it('repairs through the chat session lookup only when the session has a canvas and card', async () => {
    vi.mocked(db.chatSessions.get).mockResolvedValueOnce({
      id: 'session',
      canvasId: 'canvas',
      promptCardId: 'card',
      title: '话题',
      createdAt: 'now',
      updatedAt: 'now',
    })
    vi.mocked(db.promptCards.get).mockResolvedValueOnce(legacyCard('card', 'now'))
    mockCanvasRecords({
      promptCards: [legacyCard('card', 'now')],
      shapeNodes: [],
      imageNodes: [],
      strokes: [],
      textNodes: [],
      edges: [],
    })

    await repairLegacyTopicScope('session')

    expect(db.promptCards.update).toHaveBeenCalledWith('card', {
      topicSessionId: 'session',
    })

    vi.clearAllMocks()
    vi.mocked(db.chatSessions.get).mockResolvedValueOnce({
      id: 'session',
      title: '话题',
      createdAt: 'now',
      updatedAt: 'now',
    })

    await repairLegacyTopicScope('session')

    expect(db.promptCards.get).not.toHaveBeenCalled()
  })

  it('repairs all visible legacy topic scopes during app startup', async () => {
    vi.mocked(db.chatSessions.toArray).mockResolvedValueOnce([
      {
        id: 'session-a',
        canvasId: 'canvas',
        promptCardId: 'card-a',
        title: '话题 A',
        createdAt: 'now',
        updatedAt: 'now',
      },
      {
        id: 'hidden-child',
        canvasId: 'canvas',
        promptCardId: 'card-child',
        parentSessionId: 'session-a',
        hidden: true,
        title: '隐藏对比',
        createdAt: 'now',
        updatedAt: 'now',
      },
      {
        id: 'missing-card',
        canvasId: 'canvas',
        title: '无卡片话题',
        createdAt: 'now',
        updatedAt: 'now',
      },
    ])
    vi.mocked(db.promptCards.get).mockResolvedValueOnce(legacyCard('card-a', 'now'))
    mockCanvasRecords({
      promptCards: [legacyCard('card-a', 'now')],
      shapeNodes: [],
      imageNodes: [],
      strokes: [],
      textNodes: [],
      edges: [],
    })

    await repairAllLegacyTopicScopes()

    expect(db.promptCards.get).toHaveBeenCalledTimes(1)
    expect(db.promptCards.get).toHaveBeenCalledWith('card-a')
    expect(db.promptCards.update).toHaveBeenCalledWith('card-a', {
      topicSessionId: 'session-a',
    })
  })
})

function mockCanvasRecords({
  edges,
  imageNodes,
  promptCards,
  shapeNodes,
  strokes,
  textNodes,
}: {
  edges: unknown[]
  imageNodes: unknown[]
  promptCards: unknown[]
  shapeNodes: unknown[]
  strokes: unknown[]
  textNodes: unknown[]
}) {
  vi.mocked(db.promptCards.where).mockReturnValueOnce(chain(promptCards) as never)
  vi.mocked(db.canvasShapeNodes.where).mockReturnValueOnce(chain(shapeNodes) as never)
  vi.mocked(db.canvasImageNodes.where).mockReturnValueOnce(chain(imageNodes) as never)
  vi.mocked(db.canvasStrokes.where).mockReturnValueOnce(chain(strokes) as never)
  vi.mocked(db.canvasTextNodes.where).mockReturnValueOnce(chain(textNodes) as never)
  vi.mocked(db.canvasEdges.where).mockReturnValueOnce(chain(edges) as never)
}

function legacyCard(id: string, createdAt: string, topicSessionId?: string) {
  return {
    id,
    canvasId: 'canvas',
    topicSessionId,
    title: id,
    position: { x: 0, y: 0 },
    sections: {},
    createdAt,
    updatedAt: createdAt,
  }
}

function legacyShape(id: string, createdAt: string, topicSessionId?: string) {
  return {
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
  }
}

function legacyImage(id: string, createdAt: string) {
  return {
    id,
    canvasId: 'canvas',
    name: id,
    mimeType: 'image/png',
    dataUrl: 'data:image/png;base64,a',
    position: { x: 0, y: 0 },
    width: 100,
    height: 80,
    createdAt,
    updatedAt: createdAt,
  }
}

function legacyStroke(id: string, createdAt: string) {
  return {
    id,
    canvasId: 'canvas',
    points: [{ x: 0, y: 0 }],
    color: '#fff',
    strokeWidth: 2,
    createdAt,
    updatedAt: createdAt,
  }
}

function legacyText(id: string, createdAt: string) {
  return {
    id,
    canvasId: 'canvas',
    text: id,
    position: { x: 0, y: 0 },
    width: 100,
    color: '#fff',
    fontSize: 16,
    backgroundColor: 'transparent',
    createdAt,
    updatedAt: createdAt,
  }
}

function legacyEdge(
  id: string,
  sourceId: string,
  targetId: string,
  createdAt: string,
) {
  return {
    id,
    canvasId: 'canvas',
    sourceId,
    targetId,
    createdAt,
    updatedAt: createdAt,
  }
}
