import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import type { PromptCard, ProviderConfig } from '@/shared/types'
import { createComparePane, type ComparePaneState } from './model/comparePanes'
import { ChatPanel } from './ChatPanel'

const liveQueryMockState = vi.hoisted(() => ({
  childSessionsRequested: false,
  paneMessagesUsedChildSessions: false,
}))

vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: vi.fn((query, deps, defaultValue) => {
    if (
      Array.isArray(deps) &&
      typeof deps[0] === 'string' &&
      deps[0].includes('child-session-')
    ) {
      liveQueryMockState.paneMessagesUsedChildSessions = true
    }
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
    if (source.includes('listChildSessions')) {
      liveQueryMockState.childSessionsRequested = true
      return [
        {
          id: 'child-session-1',
          canvasId: 'canvas-1',
          promptCardId: 'card-1',
          parentSessionId: 'main-session',
          comparePaneIndex: 0,
          hidden: true,
          title: '对比 1',
          createdAt: 'now',
          updatedAt: 'now',
        },
        {
          id: 'child-session-2',
          canvasId: 'canvas-1',
          promptCardId: 'card-2',
          parentSessionId: 'main-session',
          comparePaneIndex: 1,
          hidden: true,
          title: '对比 2',
          createdAt: 'now',
          updatedAt: 'now',
        },
      ]
    }
    if (source.includes('listMessagesBySession')) {
      const sessionKey = Array.isArray(deps) ? String(deps[0] ?? '') : ''
      if (sessionKey.includes('child-session-')) {
        return Object.fromEntries(
          sessionKey.split('|').map((entry) => {
            const [paneId, sessionId] = entry.split(':')
            return [
              paneId,
              [
                {
                  id: `message-${sessionId}`,
                  sessionId,
                  role: 'assistant',
                  content: `保留记录 ${sessionId}`,
                  createdAt: 'now',
                },
              ],
            ]
          }),
        )
      }
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
    assignChatSessionPromptCard: vi.fn(async () => undefined),
  }
})

let root: Root | undefined
let host: HTMLDivElement | undefined
let activeCardChangeMock: Mock<(id: string) => void> | undefined
let activeSessionChangeMock: Mock<(id?: string) => void> | undefined
let comparePaneCardIdsChangeMock: Mock<(cardIds: string[]) => void> | undefined
let comparePanesChangeMock:
  | Mock<
      (
        panes: ComparePaneState[] | ((current: ComparePaneState[]) => ComparePaneState[]),
      ) => void
    >
  | undefined

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

function renderChatPanel() {
  activeCardChangeMock = vi.fn<(id: string) => void>()
  activeSessionChangeMock = vi.fn<(id?: string) => void>()
  comparePaneCardIdsChangeMock = vi.fn<(cardIds: string[]) => void>()
  comparePanesChangeMock = vi.fn<
    (
      panes: ComparePaneState[] | ((current: ComparePaneState[]) => ComparePaneState[]),
    ) => void
  >()
  const ensureWidthMock = vi.fn<(width: number) => void>()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)

  act(() => {
    root?.render(
      <ChatPanelHarness
        ensureWidthMock={ensureWidthMock}
        onActiveCardChange={activeCardChangeMock!}
        onActiveSessionChange={activeSessionChangeMock!}
        onComparePaneCardIdsChange={comparePaneCardIdsChangeMock!}
        onComparePanesChange={comparePanesChangeMock!}
      />,
    )
  })

  return {
    activeSessionChangeMock,
    comparePaneCardIdsChangeMock,
    comparePanesChangeMock,
    ensureWidthMock,
  }
}

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

function getCardSelects() {
  return Array.from(
    document.querySelectorAll<HTMLSelectElement>('select[aria-label="提示词卡片"]'),
  )
}

function addComparePanes(count: number) {
  Array.from({ length: count }).forEach(() => clickButton('新增'))
}

