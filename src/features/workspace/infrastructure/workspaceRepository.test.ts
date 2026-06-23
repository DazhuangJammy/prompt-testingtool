import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/shared/storage/db'
import { workspaceRepository } from './workspaceRepository'
import type { ExportPayload } from '@/shared/types'

const deleteMock = vi.fn()
const anyOfDeleteMock = vi.fn()
const chain = (result: unknown) => ({
  anyOf: vi.fn(() => ({ delete: anyOfDeleteMock, toArray: vi.fn(() => result) })),
  delete: deleteMock,
  equals: vi.fn(() => ({
    delete: deleteMock,
    sortBy: vi.fn(() => result),
    toArray: vi.fn(() => result),
  })),
  sortBy: vi.fn(() => result),
})

vi.mock('@/shared/storage/db', () => ({
  db: {
    canvases: {
      add: vi.fn(),
      bulkPut: vi.fn(),
      clear: vi.fn(),
      delete: vi.fn(),
      get: vi.fn(() => undefined),
      reverse: vi.fn(() => ({ sortBy: vi.fn(() => [{ id: 'canvas' }]) })),
      toArray: vi.fn(() => []),
      update: vi.fn(),
    },
    canvasEdges: {
      bulkPut: vi.fn(),
      clear: vi.fn(),
      toArray: vi.fn(() => []),
      where: vi.fn(() => chain([])),
    },
    canvasShapeNodes: {
      bulkPut: vi.fn(),
      clear: vi.fn(),
      toArray: vi.fn(() => []),
      where: vi.fn(() => chain([])),
    },
    canvasImageNodes: {
      bulkPut: vi.fn(),
      clear: vi.fn(),
      toArray: vi.fn(() => []),
      where: vi.fn(() => chain([])),
    },
    canvasStrokes: {
      bulkPut: vi.fn(),
      clear: vi.fn(),
      toArray: vi.fn(() => []),
      where: vi.fn(() => chain([])),
    },
    canvasTextNodes: {
      bulkPut: vi.fn(),
      clear: vi.fn(),
      toArray: vi.fn(() => []),
      where: vi.fn(() => chain([])),
    },
    chatMessages: {
      bulkPut: vi.fn(),
      clear: vi.fn(),
      toArray: vi.fn(() => []),
      where: vi.fn(() => chain([])),
    },
    chatSessions: {
      add: vi.fn(),
      bulkPut: vi.fn(),
      clear: vi.fn(),
      get: vi.fn(() => undefined),
      toArray: vi.fn(() => []),
      where: vi.fn(() => chain([])),
    },
    chatKnowledgeSelections: {
      bulkPut: vi.fn(),
      clear: vi.fn(),
      toArray: vi.fn(() => []),
      where: vi.fn(() => chain([])),
    },
    compareRuns: {
      bulkPut: vi.fn(),
      clear: vi.fn(),
      toArray: vi.fn(() => []),
      where: vi.fn(() => chain([])),
    },
    knowledgeBases: {
      bulkPut: vi.fn(),
      clear: vi.fn(),
      toArray: vi.fn(() => []),
      where: vi.fn(() => chain([])),
    },
    knowledgeItems: {
      bulkPut: vi.fn(),
      clear: vi.fn(),
      toArray: vi.fn(() => []),
      where: vi.fn(() => chain([])),
    },
    knowledgeChunks: {
      bulkPut: vi.fn(),
      clear: vi.fn(),
      toArray: vi.fn(() => []),
      where: vi.fn(() => chain([])),
    },
    promptCards: {
      add: vi.fn(),
      bulkPut: vi.fn(),
      clear: vi.fn(),
      delete: vi.fn(),
      toArray: vi.fn(() => []),
      where: vi.fn(() => chain([])),
    },
    inputCards: {
      add: vi.fn(),
      bulkPut: vi.fn(),
      clear: vi.fn(),
      delete: vi.fn(),
      toArray: vi.fn(() => []),
      where: vi.fn(() => chain([])),
    },
    promptVersions: {
      bulkPut: vi.fn(),
      clear: vi.fn(),
      toArray: vi.fn(() => []),
      where: vi.fn(() => chain([])),
    },
    providerConfigs: {
      bulkPut: vi.fn(),
      clear: vi.fn(),
      reverse: vi.fn(() => ({ sortBy: vi.fn(() => [{ id: 'provider' }]) })),
      toArray: vi.fn(() => []),
    },
    defaultModelSettings: {
      bulkPut: vi.fn(),
      clear: vi.fn(),
      get: vi.fn(() => undefined),
      put: vi.fn(),
      toArray: vi.fn(() => []),
    },
    transaction: vi.fn(async (_mode, _tables, callback) => callback()),
  },
}))

