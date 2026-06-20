import { beforeEach, describe, expect, it, vi } from 'vitest'
import { workspaceRepository } from '@/features/workspace/infrastructure/workspaceRepository'
import {
  addPromptCardToCanvas,
  createChatTopicExport,
  createNextCanvas,
  createWorkspaceExport,
  deleteCanvasAndPickNext,
  duplicateChatTopic,
  importChatTopicFile,
  importWorkspaceFile,
  reorderCanvases,
} from './workspaceService'
import type { Canvas, ChatSession, ExportPayload } from '@/shared/types'

vi.mock('@/features/workspace/infrastructure/workspaceRepository', () => ({
  workspaceRepository: {
    createCanvas: vi.fn(),
    createPromptCard: vi.fn(),
    deleteCanvasCascade: vi.fn(),
    exportChatTopic: vi.fn(),
    exportWorkspace: vi.fn(),
    importChatTopic: vi.fn(),
    importWorkspace: vi.fn(),
    listCanvasesByUpdatedAt: vi.fn(),
    updateCanvasSortOrders: vi.fn(),
  },
}))

const canvases: Canvas[] = [
  { id: 'a', title: 'A', createdAt: '1', updatedAt: '1' },
  { id: 'b', title: 'B', createdAt: '2', updatedAt: '2' },
]

