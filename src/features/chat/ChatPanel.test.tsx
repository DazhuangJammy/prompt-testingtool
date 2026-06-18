import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import type { PromptCard, ProviderConfig } from '@/shared/types'
import { ChatPanel } from './ChatPanel'

vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: vi.fn((_query, _deps, defaultValue) => defaultValue),
}))

let root: Root | undefined
let host: HTMLDivElement | undefined
let activeCardChangeMock: Mock<(id: string) => void> | undefined

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
  const ensureWidthMock = vi.fn<(width: number) => void>()
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
        collapsed={false}
        activeSessionId={undefined}
        onActiveSessionChange={vi.fn()}
        onActiveCardChange={activeCardChangeMock}
        onEnsureWidth={ensureWidthMock}
        onResizeStart={vi.fn()}
        onSelectProvider={vi.fn()}
        onToggle={vi.fn()}
        width={720}
      />,
    )
  })

  return { ensureWidthMock }
}

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = undefined
  activeCardChangeMock = undefined
  host?.remove()
  host = undefined
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('ChatPanel', () => {
  it('asks the parent panel to expand when compare mode opens and panes are added', () => {
    const { ensureWidthMock } = renderChatPanel()

    act(() => {
      document
        .querySelector<HTMLButtonElement>('button[aria-label="对比"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(ensureWidthMock).toHaveBeenCalledWith(761)

    act(() => {
      document
        .querySelector<HTMLButtonElement>('button[aria-label="新增"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(ensureWidthMock).toHaveBeenLastCalledWith(1142)
  })

  it('allows deleting a compare pane down to one pane and exits compare mode', () => {
    renderChatPanel()

    act(() => {
      document
        .querySelector<HTMLButtonElement>('button[aria-label="对比"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(document.body.textContent).toContain('对比模式')
    const deleteButtons = Array.from(
      document.querySelectorAll<HTMLButtonElement>('button[aria-label="删除"]'),
    )

    expect(deleteButtons).toHaveLength(2)
    expect(deleteButtons.every((button) => !button.disabled)).toBe(true)

    const cardSelects = Array.from(
      document.querySelectorAll<HTMLSelectElement>('select[aria-label="提示词卡片"]'),
    )
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
})
