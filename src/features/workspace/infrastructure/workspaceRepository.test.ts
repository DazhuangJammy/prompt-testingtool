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
    defaultModelSettings: {
      clear: vi.fn(),
      get: vi.fn(() => undefined),
      put: vi.fn(),
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
    expect(db.chatSessions.where).not.toHaveBeenCalled()
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
      version: 6,
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
    expect(db.defaultModelSettings.put).not.toHaveBeenCalled()
  })

  it('imports default model settings when present', async () => {
    const payload: ExportPayload = {
      version: 6,
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

    expect(db.defaultModelSettings.put).toHaveBeenCalledWith(
      payload.defaultModelSettings,
    )
  })

  it('rejects unsupported imports and lists canvases', async () => {
    await expect(
      workspaceRepository.importWorkspace({ version: 7 } as never),
    ).rejects.toThrow('Unsupported file')
    await expect(workspaceRepository.listCanvasesByUpdatedAt()).resolves.toEqual([
      { id: 'canvas' },
    ])
  })

  it('exports one chat topic package with its canvas records', async () => {
    vi.mocked(db.chatSessions.get).mockResolvedValueOnce({
      id: 'session',
      canvasId: 'canvas',
      promptCardId: 'card',
      title: '话题',
      createdAt: 'now',
      updatedAt: 'now',
    })
    vi.mocked(db.canvases.get).mockResolvedValueOnce({
      id: 'canvas',
      title: '工作台',
      createdAt: 'now',
      updatedAt: 'now',
    })
    vi.mocked(db.promptCards.where).mockReturnValueOnce(
      chain([
        {
          id: 'card',
          canvasId: 'canvas',
          title: '卡片',
          position: { x: 0, y: 0 },
          sections: {},
          createdAt: 'now',
          updatedAt: 'now',
        },
      ]) as never,
    )
    vi.mocked(db.chatMessages.where).mockReturnValueOnce(
      chain([
        {
          id: 'message',
          sessionId: 'session',
          role: 'user',
          content: '你好',
          promptVersionId: 'version',
          createdAt: 'now',
        },
      ]) as never,
    )
    vi.mocked(db.promptVersions.where).mockReturnValueOnce(
      chain([{ id: 'version', promptCardId: 'card' }]) as never,
    )

    await expect(workspaceRepository.exportChatTopic('session')).resolves.toMatchObject({
      kind: 'prompt-canvas-chat-topic',
      chatSession: { id: 'session' },
      chatMessages: [{ id: 'message' }],
      promptVersions: [{ id: 'version' }],
    })
  })

  it('imports chat topic package into a selected canvas with remapped ids', async () => {
    await expect(
      workspaceRepository.importChatTopic(
        {
          kind: 'prompt-canvas-chat-topic',
          version: 1,
          exportedAt: 'now',
          chatSession: {
            id: 'session',
            canvasId: 'old-canvas',
            promptCardId: 'card',
            title: '导入话题',
            createdAt: 'old',
            updatedAt: 'old',
          },
          chatMessages: [
            {
              id: 'message',
              sessionId: 'session',
              role: 'user',
              content: '你好',
              promptVersionId: 'version',
              createdAt: 'old',
            },
          ],
          promptCards: [
            {
              id: 'card',
              canvasId: 'old-canvas',
              title: '卡片',
              position: { x: 0, y: 0 },
              sections: {},
              createdAt: 'old',
              updatedAt: 'old',
            },
          ],
          canvasShapeNodes: [],
          canvasEdges: [
            {
              id: 'edge',
              canvasId: 'old-canvas',
              sourceId: 'card',
              targetId: 'card',
              createdAt: 'old',
              updatedAt: 'old',
            },
          ],
          promptVersions: [
            {
              id: 'version',
              promptCardId: 'card',
              compiledMarkdown: 'md',
              reason: 'chat-send',
              createdAt: 'old',
            },
          ],
          compareRuns: [],
        },
        'target-canvas',
      ),
    ).resolves.toMatchObject({ canvasId: 'target-canvas' })

    expect(db.canvases.add).not.toHaveBeenCalled()
    expect(db.chatSessions.add).toHaveBeenCalledWith(
      expect.objectContaining({ canvasId: 'target-canvas', title: '导入话题' }),
    )
    expect(db.promptCards.bulkPut).toHaveBeenCalledWith([
      expect.objectContaining({ canvasId: 'target-canvas' }),
    ])
    expect(db.chatMessages.bulkPut).toHaveBeenCalledWith([
      expect.objectContaining({ sessionId: expect.any(String) }),
    ])
  })

  it('creates a canvas when importing a topic without target canvas', async () => {
    await expect(
      workspaceRepository.importChatTopic({
        kind: 'prompt-canvas-chat-topic',
        version: 1,
        exportedAt: 'now',
        sourceCanvas: {
          id: 'old-canvas',
          title: '原工作台',
          createdAt: 'old',
          updatedAt: 'old',
        },
        chatSession: {
          id: 'session',
          title: '导入话题',
          createdAt: 'old',
          updatedAt: 'old',
        },
        chatMessages: [],
        promptCards: [],
        promptVersions: [],
        compareRuns: [],
      }),
    ).resolves.toMatchObject({ canvasId: expect.any(String) })

    expect(db.canvases.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: '原工作台' }),
    )
  })

  it('rejects unsupported chat topic package', async () => {
    await expect(
      workspaceRepository.importChatTopic({ kind: 'other', version: 1 } as never),
    ).rejects.toThrow('Unsupported topic file')
  })

  it('throws when exporting a missing chat topic', async () => {
    vi.mocked(db.chatSessions.get).mockResolvedValueOnce(undefined)

    await expect(workspaceRepository.exportChatTopic('missing')).rejects.toThrow(
      '未找到要导出的话题',
    )
  })

  it('lists prompt cards and providers', async () => {
    await workspaceRepository.listPromptCardsByCanvas('canvas')
    await workspaceRepository.listProvidersByUpdatedAt()

    expect(db.promptCards.where).toHaveBeenCalledWith('canvasId')
    expect(db.providerConfigs.toArray).not.toHaveBeenCalled()
    expect(db.providerConfigs.bulkPut).not.toHaveBeenCalledWith(undefined)
  })
})
