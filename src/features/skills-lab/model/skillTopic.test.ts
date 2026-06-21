import { describe, expect, it } from 'vitest'
import type { SkillTopic } from '@/shared/types'
import {
  createDuplicateSkillTopicTitle,
  createReorderedSkillTopicSortUpdates,
  getSkillTopicTitleFromPath,
  sortSkillTopicsForSidebar,
} from './skillTopic'

const topic = (updates: Partial<SkillTopic>): SkillTopic => ({
  id: 'topic',
  title: 'Topic',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...updates,
})

describe('skillTopic model', () => {
  it('sorts topics by explicit order before updated time', () => {
    expect(
      sortSkillTopicsForSidebar([
        topic({ id: 'b', sortOrder: 2, updatedAt: '2026-01-03T00:00:00.000Z' }),
        topic({ id: 'a', sortOrder: 1, updatedAt: '2026-01-01T00:00:00.000Z' }),
      ]).map((item) => item.id),
    ).toEqual(['a', 'b'])

    expect(
      sortSkillTopicsForSidebar([
        topic({ id: 'old', updatedAt: '2026-01-01T00:00:00.000Z' }),
        topic({ id: 'new', updatedAt: '2026-01-02T00:00:00.000Z' }),
      ]).map((item) => item.id),
    ).toEqual(['new', 'old'])
  })

  it('creates duplicate titles without collisions', () => {
    expect(createDuplicateSkillTopicTitle('审查', [])).toBe('审查 副本')
    expect(createDuplicateSkillTopicTitle('审查', ['审查 副本'])).toBe('审查 副本 2')
  })

  it('creates reorder updates from dragged and target ids', () => {
    expect(
      createReorderedSkillTopicSortUpdates(
        [
          topic({ id: 'a', sortOrder: 1 }),
          topic({ id: 'b', sortOrder: 2 }),
          topic({ id: 'c', sortOrder: 3 }),
        ],
        'c',
        'a',
      ),
    ).toEqual([
      { id: 'c', sortOrder: 1 },
      { id: 'a', sortOrder: 2 },
      { id: 'b', sortOrder: 3 },
    ])
  })

  it('derives topic titles from local paths', () => {
    expect(getSkillTopicTitleFromPath('/tmp/my-skill/')).toBe('my-skill')
    expect(getSkillTopicTitleFromPath()).toBe('未绑定 Skill')
  })
})
