import { describe, expect, it, vi } from 'vitest'
import type { QuickPhrase } from '@/shared/types'
import {
  QUICK_PHRASE_ALL_GROUP_ID,
  QUICK_PHRASE_DEFAULT_GROUP_ID,
  createQuickPhrase,
  createQuickPhraseGroup,
  filterQuickPhrasesByGroup,
  getNextSortOrder,
  getQuickPhraseGroupLabel,
  normalizeQuickPhrase,
} from './quickPhrases'

vi.mock('@/shared/utils/identity', () => ({
  createId: () => 'generated-id',
}))

vi.mock('@/shared/utils/time', () => ({
  nowIso: () => '2026-01-01T00:00:00.000Z',
}))

describe('quick phrase model', () => {
  it('creates normalized groups and phrases', () => {
    expect(createQuickPhraseGroup({ name: '  常用  ' }, 2)).toMatchObject({
      id: 'generated-id',
      name: '常用',
      sortOrder: 2,
    })
    expect(
      createQuickPhrase(
        { title: '  问候  ', content: '  你好  ', groupId: 'default' },
        3,
      ),
    ).toMatchObject({
      id: 'generated-id',
      title: '问候',
      content: '你好',
      groupId: undefined,
      sortOrder: 3,
    })
  })

  it('filters phrases by all, default, or custom groups', () => {
    const phrases: QuickPhrase[] = [
      phrase('one', undefined, 2),
      phrase('two', 'work', 1),
      phrase('three', undefined, 3),
    ]

    expect(filterQuickPhrasesByGroup(phrases, QUICK_PHRASE_ALL_GROUP_ID).map((item) => item.id))
      .toEqual(['two', 'one', 'three'])
    expect(
      filterQuickPhrasesByGroup(phrases, QUICK_PHRASE_DEFAULT_GROUP_ID).map(
        (item) => item.id,
      ),
    ).toEqual(['one', 'three'])
    expect(filterQuickPhrasesByGroup(phrases, 'work').map((item) => item.id))
      .toEqual(['two'])
  })

  it('resolves group labels with default fallback', () => {
    expect(getQuickPhraseGroupLabel([{ id: 'work', name: '工作', createdAt: 'a', updatedAt: 'a' }], 'work'))
      .toBe('工作')
    expect(getQuickPhraseGroupLabel([], undefined)).toBe('默认')
    expect(getQuickPhraseGroupLabel([], 'missing')).toBe('默认')
  })

  it('normalizes unknown sort orders and computes the next order', () => {
    expect(normalizeQuickPhrase(phrase('one', '', Number.NaN)).sortOrder).toBe(0)
    expect(getNextSortOrder([{ sortOrder: 1 }, { sortOrder: 8 }])).toBe(9)
  })
})

function phrase(
  id: string,
  groupId: string | undefined,
  sortOrder: number,
): QuickPhrase {
  return {
    id,
    title: id,
    content: id,
    groupId,
    sortOrder,
    createdAt: id,
    updatedAt: id,
  }
}