describe('workspace service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates the next canvas with a sequential title', async () => {
    vi.mocked(workspaceRepository.createCanvas).mockResolvedValue(canvases[0])

    await createNextCanvas(canvases)

    expect(workspaceRepository.createCanvas).toHaveBeenCalledWith('画布 3')
  })

  it('does not create prompt card without a canvas id', async () => {
    await expect(addPromptCardToCanvas(undefined, [])).resolves.toBeUndefined()
    expect(workspaceRepository.createPromptCard).not.toHaveBeenCalled()
  })

  it('creates prompt card with canvas id', async () => {
    vi.mocked(workspaceRepository.createPromptCard).mockResolvedValue({
      id: 'card',
      canvasId: 'a',
      title: 'T',
      position: { x: 0, y: 0 },
      sections: {},
      createdAt: '1',
      updatedAt: '1',
    })

    await expect(addPromptCardToCanvas('a', [])).resolves.toMatchObject({
      id: 'card',
    })
    expect(workspaceRepository.createPromptCard).toHaveBeenCalledWith(
      'a',
      0,
      undefined,
      undefined,
    )
  })

  it('creates prompt card at a requested canvas position', async () => {
    await addPromptCardToCanvas('a', [], { x: 24, y: 36 })

    expect(workspaceRepository.createPromptCard).toHaveBeenCalledWith(
      'a',
      0,
      {
        x: 24,
        y: 36,
      },
      undefined,
    )
  })

  it('creates prompt card for a topic scope', async () => {
    await addPromptCardToCanvas('a', [], undefined, 'session')

    expect(workspaceRepository.createPromptCard).toHaveBeenCalledWith(
      'a',
      0,
      undefined,
      'session',
    )
  })

  it('numbers prompt cards by the current topic scope', async () => {
    await addPromptCardToCanvas(
      'a',
      [
        {
          id: 'current-topic-card',
          canvasId: 'a',
          topicSessionId: 'session',
          title: '当前话题',
          position: { x: 0, y: 0 },
          sections: {},
          createdAt: '1',
          updatedAt: '1',
        },
        {
          id: 'other-topic-card',
          canvasId: 'a',
          topicSessionId: 'other-session',
          title: '其他话题',
          position: { x: 0, y: 0 },
          sections: {},
          createdAt: '1',
          updatedAt: '1',
        },
      ],
      undefined,
      'session',
    )

    expect(workspaceRepository.createPromptCard).toHaveBeenCalledWith(
      'a',
      1,
      undefined,
      'session',
    )
  })

  it('deletes canvas and returns the next active id', async () => {
    await expect(deleteCanvasAndPickNext('a', canvases)).resolves.toBe('b')
    expect(workspaceRepository.deleteCanvasCascade).toHaveBeenCalledWith('a')
  })

  it('reorders canvases only when dragged to another canvas', async () => {
    await reorderCanvases(canvases, 'b', 'a')

    expect(workspaceRepository.updateCanvasSortOrders).toHaveBeenCalledWith([
      { id: 'b', sortOrder: 1 },
      { id: 'a', sortOrder: 2 },
    ])

    vi.clearAllMocks()
    await reorderCanvases(canvases, 'a', 'a')
    expect(workspaceRepository.updateCanvasSortOrders).not.toHaveBeenCalled()
  })

  it('returns undefined after deleting the last canvas', async () => {
    await expect(deleteCanvasAndPickNext('a', [canvases[0]])).resolves.toBeUndefined()
  })

  it('imports workspace file and returns newest canvas id', async () => {
    const payload = { version: 1, canvases: [] } as unknown as ExportPayload
    const file = new File([JSON.stringify(payload)], 'data.json')
    vi.mocked(workspaceRepository.listCanvasesByUpdatedAt).mockResolvedValue([
      canvases[1],
    ])

    await expect(importWorkspaceFile(file)).resolves.toBe('b')
    expect(workspaceRepository.importWorkspace).toHaveBeenCalledWith(payload)
  })

  it('creates export file payload', async () => {
    vi.mocked(workspaceRepository.exportWorkspace).mockResolvedValue({
      version: 2,
      exportedAt: 'now',
      canvases,
      promptCards: [],
      promptVersions: [],
      providerConfigs: [],
      chatSessions: [],
      chatMessages: [],
      compareRuns: [],
    })

    const result = await createWorkspaceExport()

    expect(result.filename).toMatch(/^prompt-canvas-\d{4}-\d{2}-\d{2}.json$/)
    expect(JSON.parse(result.text).canvases).toHaveLength(2)
  })

  it('creates chat topic export file payload', async () => {
    vi.mocked(workspaceRepository.exportChatTopic).mockResolvedValue({
      kind: 'prompt-canvas-chat-topic',
      version: 1,
      exportedAt: 'now',
      chatSession: {
        id: 'session',
        title: 'SOP 流程梳理',
        createdAt: 'now',
        updatedAt: 'now',
      },
      chatMessages: [],
      promptCards: [],
      promptVersions: [],
      compareRuns: [],
    })

    const result = await createChatTopicExport('session')

    expect(result.filename).toMatch(/^prompt-topic-SOP-流程梳理-\d{4}-\d{2}-\d{2}.json$/)
    expect(JSON.parse(result.text).kind).toBe('prompt-canvas-chat-topic')
  })

  it('duplicates a chat topic with a copy title and adjacent sort order', async () => {
    const source: ChatSession = {
      id: 'source',
      canvasId: 'canvas',
      title: '测试',
      sortOrder: 10,
      createdAt: 'old',
      updatedAt: 'old',
    }
    vi.mocked(workspaceRepository.exportChatTopic).mockResolvedValue({
      kind: 'prompt-canvas-chat-topic',
      version: 1,
      exportedAt: 'now',
      chatSession: source,
      chatMessages: [
        {
          id: 'message',
          sessionId: 'source',
          role: 'assistant',
          content: '回复',
          createdAt: 'old',
        },
      ],
      promptCards: [],
      promptVersions: [],
      compareRuns: [],
    })
    vi.mocked(workspaceRepository.importChatTopic).mockResolvedValue({
      canvasId: 'canvas',
      sessionId: '00000000-0000-4000-8000-000000000002',
      promptCardId: 'copied-card',
    })

    const result = await duplicateChatTopic(source, [
      source,
      {
        id: 'next',
        canvasId: 'canvas',
        title: '测试 副本',
        sortOrder: 20,
        createdAt: 'old',
        updatedAt: 'old',
      },
    ])

    expect(result.id).toBe('00000000-0000-4000-8000-000000000002')
    expect(result.title).toBe('测试 副本 2')
    expect(result.sortOrder).toBe(15)
    expect(result.promptCardId).toBe('copied-card')
    expect(workspaceRepository.importChatTopic).toHaveBeenCalledWith(
      expect.objectContaining({
        chatSession: expect.objectContaining({
          title: '测试 副本 2',
          sortOrder: 15,
        }),
      }),
      'canvas',
    )
  })

  it('imports chat topic file into target canvas', async () => {
    vi.mocked(workspaceRepository.importChatTopic).mockResolvedValue({
      canvasId: 'canvas',
      sessionId: '00000000-0000-4000-8000-000000000001',
      promptCardId: undefined,
    })
    const file = new File(
      [
        JSON.stringify({
          kind: 'prompt-canvas-chat-topic',
          version: 1,
          chatSession: { id: 'session', title: 'T' },
        }),
      ],
      'topic.json',
    )

    await expect(importChatTopicFile(file, 'canvas')).resolves.toEqual({
      canvasId: 'canvas',
      sessionId: '00000000-0000-4000-8000-000000000001',
    })
    expect(workspaceRepository.importChatTopic).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'prompt-canvas-chat-topic' }),
      'canvas',
    )
  })
})
