import { describe, expect, it, vi } from 'vitest'
import type { ChatTopicExportPayload } from '@/shared/types'
import {
  createTopicImportIdMap,
  mapOptionalId,
  mapRequiredId,
  uniqueById,
} from './topicIdMap'

const payload: ChatTopicExportPayload = {
  kind: 'prompt-canvas-chat-topic',
  version: 1,
  exportedAt: 'now',
  chatSession: {
    id: 'session',
    title: '话题',
    createdAt: 'old',
    updatedAt: 'old',
  },
  childChatSessions: [
    {
      id: 'child-session',
      parentSessionId: 'session',
      hidden: true,
      title: '隐藏对比',
      createdAt: 'old',
      updatedAt: 'old',
    },
  ],
  chatMessages: [
    {
      id: 'message',
      sessionId: 'session',
      role: 'assistant',
      content: '回复',
      promptVersionId: 'version',
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
  promptCards: [
    {
      id: 'card',
      canvasId: 'canvas',
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
      canvasId: 'canvas',
      kind: 'step',
      title: '步骤',
      body: '',
      position: { x: 0, y: 0 },
      width: 120,
      height: 80,
      createdAt: 'old',
      updatedAt: 'old',
    },
  ],
  canvasImageNodes: [
    {
      id: 'image',
      canvasId: 'canvas',
      name: '图',
      mimeType: 'image/png',
      dataUrl: 'data:image/png;base64,a',
      position: { x: 0, y: 0 },
      width: 100,
      height: 100,
      createdAt: 'old',
      updatedAt: 'old',
    },
  ],
  canvasStrokes: [
    {
      id: 'stroke',
      canvasId: 'canvas',
      points: [{ x: 0, y: 0 }],
      color: '#fff',
      strokeWidth: 2,
      createdAt: 'old',
      updatedAt: 'old',
    },
  ],
  canvasTextNodes: [
    {
      id: 'text',
      canvasId: 'canvas',
      text: '文本',
      position: { x: 0, y: 0 },
      width: 120,
      color: '#fff',
      fontSize: 16,
      backgroundColor: 'transparent',
      createdAt: 'old',
      updatedAt: 'old',
    },
  ],
  canvasEdges: [
    {
      id: 'edge',
      canvasId: 'canvas',
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
    {
      id: 'unused',
      promptCardId: 'card',
      compiledMarkdown: 'unused',
      reason: 'manual',
      createdAt: 'old',
    },
  ],
  compareRuns: [
    {
      id: 'compare',
      promptCardId: 'card',
      oldVersionId: 'version',
      newVersionId: 'unused',
      input: 'in',
      oldOutput: 'old',
      newOutput: 'new',
      createdAt: 'old',
    },
  ],
}

describe('topic id map', () => {
  it('creates import ids for every topic-owned record', () => {
    const idMap = createTopicImportIdMap(payload)

    expect(idMap.promptCards.get('card')).toBeTruthy()
    expect(idMap.nodes.get('card')).toBe(idMap.promptCards.get('card'))
    expect(idMap.nodes.get('shape')).toBeTruthy()
    expect(idMap.nodes.get('image')).toBeTruthy()
    expect(idMap.nodes.get('stroke')).toBeTruthy()
    expect(idMap.nodes.get('text')).toBeTruthy()
    expect(idMap.edges.get('edge')).toBeTruthy()
    expect(idMap.sessions.get('session')).toBeTruthy()
    expect(idMap.sessions.get('child-session')).toBeTruthy()
    expect(idMap.messages.get('message')).toBeTruthy()
    expect(idMap.messages.get('child-message')).toBeTruthy()
    expect(idMap.compareRuns.get('compare')).toBeTruthy()
  })

  it('maps optional and required ids with safe fallbacks', () => {
    const ids = new Map([['a', 'b']])

    expect(mapOptionalId(undefined, ids)).toBeUndefined()
    expect(mapOptionalId('a', ids)).toBe('b')
    expect(mapRequiredId('a', ids)).toBe('b')
    expect(mapRequiredId('missing', ids)).toBe('missing')
    expect(uniqueById([{ id: 'a', v: 1 }, { id: 'a', v: 2 }])).toEqual([
      { id: 'a', v: 2 },
    ])
  })

  it('supports topic packages without optional canvas records', () => {
    const minimal = { ...payload, canvasEdges: undefined, canvasShapeNodes: undefined }
    const randomId = vi.spyOn(crypto, 'randomUUID')

    expect(createTopicImportIdMap(minimal).edges.size).toBe(0)
    expect(randomId).toHaveBeenCalled()
  })
})
