import type { ChatSession } from '@/shared/types'

export function sortChatSessionsForSidebar(sessions: ChatSession[]) {
  return sessions.filter(isVisibleChatSession).sort((left, right) => {
    const orderDiff =
      getChatSessionSortOrder(left) - getChatSessionSortOrder(right)
    if (orderDiff) return orderDiff
    return right.updatedAt.localeCompare(left.updatedAt)
  })
}

export function isVisibleChatSession(session: ChatSession) {
  return !session.hidden
}

export function createDuplicateChatSessionTitle(
  sourceTitle: string,
  siblingTitles: string[],
) {
  const baseTitle = sourceTitle.trim() || '未命名话题'
  const firstCopy = `${baseTitle} 副本`
  const usedTitles = new Set(siblingTitles.map((title) => title.trim()))
  if (!usedTitles.has(firstCopy)) return firstCopy

  let index = 2
  while (usedTitles.has(`${firstCopy} ${index}`)) index += 1
  return `${firstCopy} ${index}`
}

export function createDuplicateChatSessionSortOrder(
  source: ChatSession,
  siblings: ChatSession[],
) {
  const sorted = sortChatSessionsForSidebar(siblings)
  const sourceIndex = sorted.findIndex((session) => session.id === source.id)
  const sourceOrder = getChatSessionSortOrder(source)
  if (sourceIndex < 0) return sourceOrder + 1

  const nextSession = sorted[sourceIndex + 1]
  if (!nextSession) return sourceOrder + 1

  const nextOrder = getChatSessionSortOrder(nextSession)
  if (nextOrder > sourceOrder) return sourceOrder + (nextOrder - sourceOrder) / 2
  return sourceOrder + 0.001
}

export function createReorderedChatSessionSortUpdates(
  sessions: ChatSession[],
  draggedId: string,
  targetId: string,
) {
  if (draggedId === targetId) return []
  const sorted = sortChatSessionsForSidebar(sessions)
  const draggedIndex = sorted.findIndex((session) => session.id === draggedId)
  const targetIndex = sorted.findIndex((session) => session.id === targetId)
  if (draggedIndex < 0 || targetIndex < 0) return []

  const next = [...sorted]
  const [draggedSession] = next.splice(draggedIndex, 1)
  if (!draggedSession) return []
  next.splice(targetIndex, 0, draggedSession)

  return next.map((session, index) => ({
    id: session.id,
    sortOrder: index + 1,
  }))
}

export function getChatSessionSortOrder(session: ChatSession) {
  if (typeof session.sortOrder === 'number' && Number.isFinite(session.sortOrder)) {
    return session.sortOrder
  }
  const parsed = Date.parse(session.updatedAt || session.createdAt)
  return Number.isFinite(parsed) ? -parsed : 0
}
