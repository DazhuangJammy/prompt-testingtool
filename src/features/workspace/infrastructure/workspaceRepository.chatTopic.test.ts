import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/shared/storage/db'
import { workspaceRepository } from './workspaceRepository'

const chain = (result: unknown) => ({
  anyOf: vi.fn(() => ({ toArray: vi.fn(() => result) })),
  equals: vi.fn(() => ({
    sortBy: vi.fn(() => result),
    toArray: vi.fn(() => result),
  })),
  sortBy: vi.fn(() => result),
})

vi.mock('@/shared/storage/db', () => ({
  db: {
    canvases: {
      add: vi.fn(),
      get: vi.fn(() => undefined),
      update: vi.fn(),
    },
    canvasEdges: {
      bulkPut: vi.fn(),
      where: vi.fn(() => chain([])),
    },
    canvasShapeNodes: {
      bulkPut: vi.fn(),
      where: vi.fn(() => chain([])),
    },
    canvasImageNodes: {
      bulkPut: vi.fn(),
      where: vi.fn(() => chain([])),
    },
    canvasStrokes: {
      bulkPut: vi.fn(),
      where: vi.fn(() => chain([])),
    },
    canvasTextNodes: {
      bulkPut: vi.fn(),
      where: vi.fn(() => chain([])),
    },
    chatMessages: {
      bulkPut: vi.fn(),
      where: vi.fn(() => chain([])),
    },
    chatSessions: {
      add: vi.fn(),
      bulkPut: vi.fn(),
      get: vi.fn(() => undefined),
      where: vi.fn(() => chain([])),
    },
    compareRuns: {
      bulkPut: vi.fn(),
      where: vi.fn(() => chain([])),
    },
    promptCards: {
      bulkPut: vi.fn(),
      where: vi.fn(() => chain([])),
    },
    promptVersions: {
      bulkPut: vi.fn(),
      where: vi.fn(() => chain([])),
    },
    transaction: vi.fn(async (_mode, _tables, callback) => callback()),
  },
}))