describe('workspace repository', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates and updates canvases', async () => {
    const canvas = await workspaceRepository.createCanvas(' Name ')
    await workspaceRepository.updateCanvas('canvas', { title: 'Next' })
    await workspaceRepository.touchCanvas('canvas')

    expect(canvas.title).toBe('Name')
    expect(db.canvases.add).toHaveBeenCalledWith(canvas)
    expect(db.canvases.update).toHaveBeenCalledTimes(2)
  })

  it('creates prompt cards and touches canvas', async () => {
    const card = await workspaceRepository.createPromptCard('canvas', 0)

    expect(card.canvasId).toBe('canvas')
    expect(db.promptCards.add).toHaveBeenCalledWith(card)
    expect(db.canvases.update).toHaveBeenCalledWith('canvas', expect.any(Object))
  })

  it('saves copied prompt cards and touches canvas', async () => {
    await workspaceRepository.savePromptCardCopy({
      id: 'copy',
      canvasId: 'canvas',
      title: 'Copy',
      position: { x: 1, y: 2 },
      sections: {},
      createdAt: 'now',
      updatedAt: 'now',
    })

    expect(db.promptCards.add).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'copy' }),
    )
    expect(db.canvases.update).toHaveBeenCalledWith('canvas', expect.any(Object))
  })

  it('deletes only the prompt card node record', async () => {
    vi.clearAllMocks()

    await workspaceRepository.deletePromptCardNode('card', 'canvas')

    expect(db.promptCards.delete).toHaveBeenCalledWith('card')
    expect(db.canvasEdges.where).not.toHaveBeenCalled()
    expect(db.promptVersions.where).not.toHaveBeenCalled()
    expect(db.compareRuns.where).not.toHaveBeenCalled()
    expect(db.chatSessions.where).not.toHaveBeenCalled()
    expect(db.canvases.update).toHaveBeenCalledWith('canvas', expect.any(Object))
  })

  it('deletes canvases in a transaction', async () => {
    await workspaceRepository.deleteCanvasCascade('canvas')

    expect(db.transaction).toHaveBeenCalled()
    expect(db.canvases.delete).toHaveBeenCalledWith('canvas')
  })

  it('deletes related canvas records when cards and sessions exist', async () => {
    vi.mocked(db.promptCards.where).mockReturnValueOnce(
      chain([{ id: 'card' }]) as never,
    )
    vi.mocked(db.chatSessions.where).mockReturnValueOnce(
      chain([{ id: 'session' }]) as never,
    )

    await workspaceRepository.deleteCanvasCascade('canvas')

    expect(db.promptVersions.where).toHaveBeenCalledWith('promptCardId')
    expect(db.chatSessions.where).toHaveBeenCalledWith('canvasId')
    expect(db.chatMessages.where).toHaveBeenCalledWith('sessionId')
    expect(anyOfDeleteMock).toHaveBeenCalled()
  })

  it('exports and imports workspaces', async () => {
    const payload: ExportPayload = {
      version: 1,
      exportedAt: 'now',
      canvases: [],
      promptCards: [],
      promptVersions: [],
      providerConfigs: [],
      defaultModelSettings: undefined,
      chatSessions: [],
      chatMessages: [],
      compareRuns: [],
    }

    await expect(workspaceRepository.exportWorkspace()).resolves.toMatchObject({
      version: 10,
      inputCards: [],
      canvasShapeNodes: [],
      canvasImageNodes: [],
      canvasEdges: [],
      canvasStrokes: [],
      canvasTextNodes: [],
    })
    await workspaceRepository.importWorkspace(payload)

    expect(db.canvases.clear).toHaveBeenCalled()
    expect(db.canvases.bulkPut).toHaveBeenCalledWith([])
    expect(db.canvasShapeNodes.bulkPut).toHaveBeenCalledWith([])
    expect(db.canvasImageNodes.bulkPut).toHaveBeenCalledWith([])
    expect(db.canvasEdges.bulkPut).toHaveBeenCalledWith([])
    expect(db.canvasStrokes.bulkPut).toHaveBeenCalledWith([])
    expect(db.canvasTextNodes.bulkPut).toHaveBeenCalledWith([])
    expect(db.defaultModelSettings.clear).toHaveBeenCalled()
    expect(db.defaultModelSettings.bulkPut).toHaveBeenCalledWith([])
    expect(db.knowledgeBases.bulkPut).toHaveBeenCalledWith([])
    expect(db.chatKnowledgeSelections.bulkPut).toHaveBeenCalledWith([])
  })

  it('imports default model settings when present', async () => {
    const payload: ExportPayload = {
      version: 8,
      exportedAt: 'now',
      canvases: [],
      promptCards: [],
      promptVersions: [],
      providerConfigs: [],
      defaultModelSettings: {
        id: 'default-model',
        providerId: 'provider',
        modelId: 'model',
        assistantName: '默认助手',
        prompt: 'prompt',
        createdAt: 'now',
        updatedAt: 'now',
      },
      chatSessions: [],
      chatMessages: [],
      compareRuns: [],
    }

    await workspaceRepository.importWorkspace(payload)

    expect(db.defaultModelSettings.bulkPut).toHaveBeenCalledWith([
      payload.defaultModelSettings,
    ])
  })

  it('imports default model settings lists when present', async () => {
    const payload: ExportPayload = {
      version: 8,
      exportedAt: 'now',
      canvases: [],
      promptCards: [],
      promptVersions: [],
      providerConfigs: [],
      defaultModelSettings: undefined,
      defaultModelSettingsList: [
        {
          id: 'default-model',
          assistantName: '默认助手',
          prompt: 'prompt',
          createdAt: 'now',
          updatedAt: 'now',
        },
        {
          id: 'flowchart-model',
          assistantName: '流程图助手',
          prompt: 'flow',
          createdAt: 'now',
          updatedAt: 'now',
        },
      ],
      chatSessions: [],
      chatMessages: [],
      compareRuns: [],
    }

    await workspaceRepository.importWorkspace(payload)

    expect(db.defaultModelSettings.bulkPut).toHaveBeenCalledWith(
      payload.defaultModelSettingsList,
    )
  })

  it('rejects unsupported imports and lists canvases', async () => {
    vi.mocked(db.canvases.toArray).mockResolvedValueOnce([
      {
        id: 'newer',
        title: 'Newer',
        createdAt: '2026-01-02T00:00:00.000Z',
        updatedAt: '2026-01-10T00:00:00.000Z',
      },
      {
        id: 'older',
        title: 'Older',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-20T00:00:00.000Z',
      },
    ])

    await expect(
      workspaceRepository.importWorkspace({ version: 11 } as never),
    ).rejects.toThrow('Unsupported file')
    await expect(workspaceRepository.listCanvasesByUpdatedAt()).resolves.toEqual([
      expect.objectContaining({ id: 'older' }),
      expect.objectContaining({ id: 'newer' }),
    ])
  })

  it('updates canvas sort orders during manual reorder', async () => {
    await workspaceRepository.updateCanvasSortOrders([
      { id: 'two', sortOrder: 1 },
      { id: 'one', sortOrder: 2 },
    ])

    expect(db.transaction).toHaveBeenCalled()
    expect(db.canvases.update).toHaveBeenCalledWith(
      'two',
      expect.objectContaining({ sortOrder: 1 }),
    )
    expect(db.canvases.update).toHaveBeenCalledWith(
      'one',
      expect.objectContaining({ sortOrder: 2 }),
    )
  })

  it('lists prompt cards and providers', async () => {
    await workspaceRepository.listPromptCards()
    await workspaceRepository.listPromptCardsByCanvas('canvas')
    await workspaceRepository.listInputCardsByCanvas('canvas')
    await workspaceRepository.listProvidersByUpdatedAt()

    expect(db.promptCards.toArray).toHaveBeenCalled()
    expect(db.promptCards.where).toHaveBeenCalledWith('canvasId')
    expect(db.inputCards.where).toHaveBeenCalledWith('canvasId')
    expect(db.providerConfigs.toArray).not.toHaveBeenCalled()
    expect(db.providerConfigs.bulkPut).not.toHaveBeenCalledWith(undefined)
  })
})
