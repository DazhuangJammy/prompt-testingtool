import { describe, expect, it, vi } from 'vitest'
import type { PromptCard, ProviderConfig } from '@/shared/types'
import {
  MAX_COMPARE_PANES,
  areComparePanesEqual,
  canRemoveComparePane,
  createComparePane,
  createInitialComparePanes,
  ensureMinimumComparePanes,
  getPaneThinkingMode,
  getProviderThinkingMode,
  pickCardForPane,
  removeComparePaneById,
  resolvePaneCard,
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
    expect(ensureMinimumComparePanes([])).toHaveLength(2)
    expect(
      ensureMinimumComparePanes(
        Array.from({ length: MAX_COMPARE_PANES + 1 }, (_, index) =>
          createComparePane({ cardId: `card-${index}` }),
        ),
      ),
    ).toHaveLength(MAX_COMPARE_PANES)
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

    const synced = syncComparePanes(panes, cards[0], cards, false)

    expect(synced[0]).toMatchObject({ cardId: 'card-1', sessionId: undefined })
    expect(synced[1]).toMatchObject({ cardId: 'card-1', sessionId: undefined })
  })

  it('preserves existing card selections while compare mode is open', () => {
    const panes = [createComparePane({ cardId: 'card-2' })]

    expect(syncComparePanes(panes, cards[0], cards, true)[0]).toMatchObject({
      cardId: 'card-2',
    })
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
