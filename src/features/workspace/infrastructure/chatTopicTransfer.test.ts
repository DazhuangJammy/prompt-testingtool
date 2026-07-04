import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/shared/storage/db'
import { importChatTopic } from './chatTopicTransfer'

vi.mock('@/shared/storage/db', () => ({
  db: {
    canvases: {
      add: vi.fn(),
      update: vi.fn(),
    },
    canvasEdges: { bulkPut: vi.fn() },
    canvasShapeNodes: { bulkPut: vi.fn() },
    canvasImageNodes: { bulkPut: vi.fn() },
    canvasStrokes: { bulkPut: vi.fn() },
    canvasTextNodes: { bulkPut: vi.fn() },
    chatMessages: { bulkPut: vi.fn() },
    chatSessions: { bulkPut: vi.fn() },
    compareRuns: { bulkPut: vi.fn() },
    inputCards: { bulkPut: vi.fn() },
    promptCards: { bulkPut: vi.fn() },
    promptVersions: { bulkPut: vi.fn() },
    transaction: vi.fn(async (_mode, _tables, callback) => callback()),
  },
}))

describe('chat topic transfer', () => {
  beforeEach(() => vi.clearAllMocks())

  it('imports all canvas node types and compare runs with remapped ids', async () => {
    await importChatTopic(
      {
        kind: 'prompt-canvas-chat-topic',
        version: 1,
        exportedAt: 'old',
        chatSession: {
          id: 'session',
          canvasId: 'old-canvas',
          promptCardId: 'card',
          title: '',
          createdAt: 'old',
          updatedAt: 'old',
        },
        childChatSessions: [
          {
            id: 'child',
            canvasId: 'old-canvas',
            parentSessionId: 'session',
            promptCardId: 'card',
            title: 'child',
            createdAt: 'old',
            updatedAt: 'old',
          },
        ],
        chatMessages: [
          {
            id: 'message',
            sessionId: 'session',
            role: 'assistant',
            content: 'reply',
            status: 'streaming',
            createdAt: '',
          },
        ],
        promptCards: [
          {
            id: 'card',
            canvasId: 'old-canvas',
            title: 'Prompt',
            position: { x: 0, y: 0 },
            sections: {},
            createdAt: 'old',
            updatedAt: 'old',
          },
        ],
        inputCards: [
          {
            id: 'input',
            canvasId: 'old-canvas',
            title: 'Input',
            markdown: '# A\n\nbody',
            position: { x: 1, y: 2 },
            groupId: 'source-group',
            createdAt: 'old',
            updatedAt: 'old',
          },
        ],
        canvasShapeNodes: [
          {
            id: 'shape',
            canvasId: 'old-canvas',
            kind: 'step',
            title: 'Step',
            body: 'body',
            position: { x: 3, y: 4 },
            width: 100,
            height: 80,
            createdAt: 'old',
            updatedAt: 'old',
          },
        ],
        canvasImageNodes: [
          {
            id: 'image',
            canvasId: 'old-canvas',
            name: 'image.png',
            mimeType: 'image/png',
            dataUrl: 'data:image/png;base64,a',
            position: { x: 5, y: 6 },
            width: 100,
            height: 80,
            groupId: 'source-group',
            createdAt: 'old',
            updatedAt: 'old',
          },
        ],
        canvasStrokes: [
          {
            id: 'stroke',
            canvasId: 'old-canvas',
            points: [{ x: 7, y: 8 }],
            color: '#fff',
            strokeWidth: 2,
            createdAt: 'old',
            updatedAt: 'old',
          },
        ],
        canvasTextNodes: [
          {
            id: 'text',
            canvasId: 'old-canvas',
            text: 'text',
            position: { x: 9, y: 10 },
            width: 120,
            color: '#fff',
            fontSize: 16,
            backgroundColor: 'transparent',
            groupId: 'source-group',
            createdAt: 'old',
            updatedAt: 'old',
          },
        ],
        canvasEdges: [
          {
            id: 'edge',
            canvasId: 'old-canvas',
            sourceId: 'input',
            targetId: 'card',
            sourceHandle: 'right',
            targetHandle: 'left',
            createdAt: 'old',
            updatedAt: 'old',
          },
        ],
        promptVersions: [
          {
            id: 'version-old-date',
            promptCardId: 'card',
            compiledMarkdown: 'md',
            reason: 'chat-send',
            createdAt: '',
          },
          {
            id: 'version',
            promptCardId: 'card',
            compiledMarkdown: 'md',
            reason: 'manual',
            createdAt: 'old',
          },
        ],
        compareRuns: [
          {
            id: 'run',
            promptCardId: 'card',
            oldVersionId: 'version-old-date',
            newVersionId: 'version',
            input: 'input',
            oldOutput: 'old',
            newOutput: 'new',
            createdAt: '',
          },
        ],
      },
      'target-canvas',
    )

    const savedSession = vi.mocked(db.chatSessions.bulkPut).mock.calls[0]?.[0][0]
    const savedInputCard = vi.mocked(db.inputCards.bulkPut).mock.calls[0]?.[0][0]
    const savedImageNode = vi.mocked(db.canvasImageNodes.bulkPut).mock.calls[0]?.[0][0]
    const savedStroke = vi.mocked(db.canvasStrokes.bulkPut).mock.calls[0]?.[0][0]
    const savedTextNode = vi.mocked(db.canvasTextNodes.bulkPut).mock.calls[0]?.[0][0]
    const savedEdge = vi.mocked(db.canvasEdges.bulkPut).mock.calls[0]?.[0][0]
    const savedVersions = vi.mocked(db.promptVersions.bulkPut).mock.calls[0]?.[0]
    const savedRun = vi.mocked(db.compareRuns.bulkPut).mock.calls[0]?.[0][0]
    const savedMessage = vi.mocked(db.chatMessages.bulkPut).mock.calls[0]?.[0][0]

    expect(savedSession.title).toBe('导入话题')
    expect(savedInputCard).toEqual(
      expect.objectContaining({
        canvasId: 'target-canvas',
        id: expect.not.stringMatching(/^input$/),
        topicSessionId: savedSession.id,
      }),
    )
    expect(savedImageNode.topicSessionId).toBe(savedSession.id)
    expect(savedStroke.topicSessionId).toBe(savedSession.id)
    expect(savedTextNode.topicSessionId).toBe(savedSession.id)
    expect(savedInputCard.groupId).toEqual(expect.any(String))
    expect(savedInputCard.groupId).not.toBe('source-group')
    expect(savedImageNode.groupId).toBe(savedInputCard.groupId)
    expect(savedTextNode.groupId).toBe(savedInputCard.groupId)
    expect(savedEdge).toEqual(
      expect.objectContaining({
        sourceId: savedInputCard.id,
        topicSessionId: savedSession.id,
      }),
    )
    expect(savedVersions[0].createdAt).not.toBe('')
    expect(savedRun).toEqual(
      expect.objectContaining({
        promptCardId: savedSession.promptCardId,
        oldVersionId: savedVersions[0].id,
        newVersionId: savedVersions[1].id,
        createdAt: expect.any(String),
      }),
    )
    expect(savedMessage).toEqual(
      expect.objectContaining({
        status: 'complete',
        createdAt: expect.any(String),
      }),
    )
  })
})
