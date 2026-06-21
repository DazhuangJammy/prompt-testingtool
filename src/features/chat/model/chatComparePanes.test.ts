import { describe, expect, it } from 'vitest'
import {
  copyChatComparePanes,
  normalizeChatComparePanes,
  resolveChatComparePanes,
  setChatComparePanes,
} from './chatComparePanes'
import { MAX_COMPARE_PANES, createComparePane } from './comparePanes'

describe('chat compare panes', () => {
  it('stores pane state per visible chat session', () => {
    const panes = [
      createComparePane({ id: 'pane-a', cardId: 'card-1' }),
      createComparePane({ id: 'pane-b', cardId: 'card-2', input: 'draft' }),
      createComparePane({ id: 'pane-c', providerId: 'provider-1' }),
    ]
    const stored = setChatComparePanes({}, 'session-a', panes)

    expect(resolveChatComparePanes(stored, 'session-a')).toEqual(panes)
    expect(resolveChatComparePanes(stored, 'session-b')).toEqual([])
  })

  it('copies pane state when duplicating a chat session', () => {
    const stored = setChatComparePanes({}, 'source', [
      createComparePane({ id: 'pane-a', cardId: 'card-1' }),
    ])
    const copied = copyChatComparePanes(stored, 'source', 'copy', {
      'card-1': 'copied-card-1',
    })

    expect(resolveChatComparePanes(copied, 'copy')).toHaveLength(1)
    expect(resolveChatComparePanes(copied, 'copy')[0]).toMatchObject({
      id: 'pane-a',
      cardId: 'copied-card-1',
    })
  })

  it('copies empty pane selected cards from the resolved source card list', () => {
    const stored = setChatComparePanes({}, 'source', [
      createComparePane({ id: 'pane-1', cardId: 'card-1' }),
      createComparePane({ id: 'pane-2' }),
      createComparePane({ id: 'pane-3' }),
    ])
    const copied = copyChatComparePanes(
      stored,
      'source',
      'copy',
      {
        'card-1': 'copied-card-1',
        'card-2': 'copied-card-2',
        'card-3': 'copied-card-3',
      },
      ['card-1', 'card-2', 'card-3'],
    )

    expect(resolveChatComparePanes(copied, 'copy').map((pane) => pane.cardId))
      .toEqual(['copied-card-1', 'copied-card-2', 'copied-card-3'])
  })

  it('normalizes persisted pane state', () => {
    const normalized = normalizeChatComparePanes({
      session: [
        {
          id: 'pane-a',
          cardId: 'card-1',
          input: 'draft',
          promptInjectionMode: 'user',
          thinkingMode: 'deep',
          attachments: [
            {
              id: 'att-1',
              name: 'image.png',
              mimeType: 'image/png',
              size: 12,
              kind: 'image',
              dataUrl: 'data:image/png;base64,a',
            },
            { id: 'bad', kind: 'other' },
          ],
        },
        ...Array.from({ length: MAX_COMPARE_PANES + 2 }, (_, index) => ({
          id: `pane-${index}`,
        })),
      ],
      empty: [],
      invalid: 'nope',
      '': [{ id: 'ignored' }],
    })

    expect(normalized.session).toHaveLength(MAX_COMPARE_PANES)
    expect(normalized.session[0]).toMatchObject({
      id: 'pane-a',
      cardId: 'card-1',
      input: 'draft',
      promptInjectionMode: 'user',
      thinkingMode: 'deep',
      attachments: [
        {
          id: 'att-1',
          kind: 'image',
        },
      ],
    })
    expect(normalized.empty).toBeUndefined()
    expect(normalized.invalid).toBeUndefined()
  })
})
