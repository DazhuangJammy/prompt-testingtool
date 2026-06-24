import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PromptInputSource } from '@/features/input-card/model/inputCard'
import type { PromptCard, ProviderConfig } from '@/shared/types'
import { ChatPanel } from './ChatPanel'
import type { ComparePaneState } from './model/comparePanes'

vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: vi.fn((query, _deps, defaultValue) => {
    const source = typeof query === 'function' ? query.toString() : ''
    if (source.includes('listSessionsByCanvas')) {
      return [
        {
          id: 'main-session',
          canvasId: 'canvas-1',
          promptCardId: 'card-1',
          title: '测试话题',
          createdAt: 'now',
          updatedAt: 'now',
        },
      ]
    }
    if (source.includes('listMessagesBySession')) {
      return [
        {
          id: 'message-1',
          sessionId: 'main-session',
          role: 'assistant',
          content: '已有上下文',
          createdAt: 'now',
        },
      ]
    }
    return defaultValue
  }),
}))

vi.mock('@/features/chat/application/chatService', async () => {
  const actual =
    await vi.importActual<typeof import('@/features/chat/application/chatService')>(
      '@/features/chat/application/chatService',
    )
  return {
    ...actual,
    sendChatMessage: vi.fn(async () => undefined),
  }
})

vi.mock('@/features/chat/infrastructure/chatRepository', () => ({
  chatRepository: {
    createSession: vi.fn(async () => undefined),
    listChildSessions: vi.fn(async () => []),
    listMessagesBySession: vi.fn(async () => []),
    listSessionsByCanvas: vi.fn(async () => []),
  },
}))

let root: Root | undefined
let host: HTMLDivElement | undefined

const cards: PromptCard[] = [
  {
    id: 'card-1',
    canvasId: 'canvas-1',
    title: '【01】 要去哪',
    position: { x: 0, y: 0 },
    sections: {},
    createdAt: 'now',
    updatedAt: 'now',
  },
  {
    id: 'card-2',
    canvasId: 'canvas-1',
    title: '【02】 怎么去',
    position: { x: 0, y: 0 },
    sections: {},
    createdAt: 'now',
    updatedAt: 'now',
  },
]

const provider: ProviderConfig = {
  id: 'provider-1',
  name: 'Qwen',
  baseUrl: 'https://example.test',
  apiKey: 'key',
  model: 'qwen3.7-plus',
  createdAt: 'now',
  updatedAt: 'now',
}

const inputSources: PromptInputSource[] = [
  {
    edge: {
      id: 'edge-1',
      canvasId: 'canvas-1',
      sourceId: 'input-1',
      sourceHandle: 'right',
      targetId: 'card-1',
      targetHandle: 'left',
      createdAt: 'now',
      updatedAt: 'now',
    },
    inputCard: {
      id: 'input-1',
      canvasId: 'canvas-1',
      title: '批量输入',
      markdown: '# 第一轮\n\n正文 A\n\n# 第二轮\n\n正文 B',
      position: { x: 0, y: 0 },
      createdAt: 'now',
      updatedAt: 'now',
    },
    segments: [
      { id: 'seg-1', title: '第一轮', content: '正文 A', order: 0 },
      { id: 'seg-2', title: '第二轮', content: '正文 B', order: 1 },
    ],
  },
]

const compareInputSources: PromptInputSource[] = [
  {
    edge: {
      id: 'edge-compare-1',
      canvasId: 'canvas-1',
      sourceId: 'input-compare-1',
      sourceHandle: 'right',
      targetId: 'card-2',
      targetHandle: 'left',
      createdAt: 'now',
      updatedAt: 'now',
    },
    inputCard: {
      id: 'input-compare-1',
      canvasId: 'canvas-1',
      title: '对比输入',
      markdown: '# 左侧不用\n\n忽略\n\n# 右侧要跑\n\n对比正文 B',
      position: { x: 0, y: 0 },
      createdAt: 'now',
      updatedAt: 'now',
    },
    segments: [
      { id: 'seg-compare-1', title: '左侧不用', content: '忽略', order: 0 },
      {
        id: 'seg-compare-2',
        title: '右侧要跑',
        content: '对比正文 B',
        order: 1,
      },
    ],
  },
]

