import { describe, expect, it } from 'vitest'
import {
  copyChatComparePaneCards,
  mergeComparePaneCardIds,
  normalizeChatComparePaneCards,
  resolveVisibleComparePaneCardIds,
  resolveChatComparePaneCards,
  setChatComparePaneCards,
} from './chatComparePaneCards'
import { MAX_COMPARE_PANES, createComparePane } from './comparePanes'

describe('chat compare pane cards', () => {
  it('stores selected prompt cards per chat session', () => {
    const selected = setChatComparePaneCards({}, 'source', ['card-1', 'card-2'])
    const updated = setChatComparePaneCards(selected, 'source', [
      'card-2',
      'card-1',
    ])

    expect(resolveChatComparePaneCards(selected, 'source')).toEqual([
      'card-1',
      'card-2',
    ])
    expect(resolveChatComparePaneCards(updated, 'source')).toEqual([
      'card-2',
      'card-1',
    ])
    expect(resolveChatComparePaneCards(updated, 'other')).toEqual([])
  })

  it('copies selected prompt cards when duplicating a chat session', () => {
    const selected = setChatComparePaneCards({}, 'source', ['card-1', 'card-2'])
    const copied = copyChatComparePaneCards(selected, 'source', 'copy', {
      'card-1': 'copy-card-1',
      'card-2': 'copy-card-2',
    })

    expect(copied).toEqual({
      source: ['card-1', 'card-2'],
      copy: ['copy-card-1', 'copy-card-2'],
    })
  })

  it('copies pane cards from full pane state when stored card ids are partial', () => {
    const selected = setChatComparePaneCards({}, 'source', ['card-1', 'card-2'])
    const sourcePanes = Array.from({ length: 8 }, (_, index) =>
      createComparePane({ cardId: `card-${index + 1}` }),
    )
    const cardIdMap = Object.fromEntries(
      Array.from({ length: 8 }, (_, index) => [
        `card-${index + 1}`,
        `copy-card-${index + 1}`,
      ]),
    )

    const copied = copyChatComparePaneCards(
      selected,
      'source',
      'copy',
      cardIdMap,
      sourcePanes,
    )

    expect(copied.copy).toEqual(
      Array.from({ length: 8 }, (_, index) => `copy-card-${index + 1}`),
    )
  })

  it('merges partial selected cards with full pane state by pane index', () => {
    const panes = [
      createComparePane({ cardId: 'pane-card-1' }),
      createComparePane({ cardId: 'pane-card-2' }),
      createComparePane({ cardId: 'pane-card-3' }),
      createComparePane({ cardId: 'pane-card-4' }),
    ]

    expect(mergeComparePaneCardIds(['stored-card-1', 'stored-card-2'], panes))
      .toEqual([
        'stored-card-1',
        'stored-card-2',
        'pane-card-3',
        'pane-card-4',
      ])
  })

  it('resolves visible fallback cards for empty panes without chat records', () => {
    const cards = Array.from({ length: 8 }, (_, index) => ({
      id: `card-${index + 1}`,
      canvasId: 'canvas',
      title: `卡片 ${index + 1}`,
      position: { x: 0, y: 0 },
      sections: {},
      createdAt: 'now',
      updatedAt: 'now',
    }))
    const panes = Array.from({ length: 8 }, (_, index) =>
      createComparePane({
        cardId: index < 2 ? `card-${index + 1}` : undefined,
      }),
    )

    expect(resolveVisibleComparePaneCardIds(['card-1', 'card-2'], panes, cards[0], cards))
      .toEqual(Array.from({ length: 8 }, (_, index) => `card-${index + 1}`))
  })

  it('normalizes persisted pane card selections', () => {
    expect(
      normalizeChatComparePaneCards({
        source: [' card-1 ', '', 'card-3'],
        empty: ['', ''],
        invalid: 'card-1',
        overflow: Array.from(
          { length: MAX_COMPARE_PANES + 1 },
          (_, index) => `card-${index}`,
        ),
      }),
    ).toEqual({
      source: ['card-1', '', 'card-3'],
      overflow: Array.from(
        { length: MAX_COMPARE_PANES },
        (_, index) => `card-${index}`,
      ),
    })
    expect(normalizeChatComparePaneCards(null)).toEqual({})
  })
})