describe('workspace repository chat topic transfer', () => {
  beforeEach(() => vi.clearAllMocks())

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
          topicSessionId: 'session',
          title: '卡片',
          position: { x: 0, y: 0 },
          sections: {},
          createdAt: 'now',
          updatedAt: 'now',
        },
        {
          id: 'other-card',
          canvasId: 'canvas',
          topicSessionId: 'other-session',
          title: '其他卡片',
          position: { x: 0, y: 0 },
          sections: {},
          createdAt: 'now',
          updatedAt: 'now',
        },
      ]) as never,
    )
    vi.mocked(db.chatSessions.where).mockReturnValueOnce(
      chain([
        {
          id: 'child-session',
          canvasId: 'canvas',
          comparePaneIndex: 0,
          parentSessionId: 'session',
          promptCardId: 'card',
          hidden: true,
          title: '隐藏对比',
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
    vi.mocked(db.chatMessages.where).mockReturnValueOnce(
      chain([
        {
          id: 'child-message',
          sessionId: 'child-session',
          role: 'assistant',
          content: '对比回复',
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
      childChatSessions: [{ id: 'child-session' }],
      chatMessages: [{ id: 'message' }, { id: 'child-message' }],
      promptCards: [{ id: 'card' }],
      promptVersions: [{ id: 'version' }],
    })
  })

  it('exports only the latest hidden child session per compare pane index', async () => {
    vi.mocked(db.chatSessions.get).mockResolvedValueOnce({
      id: 'session',
      canvasId: 'canvas',
      promptCardId: 'card',
      title: '话题',
      createdAt: 'now',
      updatedAt: 'now',
    })
    vi.mocked(db.promptCards.where).mockReturnValueOnce(
      chain([
        {
          id: 'card',
          canvasId: 'canvas',
          topicSessionId: 'session',
          title: '卡片',
          position: { x: 0, y: 0 },
          sections: {},
          createdAt: 'now',
          updatedAt: 'now',
        },
      ]) as never,
    )
    vi.mocked(db.chatSessions.where).mockReturnValueOnce(
      chain([
        {
          id: 'old-child',
          canvasId: 'canvas',
          comparePaneIndex: 0,
          hidden: true,
          parentSessionId: 'session',
          promptCardId: 'card',
          title: '旧对比',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'new-child',
          canvasId: 'canvas',
          comparePaneIndex: 0,
          hidden: true,
          parentSessionId: 'session',
          promptCardId: 'card',
          title: '新对比',
          createdAt: '2026-01-02T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
      ]) as never,
    )
    const childMessageQuery = chain([
      {
        id: 'new-child-message',
        sessionId: 'new-child',
        role: 'assistant',
        content: '当前对比回复',
        createdAt: 'now',
      },
    ])
    vi.mocked(db.chatMessages.where).mockReturnValueOnce(chain([]) as never)
    vi.mocked(db.chatMessages.where).mockReturnValueOnce(childMessageQuery as never)

    const payload = await workspaceRepository.exportChatTopic('session')

    expect(payload.childChatSessions?.map((session) => session.id)).toEqual([
      'new-child',
    ])
    expect(payload.chatMessages.map((message) => message.id)).toEqual([
      'new-child-message',
    ])
    expect(childMessageQuery.anyOf).toHaveBeenCalledWith(['new-child'])
  })

  it('imports chat topic package into a selected canvas with remapped ids', async () => {
    const result = await workspaceRepository.importChatTopic(
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
            attachments: [
              {
                id: 'attachment',
                name: '图.png',
                mimeType: 'image/png',
                size: 12,
                kind: 'image',
                dataUrl: 'data:image/png;base64,a',
              },
            ],
            createdAt: 'old',
          },
          {
            id: 'child-message',
            sessionId: 'child-session',
            role: 'assistant',
            content: '对比回复',
            promptVersionId: 'version',
            createdAt: 'old',
          },
        ],
        childChatSessions: [
          {
            id: 'child-session',
            canvasId: 'old-canvas',
            comparePaneIndex: 1,
            parentSessionId: 'session',
            hidden: true,
            promptCardId: 'card',
            title: '隐藏对比',
            createdAt: 'old',
            updatedAt: 'old',
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
        canvasShapeNodes: [
          {
            id: 'shape',
            canvasId: 'old-canvas',
            kind: 'step',
            title: '步骤',
            body: '内容',
            position: { x: 10, y: 20 },
            width: 100,
            height: 80,
            createdAt: 'old',
            updatedAt: 'old',
          },
        ],
        canvasEdges: [
          {
            id: 'edge',
            canvasId: 'old-canvas',
            sourceId: 'card',
            targetId: 'shape',
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
    )

    expect(result).toMatchObject({
      canvasId: 'target-canvas',
      promptCardId: expect.any(String),
    })

    expect(db.canvases.add).not.toHaveBeenCalled()
    const savedSessions = vi.mocked(db.chatSessions.bulkPut).mock.calls[0]?.[0]
    const savedSession = savedSessions?.find((session) => !session.hidden)
    const savedChildSession = savedSessions?.find((session) => session.hidden)
    const savedCards = vi.mocked(db.promptCards.bulkPut).mock.calls[0]?.[0]
    const savedEdges = vi.mocked(db.canvasEdges.bulkPut).mock.calls[0]?.[0]
    const savedShapes = vi.mocked(db.canvasShapeNodes.bulkPut).mock.calls[0]?.[0]
    const savedVersions = vi.mocked(db.promptVersions.bulkPut).mock.calls[0]?.[0]
    const savedMessages = vi.mocked(db.chatMessages.bulkPut).mock.calls[0]?.[0]

    expect(savedSession).toEqual(
      expect.objectContaining({
        id: expect.not.stringMatching(/^session$/),
        canvasId: 'target-canvas',
        promptCardId: expect.not.stringMatching(/^card$/),
        title: '导入话题',
      }),
    )
    expect(savedChildSession).toEqual(
      expect.objectContaining({
        id: expect.not.stringMatching(/^child-session$/),
        comparePaneIndex: 1,
        hidden: true,
        parentSessionId: savedSession?.id,
        promptCardId: savedSession?.promptCardId,
      }),
    )
    expect(savedCards).toEqual([
      expect.objectContaining({
        id: savedSession?.promptCardId,
        canvasId: 'target-canvas',
        topicSessionId: savedSession?.id,
      }),
    ])
    expect(result.promptCardIdMap).toEqual({ card: savedSession?.promptCardId })
    expect(savedEdges).toEqual([
      expect.objectContaining({
        id: expect.not.stringMatching(/^edge$/),
        topicSessionId: savedSession?.id,
        sourceId: savedSession?.promptCardId,
        targetId: savedShapes?.[0].id,
      }),
    ])
    expect(savedShapes).toEqual([
      expect.objectContaining({
        id: expect.not.stringMatching(/^shape$/),
        topicSessionId: savedSession?.id,
      }),
    ])
    expect(savedVersions).toEqual([
      expect.objectContaining({
        id: expect.not.stringMatching(/^version$/),
        promptCardId: savedSession?.promptCardId,
      }),
    ])
    expect(savedMessages).toEqual([
      expect.objectContaining({
        id: expect.not.stringMatching(/^message$/),
        attachments: [
          expect.objectContaining({
            id: expect.not.stringMatching(/^attachment$/),
            name: '图.png',
          }),
        ],
        promptVersionId: savedVersions[0].id,
        sessionId: savedSession?.id,
      }),
      expect.objectContaining({
        id: expect.not.stringMatching(/^child-message$/),
        promptVersionId: savedVersions[0].id,
        sessionId: savedChildSession?.id,
      }),
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
})