function clickButton(label: string) {
  act(() => {
    document
      .querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

async function flushPanelEffects() {
  await act(async () => {
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
  })
}

function renderChatPanel() {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)

  act(() => {
    root?.render(
      <ChatPanel
        card={cards[0]}
        provider={provider}
        promptCards={cards}
        providers={[provider]}
        inputSources={inputSources}
        compareOpen={false}
        comparePaneCardIds={[]}
        comparePanes={[]}
        collapsed={false}
        activeSessionId="main-session"
        onActiveSessionChange={vi.fn()}
        onActiveCardChange={vi.fn()}
        onCompareOpenChange={vi.fn()}
        onComparePaneCardIdsChange={vi.fn()}
        onComparePanesChange={vi.fn()}
        onEnsureWidth={vi.fn()}
        onResizeStart={vi.fn()}
        onSelectProvider={vi.fn()}
        onToggle={vi.fn()}
        width={720}
      />,
    )
  })
}

function renderCompareChatPanel() {
  const comparePanes: ComparePaneState[] = [
    {
      id: 'pane-left',
      attachments: [],
      cardId: 'card-1',
      input: '',
      promptInjectionMode: 'system',
    },
    {
      id: 'pane-right',
      attachments: [],
      cardId: 'card-2',
      input: '',
      promptInjectionMode: 'system',
    },
  ]

  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)

  act(() => {
    root?.render(
      <ChatPanel
        card={cards[0]}
        provider={provider}
        promptCards={cards}
        providers={[provider]}
        inputSources={compareInputSources}
        compareOpen
        comparePaneCardIds={['card-1', 'card-2']}
        comparePanes={comparePanes}
        collapsed={false}
        activeSessionId="main-session"
        onActiveSessionChange={vi.fn()}
        onActiveCardChange={vi.fn()}
        onCompareOpenChange={vi.fn()}
        onComparePaneCardIdsChange={vi.fn()}
        onComparePanesChange={vi.fn()}
        onEnsureWidth={vi.fn()}
        onResizeStart={vi.fn()}
        onSelectProvider={vi.fn()}
        onToggle={vi.fn()}
        width={900}
      />,
    )
  })
}

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = undefined
  host?.remove()
  host = undefined
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('ChatPanel input runner', () => {
  it('shows input source controls and runs from the selected segment', async () => {
    const chatService =
      await import('@/features/chat/application/chatService')
    renderChatPanel()

    const segmentSelect = document.querySelector<HTMLSelectElement>(
      'select[aria-label="起始输入"]',
    )
    expect(segmentSelect?.value).toBe('seg-1')

    act(() => {
      segmentSelect!.value = 'seg-2'
      segmentSelect!.dispatchEvent(new Event('change', { bubbles: true }))
    })
    clickButton('运行输入')

    await flushPanelEffects()

    expect(chatService.sendChatMessage).toHaveBeenCalledTimes(1)
    expect(chatService.sendChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        history: [
          expect.objectContaining({
            content: '已有上下文',
            sessionId: 'main-session',
          }),
        ],
        text: '正文 B',
        sessionId: 'main-session',
      }),
    )
  })

  it('shows input controls per compare pane and runs only that pane', async () => {
    const chatService =
      await import('@/features/chat/application/chatService')
    const { chatRepository } =
      await import('@/features/chat/infrastructure/chatRepository')
    renderCompareChatPanel()

    const panes = Array.from(document.querySelectorAll<HTMLElement>('.split-pane'))
    expect(panes).toHaveLength(2)
    expect(panes[0].querySelector('select[aria-label="起始输入"]')).toBeNull()

    const rightSegmentSelect = panes[1].querySelector<HTMLSelectElement>(
      'select[aria-label="起始输入"]',
    )
    expect(rightSegmentSelect?.value).toBe('seg-compare-1')

    act(() => {
      rightSegmentSelect!.value = 'seg-compare-2'
      rightSegmentSelect!.dispatchEvent(new Event('change', { bubbles: true }))
    })
    act(() => {
      panes[1]
        .querySelector<HTMLButtonElement>('button[aria-label="运行输入"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    await flushPanelEffects()

    expect(chatService.sendChatMessage).toHaveBeenCalledTimes(1)
    expect(chatService.sendChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        card: expect.objectContaining({ id: 'card-2' }),
        sessionId: expect.any(String),
        text: '对比正文 B',
      }),
    )
    expect(chatRepository.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        comparePaneIndex: 1,
        hidden: true,
        parentSessionId: 'main-session',
        promptCardId: 'card-2',
      }),
    )
  })
})
