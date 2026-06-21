import { describe, expect, it, vi } from 'vitest'
import type { PromptCard, ProviderConfig } from '@/shared/types'
import {
  MAX_COMPARE_PANES,
  areComparePanesEqual,
  canRemoveComparePane,
  createComparePane,
  createInitialComparePanes,
  ensureMinimumComparePanes,
  getComparePanelWidth,
  getPaneThinkingMode,
  getProviderThinkingMode,
  pickCardForPane,
  removeComparePaneById,
  resolvePaneCard,
  selectActiveCompareChildSessions,
  syncComparePanes,
} from './comparePanes'

vi.mock('@/shared/utils/identity', () => ({
  createId: vi.fn(() => 'id'),
}))

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

const thinkingProvider: ProviderConfig = {
  id: 'provider',
  name: 'Model',
  baseUrl: 'https://example.test',
  apiKey: 'key',
  model: 'deepseek-reasoner',
  createdAt: 'now',
  updatedAt: 'now',
}

describe('compare panes model', () => {
  it('creates default panes', () => {
    expect(createComparePane({ cardId: 'card-1' })).toMatchObject({
      cardId: 'card-1',
      id: 'pane-id',
      input: '',
      promptInjectionMode: 'system',
    })
    expect(createInitialComparePanes()).toHaveLength(2)
  })

  it('keeps pane count within bounds', () => {
    expect(MAX_COMPARE_PANES).toBe(10)
    expect(ensureMinimumComparePanes([])).toHaveLength(2)
    expect(
      ensureMinimumComparePanes(
        Array.from({ length: MAX_COMPARE_PANES + 1 }, (_, index) =>
          createComparePane({ cardId: `card-${index}` }),
        ),
      ),
    ).toHaveLength(MAX_COMPARE_PANES)
  })

  it('calculates readable compare panel width from pane count', () => {
    expect(getComparePanelWidth(1)).toBe(761)
    expect(getComparePanelWidth(2)).toBe(761)
    expect(getComparePanelWidth(3)).toBe(1142)
    expect(getComparePanelWidth(MAX_COMPARE_PANES + 1)).toBe(3809)
  })

  it('allows removing from two panes and asks compare mode to exit at one pane', () => {
    const panes = [
      createComparePane({ cardId: 'card-1', id: 'pane-1' }),
      createComparePane({ cardId: 'card-2', id: 'pane-2' }),
    ]

    const result = removeComparePaneById(panes, 'pane-2')

    expect(canRemoveComparePane(panes)).toBe(true)
    expect(result.removed).toBe(true)
    expect(result.shouldExitCompare).toBe(true)
    expect(result.panes).toHaveLength(1)
    expect(result.panes[0].id).toBe('pane-1')
  })

  it('keeps the last pane when compare mode already has one pane', () => {
    const panes = [createComparePane({ cardId: 'card-1', id: 'pane-1' })]

    const result = removeComparePaneById(panes, 'pane-1')

    expect(canRemoveComparePane(panes)).toBe(false)
    expect(result.removed).toBe(false)
    expect(result.shouldExitCompare).toBe(false)
    expect(result.panes).toBe(panes)
  })

  it('syncs panes to active cards when compare mode is closed', () => {
    const panes = [
      createComparePane({ cardId: 'missing', sessionId: 'old' }),
      createComparePane({ cardId: 'card-2' }),
    ]

    const synced = syncComparePanes(panes, cards[0], cards, false, 'session-1')

    expect(synced[0]).toMatchObject({
      cardId: 'card-1',
      parentSessionId: 'session-1',
      sessionId: undefined,
    })
    expect(synced[1]).toMatchObject({
      cardId: 'card-1',
      parentSessionId: 'session-1',
      sessionId: undefined,
    })
  })

  it('preserves existing card selections while compare mode is open', () => {
    const panes = [createComparePane({ cardId: 'card-2', parentSessionId: 's' })]

    expect(syncComparePanes(panes, cards[0], cards, true, 's')[0]).toMatchObject({
      cardId: 'card-2',
      parentSessionId: 's',
    })
  })

  it('clears pane sessions when the parent chat topic changes', () => {
    const panes = [
      createComparePane({
        cardId: 'card-2',
        parentSessionId: 'source',
        sessionId: 'pane-session',
      }),
    ]

    expect(syncComparePanes(panes, cards[0], cards, true, 'copy')[0]).toMatchObject({
      cardId: 'card-2',
      parentSessionId: 'copy',
      sessionId: undefined,
    })
  })

  it('ignores hidden child sessions while compare mode is closed', () => {
    const panes = [
      createComparePane({
        cardId: 'card-2',
        parentSessionId: 'copy',
        sessionId: 'copy-pane-0',
      }),
    ]

    const synced = syncComparePanes(panes, cards[0], cards, false, 'copy', [
      {
        id: 'copy-pane-0',
        canvasId: 'canvas',
        comparePaneIndex: 0,
        hidden: true,
        parentSessionId: 'copy',
        promptCardId: 'card-2',
        title: 'hidden',
        createdAt: 'now',
        updatedAt: 'now',
      },
    ])

    expect(synced[0]).toMatchObject({
      cardId: 'card-1',
      parentSessionId: 'copy',
      sessionId: undefined,
    })
  })

  it('restores child compare sessions by pane index for the active topic', () => {
    const panes = [
      createComparePane({ cardId: 'card-1', parentSessionId: 'source' }),
      createComparePane({ cardId: 'card-2', parentSessionId: 'source' }),
    ]

    const synced = syncComparePanes(panes, cards[0], cards, true, 'copy', [
      {
        id: 'copy-pane-0',
        canvasId: 'canvas',
        comparePaneIndex: 0,
        hidden: true,
        parentSessionId: 'copy',
        promptCardId: 'card-2',
        title: 'hidden',
        createdAt: 'now',
        updatedAt: 'now',
      },
      {
        id: 'copy-pane-1',
        canvasId: 'canvas',
        comparePaneIndex: 1,
        hidden: true,
        parentSessionId: 'copy',
        promptCardId: 'card-1',
        title: 'hidden',
        createdAt: 'now',
        updatedAt: 'now',
      },
    ])

    expect(synced).toMatchObject([
      {
        cardId: 'card-2',
        parentSessionId: 'copy',
        sessionId: 'copy-pane-0',
      },
      {
        cardId: 'card-1',
        parentSessionId: 'copy',
        sessionId: 'copy-pane-1',
      },
    ])
  })

  it('keeps the selected injection card when a pane already belongs to the active topic', () => {
    const panes = [
      createComparePane({
        cardId: 'card-2',
        parentSessionId: 'copy',
        sessionId: 'copy-pane-0',
      }),
    ]

    const synced = syncComparePanes(panes, cards[0], cards, true, 'copy', [
      {
        id: 'copy-pane-0',
        canvasId: 'canvas',
        comparePaneIndex: 0,
        hidden: true,
        parentSessionId: 'copy',
        promptCardId: 'card-1',
        title: 'hidden',
        createdAt: 'now',
        updatedAt: 'now',
      },
    ])

    expect(synced[0]).toMatchObject({
      cardId: 'card-2',
      parentSessionId: 'copy',
      sessionId: 'copy-pane-0',
    })
  })

  it('selects the newest hidden child session for each compare pane index', () => {
    const sessions = selectActiveCompareChildSessions([
      {
        id: 'old-pane-0',
        canvasId: 'canvas',
        comparePaneIndex: 0,
        hidden: true,
        parentSessionId: 'copy',
        promptCardId: 'card-1',
        title: 'old',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'new-pane-0',
        canvasId: 'canvas',
        comparePaneIndex: 0,
        hidden: true,
        parentSessionId: 'copy',
        promptCardId: 'card-2',
        title: 'new',
        createdAt: '2026-01-02T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
      {
        id: 'pane-1',
        canvasId: 'canvas',
        comparePaneIndex: 1,
        hidden: true,
        parentSessionId: 'copy',
        promptCardId: 'card-1',
        title: 'one',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ])

    expect(sessions.map((session) => session.id)).toEqual(['new-pane-0', 'pane-1'])
  })

  it('picks and resolves pane cards', () => {
    const panes = [createComparePane({ cardId: 'card-1' })]

    expect(pickCardForPane(1, panes, cards, 'fallback')).toBe('card-2')
    expect(resolvePaneCard(panes[0], 0, undefined, cards, panes)).toBe(cards[0])
    expect(
      resolvePaneCard(createComparePane({ cardId: 'missing' }), 1, cards[0], cards, panes),
    ).toBe(cards[1])
  })

  it('compares pane equality', () => {
    const pane = createComparePane({ cardId: 'card-1' })

    expect(areComparePanesEqual([pane], [pane])).toBe(true)
    expect(areComparePanesEqual([pane], [{ ...pane, input: 'next' }])).toBe(false)
    expect(
      areComparePanesEqual([pane], [{ ...pane, parentSessionId: 'next' }]),
    ).toBe(false)
  })

  it('normalizes thinking modes by provider capability', () => {
    expect(getProviderThinkingMode(undefined, 'on', {})).toBe('off')
    expect(getProviderThinkingMode(thinkingProvider, 'deep', {})).toBe('deep')
    expect(getProviderThinkingMode(thinkingProvider, 'on', { provider: 'deep' })).toBe(
      'deep',
    )
    expect(getPaneThinkingMode(undefined, 'deep')).toBe('off')
    expect(getPaneThinkingMode(thinkingProvider, 'deep')).toBe('deep')
  })
})
