import type { SkillTopic } from '@/shared/types'

export function sortSkillTopicsForSidebar(topics: SkillTopic[]) {
  return [...topics].sort((left, right) => {
    const orderDiff = getSkillTopicSortOrder(left) - getSkillTopicSortOrder(right)
    if (orderDiff) return orderDiff
    return right.updatedAt.localeCompare(left.updatedAt)
  })
}

export function createDuplicateSkillTopicTitle(
  sourceTitle: string,
  siblingTitles: string[],
) {
  const baseTitle = sourceTitle.trim() || '未命名 Skills 话题'
  const firstCopy = `${baseTitle} 副本`
  const usedTitles = new Set(siblingTitles.map((title) => title.trim()))
  if (!usedTitles.has(firstCopy)) return firstCopy

  let index = 2
  while (usedTitles.has(`${firstCopy} ${index}`)) index += 1
  return `${firstCopy} ${index}`
}

export function createReorderedSkillTopicSortUpdates(
  topics: SkillTopic[],
  draggedId: string,
  targetId: string,
) {
  if (draggedId === targetId) return []
  const sorted = sortSkillTopicsForSidebar(topics)
  const draggedIndex = sorted.findIndex((topic) => topic.id === draggedId)
  const targetIndex = sorted.findIndex((topic) => topic.id === targetId)
  if (draggedIndex < 0 || targetIndex < 0) return []

  const next = [...sorted]
  const [draggedTopic] = next.splice(draggedIndex, 1)
  if (!draggedTopic) return []
  next.splice(targetIndex, 0, draggedTopic)

  return next.map((topic, index) => ({
    id: topic.id,
    sortOrder: index + 1,
  }))
}

export function getSkillTopicSortOrder(topic: SkillTopic) {
  if (typeof topic.sortOrder === 'number' && Number.isFinite(topic.sortOrder)) {
    return topic.sortOrder
  }
  const parsed = Date.parse(topic.updatedAt || topic.createdAt)
  return Number.isFinite(parsed) ? -parsed : 0
}

export function getSkillTopicTitleFromPath(skillPath?: string) {
  if (!skillPath) return '未绑定 Skill'
  const normalized = skillPath.replace(/\/+$/, '')
  return normalized.split('/').filter(Boolean).at(-1) || normalized || '未绑定 Skill'
}
