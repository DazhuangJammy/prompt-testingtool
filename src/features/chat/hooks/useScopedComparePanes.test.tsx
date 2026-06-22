import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createComparePane, type ComparePaneState } from '../model/comparePanes'
import { useScopedComparePanes } from './useScopedComparePanes'
import type { PromptCard } from '@/shared/types'

let root: Root | undefined
let host: HTMLDivElement | undefined

const cards: PromptCard[] = [
  {
    id: 'card-1',
    canvasId: 'canvas',
    title: 'One',
    position: { x: 0, y: 0 },
    sections: {},
    createdAt: 'now',
    updatedAt: 'now',
  },
  {
    id: 'card-2',
    canvasId: 'canvas',
    title: 'Two',
    position: { x: 0, y: 0 },
    sections: {},
    createdAt: 'now',
    updatedAt: 'now',
  },
]

function renderHookHarness({
  comparePaneCardIds = [],
  compareOpen = true,
  persistedComparePanes,
  onComparePaneCardIdsChange = vi.fn(),
  onComparePanesChange = vi.fn(),
}: {
  comparePaneCardIds?: string[]
  compareOpen?: boolean
  persistedComparePanes: ComparePaneState[]
  onComparePaneCardIdsChange?: (cardIds: string[]) => void
  onComparePanesChange?: (
    panes: ComparePaneState[] | ((current: ComparePaneState[]) => ComparePaneState[]),
  ) => void
}) {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)

  act(() => {
    root?.render(
      <HookHarness
        compareOpen={compareOpen}
        comparePaneCardIds={comparePaneCardIds}
        onComparePaneCardIdsChange={onComparePaneCardIdsChange}
        onComparePanesChange={onComparePanesChange}
        persistedComparePanes={persistedComparePanes}
      />,
    )
  })
}

function HookHarness({
  compareOpen,
  comparePaneCardIds,
  onComparePaneCardIdsChange,
  onComparePanesChange,
  persistedComparePanes,
}: {
  compareOpen: boolean
  comparePaneCardIds: string[]
  onComparePaneCardIdsChange: (cardIds: string[]) => void
  onComparePanesChange: (
    panes: ComparePaneState[] | ((current: ComparePaneState[]) => ComparePaneState[]),
  ) => void
  persistedComparePanes: ComparePaneState[]
}) {
  useScopedComparePanes({
    activeCard: cards[0],
    activeSessionId: 'main-session',
    childSessions: [],
    compareOpen,
    comparePaneCardIds,
    persistedComparePanes,
    promptCards: cards,
    onComparePaneCardIdsChange,
    onComparePanesChange,
  })

  return null
}

async function flushEffects() {
  await act(async () => {
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
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

describe('useScopedComparePanes', () => {
  it('does not clear restored pane state when persisted card ids are empty', async () => {
    const onComparePaneCardIdsChange = vi.fn<(cardIds: string[]) => void>()
    const onComparePanesChange = vi.fn<
      (
        panes: ComparePaneState[] | ((current: ComparePaneState[]) => ComparePaneState[]),
      ) => void
    >()
    const restoredPanes = [
      createComparePane({
        id: 'pane-1',
        cardId: 'card-1',
        parentSessionId: 'main-session',
        sessionId: 'child-session-1',
      }),
      createComparePane({
        id: 'pane-2',
        cardId: 'card-2',
        parentSessionId: 'main-session',
        sessionId: 'child-session-2',
      }),
    ]

    renderHookHarness({
      comparePaneCardIds: [],
      persistedComparePanes: restoredPanes,
      onComparePaneCardIdsChange,
      onComparePanesChange,
    })

    await flushEffects()

    expect(onComparePaneCardIdsChange).toHaveBeenCalledWith(['card-1', 'card-2'])
    expect(onComparePanesChange).not.toHaveBeenCalled()
  })
})