function ChatPanelHarness({
  ensureWidthMock,
  onActiveCardChange,
  onActiveSessionChange,
  onComparePaneCardIdsChange,
  onComparePanesChange,
}: {
  ensureWidthMock: (width: number) => void
  onActiveCardChange: (id: string) => void
  onActiveSessionChange: (id?: string) => void
  onComparePaneCardIdsChange: (cardIds: string[]) => void
  onComparePanesChange: (
    panes: ComparePaneState[] | ((current: ComparePaneState[]) => ComparePaneState[]),
  ) => void
}) {
  const [compareOpen, setCompareOpen] = useState(false)
  const [comparePaneCardIds, setComparePaneCardIds] = useState<string[]>([])
  const [comparePanes, setComparePanes] = useState<ComparePaneState[]>([])

  return (
    <ChatPanel
      card={cards[0]}
      provider={provider}
      promptCards={cards}
      providers={[provider]}
      compareOpen={compareOpen}
      comparePaneCardIds={comparePaneCardIds}
      comparePanes={comparePanes}
      collapsed={false}
      activeSessionId="main-session"
      onActiveSessionChange={onActiveSessionChange}
      onActiveCardChange={onActiveCardChange}
      onCompareOpenChange={setCompareOpen}
      onComparePaneCardIdsChange={(cardIds) => {
        setComparePaneCardIds(cardIds)
        onComparePaneCardIdsChange(cardIds)
      }}
      onComparePanesChange={(panes) => {
        setComparePanes((current) => {
          const next = typeof panes === 'function' ? panes(current) : panes
          onComparePanesChange(next)
          return next
        })
      }}
      onEnsureWidth={ensureWidthMock}
      onResizeStart={vi.fn()}
      onSelectProvider={vi.fn()}
      onToggle={vi.fn()}
      width={720}
    />
  )
}

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = undefined
  activeCardChangeMock = undefined
  activeSessionChangeMock = undefined
  comparePaneCardIdsChangeMock = undefined
  comparePanesChangeMock = undefined
  liveQueryMockState.childSessionsRequested = false
  liveQueryMockState.paneMessagesUsedChildSessions = false
  host?.remove()
  host = undefined
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('ChatPanel', () => {
  it('asks the parent panel to expand when compare mode opens and panes are added', () => {
    const { ensureWidthMock } = renderChatPanel()

    clickButton('对比')

    expect(ensureWidthMock).toHaveBeenCalledWith(761)

    clickButton('新增')

    expect(ensureWidthMock).toHaveBeenLastCalledWith(1142)
  })

  it('allows deleting a compare pane down to one pane and exits compare mode', () => {
    renderChatPanel()

    clickButton('对比')

    expect(document.body.textContent).toContain('对比模式')
    const deleteButtons = Array.from(
      document.querySelectorAll<HTMLButtonElement>('button[aria-label="删除"]'),
    )

    expect(deleteButtons).toHaveLength(2)
    expect(deleteButtons.every((button) => !button.disabled)).toBe(true)

    const cardSelects = getCardSelects()
    act(() => {
      cardSelects[1].value = 'card-2'
      cardSelects[1].dispatchEvent(new Event('change', { bubbles: true }))
    })

    act(() => {
      deleteButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(document.body.textContent).not.toContain('对比模式')
    expect(
      document.querySelectorAll<HTMLButtonElement>('button[aria-label="删除"]'),
    ).toHaveLength(0)
    expect(activeCardChangeMock).toHaveBeenCalledWith('card-2')
  })

  it('persists selected prompt cards for compare panes', async () => {
    const { comparePaneCardIdsChangeMock } = renderChatPanel()

    clickButton('对比')

    await flushPanelEffects()

    const cardSelects = getCardSelects()

    act(() => {
      cardSelects[0].value = 'card-2'
      cardSelects[0].dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(comparePaneCardIdsChangeMock).toHaveBeenCalledWith(['card-2', 'card-2'])
  })

  it('persists empty compare panes after adding them', () => {
    const { comparePanesChangeMock } = renderChatPanel()

    clickButton('对比')
    addComparePanes(4)

    const lastPersistedPanes = comparePanesChangeMock.mock.calls.at(-1)?.[0]
    expect(Array.isArray(lastPersistedPanes) ? lastPersistedPanes : []).toHaveLength(6)
    expect(getCardSelects()).toHaveLength(6)
  })

  it('persists ten empty compare panes before any message is sent', () => {
    const { comparePanesChangeMock } = renderChatPanel()

    clickButton('对比')
    addComparePanes(8)

    const lastPersistedPanes = comparePanesChangeMock.mock.calls.at(-1)?.[0]
    expect(Array.isArray(lastPersistedPanes) ? lastPersistedPanes : []).toHaveLength(10)
    expect(getCardSelects()).toHaveLength(10)
  })

  it('restores persisted compare pane count on mount', () => {
    const onComparePanesChange = vi.fn<
      (
        panes: ComparePaneState[] | ((current: ComparePaneState[]) => ComparePaneState[]),
      ) => void
    >()
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
          compareOpen
          comparePaneCardIds={[]}
          comparePanes={Array.from({ length: 10 }, (_, index) =>
            createComparePane({ id: `pane-${index}` }),
          )}
          collapsed={false}
          activeSessionId="main-session"
          onActiveSessionChange={vi.fn()}
          onActiveCardChange={vi.fn()}
          onCompareOpenChange={vi.fn()}
          onComparePaneCardIdsChange={vi.fn()}
          onComparePanesChange={onComparePanesChange}
          onEnsureWidth={vi.fn()}
          onResizeStart={vi.fn()}
          onSelectProvider={vi.fn()}
          onToggle={vi.fn()}
          width={2400}
        />,
      )
    })

    expect(getCardSelects()).toHaveLength(10)
    expect(onComparePanesChange).not.toHaveBeenCalled()
  })

  it('fills missing persisted card ids from restored pane state', async () => {
    const onComparePaneCardIdsChange = vi.fn<(cardIds: string[]) => void>()
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
          compareOpen
          comparePaneCardIds={['card-1']}
          comparePanes={[
            createComparePane({ id: 'pane-1', cardId: 'card-1' }),
            createComparePane({ id: 'pane-2', cardId: 'card-2' }),
          ]}
          collapsed={false}
          activeSessionId="main-session"
          onActiveSessionChange={vi.fn()}
          onActiveCardChange={vi.fn()}
          onCompareOpenChange={vi.fn()}
          onComparePaneCardIdsChange={onComparePaneCardIdsChange}
          onComparePanesChange={vi.fn()}
          onEnsureWidth={vi.fn()}
          onResizeStart={vi.fn()}
          onSelectProvider={vi.fn()}
          onToggle={vi.fn()}
          width={900}
        />,
      )
    })

    await flushPanelEffects()

    expect(onComparePaneCardIdsChange).toHaveBeenCalledWith(['card-1', 'card-2'])
  })

  it('keeps the current topic when compare mode exits from hidden child sessions', async () => {
    const { activeSessionChangeMock } = renderChatPanel()

    clickButton('对比')

    await flushPanelEffects()

    expect(liveQueryMockState.childSessionsRequested).toBe(true)
    expect(liveQueryMockState.paneMessagesUsedChildSessions).toBe(true)

    const deleteButtons = Array.from(
      document.querySelectorAll<HTMLButtonElement>('button[aria-label="删除"]'),
    )

    act(() => {
      deleteButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(activeSessionChangeMock).not.toHaveBeenCalledWith('child-session-2')
  })

  it('keeps pane messages visible when changing the injected prompt card', async () => {
    renderChatPanel()

    clickButton('对比')

    await flushPanelEffects()

    expect(document.body.textContent).toContain('保留记录 child-session-1')

    const cardSelects = getCardSelects()

    act(() => {
      cardSelects[0].value = 'card-2'
      cardSelects[0].dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(cardSelects[0].value).toBe('card-2')
    expect(document.body.textContent).toContain('保留记录 child-session-1')
  })
})
