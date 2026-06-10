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
    promptCards: {
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

  it('deletes prompt cards with related records', async () => {
    await workspaceRepository.deletePromptCardCascade('card')

    expect(db.promptCards.delete).toHaveBeenCalledWith('card')
    expect(db.canvasEdges.where).toHaveBeenCalledWith('sourceId')
    expect(db.canvasEdges.where).toHaveBeenCalledWith('targetId')
    expect(db.chatSessions.where).toHaveBeenCalledWith('promptCardId')
  })

  it('deletes prompt card messages when sessions exist', async () => {
    vi.mocked(db.chatSessions.where).mockReturnValueOnce(
      chain([{ id: 'session' }]) as never,
    )

    await workspaceRepository.deletePromptCardCascade('card')

    expect(db.chatMessages.where).toHaveBeenCalledWith('sessionId')
    expect(anyOfDeleteMock).toHaveBeenCalled()
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
      chatSessions: [],
      chatMessages: [],
      compareRuns: [],
    }

    await expect(workspaceRepository.exportWorkspace()).resolves.toMatchObject({
      version: 3,
      canvasShapeNodes: [],
      canvasEdges: [],
      canvasStrokes: [],
      canvasTextNodes: [],
    })
    await workspaceRepository.importWorkspace(payload)

    expect(db.canvases.clear).toHaveBeenCalled()
    expect(db.canvases.bulkPut).toHaveBeenCalledWith([])
    expect(db.canvasShapeNodes.bulkPut).toHaveBeenCalledWith([])
    expect(db.canvasEdges.bulkPut).toHaveBeenCalledWith([])
    expect(db.canvasStrokes.bulkPut).toHaveBeenCalledWith([])
    expect(db.canvasTextNodes.bulkPut).toHaveBeenCalledWith([])
  })

  it('rejects unsupported imports and lists canvases', async () => {
    await expect(
      workspaceRepository.importWorkspace({ version: 4 } as never),
    ).rejects.toThrow('Unsupported file')
    await expect(workspaceRepository.listCanvasesByUpdatedAt()).resolves.toEqual([
      { id: 'canvas' },
    ])
  })

  it('lists prompt cards and providers', async () => {
    await workspaceRepository.listPromptCardsByCanvas('canvas')
    await workspaceRepository.listProvidersByUpdatedAt()

    expect(db.promptCards.where).toHaveBeenCalledWith('canvasId')
    expect(db.providerConfigs.toArray).not.toHaveBeenCalled()
    expect(db.providerConfigs.bulkPut).not.toHaveBeenCalledWith(undefined)
  })
})
