import { describe, expect, it } from 'vitest'
import type { ChatSession } from '@/shared/types'
import {
  createDuplicateChatSessionSortOrder,
  createDuplicateChatSessionTitle,
  createReorderedChatSessionSortUpdates,
  getChatSessionSortOrder,
  sortChatSessionsForSidebar,
} from './chatSessionOrdering'

const session = (updates: Partial<ChatSession>): ChatSession => ({
  id: 'session',
  title: '话题',
  createdAt: '2026-06-10T10:00:00.000Z',
  updatedAt: '2026-06-10T10:00:00.000Z',
  ...updates,
})

describe('chat session ordering', () => {
  it('sorts sessions by explicit order before updated time', () => {
    const sessions = [
      session({ id: 'old', sortOrder: 3 }),
      session({ id: 'source', sortOrder: 1 }),
      session({ id: 'middle', sortOrder: 2 }),
    ]

    expect(sortChatSessionsForSidebar(sessions).map((item) => item.id)).toEqual([
      'source',
      'middle',
      'old',
    ])
  })

  it('hides internal compare pane sessions from sidebar ordering', () => {
    const sessions = [
      session({ id: 'visible' }),
      session({ id: 'hidden', hidden: true, parentSessionId: 'visible' }),
    ]

    expect(sortChatSessionsForSidebar(sessions).map((item) => item.id)).toEqual([
      'visible',
    ])
  })

  it('falls back to updated time when explicit order ties or is absent', () => {
    const newer = session({
      id: 'newer',
      sortOrder: 1,
      updatedAt: '2026-06-10T10:03:00.000Z',
    })
    const older = session({
      id: 'older',
      sortOrder: 1,
      updatedAt: '2026-06-10T10:01:00.000Z',
    })
    const legacy = session({
      id: 'legacy',
      updatedAt: '2026-06-10T10:02:00.000Z',
    })

    expect(sortChatSessionsForSidebar([older, newer]).map((item) => item.id)).toEqual([
      'newer',
      'older',
    ])
    expect(getChatSessionSortOrder(legacy)).toBe(-Date.parse(legacy.updatedAt))
  })

  it('creates unique copy titles', () => {
    expect(createDuplicateChatSessionTitle('测试', ['测试'])).toBe('测试 副本')
    expect(createDuplicateChatSessionTitle('   ', [])).toBe('未命名话题 副本')
    expect(
      createDuplicateChatSessionTitle('测试', [
        '测试',
        '测试 副本',
        '测试 副本 2',
      ]),
    ).toBe('测试 副本 3')
  })

  it('places a duplicate immediately after the source topic', () => {
    const source = session({ id: 'source', sortOrder: 10 })
    const next = session({ id: 'next', sortOrder: 20 })

    expect(createDuplicateChatSessionSortOrder(source, [source, next])).toBe(15)
    expect(createDuplicateChatSessionSortOrder(next, [source, next])).toBe(21)
  })

  it('creates explicit sort updates after dragging a topic', () => {
    const sessions = [
      session({ id: 'one', sortOrder: 1 }),
      session({ id: 'two', sortOrder: 2 }),
      session({ id: 'three', sortOrder: 3 }),
    ]

    expect(
      createReorderedChatSessionSortUpdates(sessions, 'three', 'one'),
    ).toEqual([
      { id: 'three', sortOrder: 1 },
      { id: 'one', sortOrder: 2 },
      { id: 'two', sortOrder: 3 },
    ])
  })

  it('ignores missing drag targets and hidden compare sessions while reordering', () => {
    const sessions = [
      session({ id: 'one', sortOrder: 1 }),
      session({ id: 'hidden', hidden: true, sortOrder: 2 }),
      session({ id: 'two', sortOrder: 3 }),
    ]

    expect(
      createReorderedChatSessionSortUpdates(sessions, 'two', 'one'),
    ).toEqual([
      { id: 'two', sortOrder: 1 },
      { id: 'one', sortOrder: 2 },
    ])
    expect(createReorderedChatSessionSortUpdates(sessions, 'missing', 'one')).toEqual(
      [],
    )
  })

  it('falls back when the source is missing or the next order is not greater', () => {
    const source = session({ id: 'source', sortOrder: 10 })
    const sibling = session({ id: 'sibling', sortOrder: 10 })

    expect(createDuplicateChatSessionSortOrder(source, [sibling])).toBe(11)
    expect(createDuplicateChatSessionSortOrder(source, [source, sibling])).toBe(
      10.001,
    )
    expect(getChatSessionSortOrder(session({ sortOrder: Number.NaN }))).toBe(
      -Date.parse('2026-06-10T10:00:00.000Z'),
    )
    expect(getChatSessionSortOrder(session({ updatedAt: '', createdAt: '' }))).toBe(
      0,
    )
  })
})
