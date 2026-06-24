import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/shared/storage/db'
import { quickPhraseRepository } from './quickPhraseRepository'

const modifyMock = vi.fn()
const equalsMock = vi.fn(() => ({ modify: modifyMock }))

vi.mock('@/shared/storage/db', () => ({
  db: {
    quickPhraseGroups: {
      add: vi.fn(),
      delete: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
      toArray: vi.fn(() => []),
    },
    quickPhrases: {
      add: vi.fn(),
      delete: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
      toArray: vi.fn(() => []),
      where: vi.fn(() => ({ equals: equalsMock })),
    },
    transaction: vi.fn(async (_mode, _groupTable, _phraseTable, callback) =>
      callback(),
    ),
  },
}))

vi.mock('@/shared/utils/identity', () => ({
  createId: () => 'generated-id',
}))

vi.mock('@/shared/utils/time', () => ({
  nowIso: () => '2026-01-01T00:00:00.000Z',
}))

describe('quickPhraseRepository', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates groups and phrases with the next sort order', async () => {
    vi.mocked(db.quickPhraseGroups.toArray).mockResolvedValueOnce([
      {
        id: 'old',
        name: '旧',
        sortOrder: 5,
        createdAt: 'old',
        updatedAt: 'old',
      },
    ])
    vi.mocked(db.quickPhrases.toArray).mockResolvedValueOnce([
      {
        id: 'phrase',
        title: '旧短语',
        content: '内容',
        sortOrder: 7,
        createdAt: 'old',
        updatedAt: 'old',
      },
    ])

    const group = await quickPhraseRepository.createGroup({ name: ' 常用 ' })
    const phrase = await quickPhraseRepository.createPhrase({
      title: ' 标题 ',
      content: ' 内容 ',
      groupId: 'default',
    })

    expect(group.sortOrder).toBe(6)
    expect(db.quickPhraseGroups.add).toHaveBeenCalledWith(group)
    expect(phrase).toMatchObject({
      title: '标题',
      content: '内容',
      groupId: undefined,
      sortOrder: 8,
    })
    expect(db.quickPhrases.add).toHaveBeenCalledWith(phrase)
  })

  it('moves phrases back to default when deleting a group', async () => {
    await quickPhraseRepository.deleteGroup('group')

    expect(db.quickPhraseGroups.delete).toHaveBeenCalledWith('group')
    expect(db.quickPhrases.where).toHaveBeenCalledWith('groupId')
    expect(equalsMock).toHaveBeenCalledWith('group')
    const updater = modifyMock.mock.calls[0]?.[0] as (phrase: {
      groupId?: string
      updatedAt: string
    }) => void
    const phrase = { groupId: 'group', updatedAt: 'old' }
    updater(phrase)
    expect(phrase).toEqual({ updatedAt: '2026-01-01T00:00:00.000Z' })
  })

  it('updates existing phrases only when they exist', async () => {
    vi.mocked(db.quickPhrases.get).mockResolvedValueOnce(undefined)

    await quickPhraseRepository.updatePhrase('missing', { title: 'Nope' })

    expect(db.quickPhrases.put).not.toHaveBeenCalled()

    vi.mocked(db.quickPhrases.get).mockResolvedValueOnce({
      id: 'phrase',
      title: '旧',
      content: '内容',
      createdAt: 'old',
      updatedAt: 'old',
    })

    await quickPhraseRepository.updatePhrase('phrase', { title: ' 新 ' })

    expect(db.quickPhrases.put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'phrase',
        title: '新',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    )
  })
})
