import type { QuickPhrase, QuickPhraseGroup } from '@/shared/types'
import { createId } from '@/shared/utils/identity'
import { nowIso } from '@/shared/utils/time'

export const QUICK_PHRASE_ALL_GROUP_ID = 'all'
export const QUICK_PHRASE_DEFAULT_GROUP_ID = 'default'
export const QUICK_PHRASE_DEFAULT_GROUP_LABEL = '默认'

export interface QuickPhraseDraft {
  title: string
  content: string
  groupId?: string
}

export interface QuickPhraseGroupDraft {
  name: string
}

export function createQuickPhraseGroup(
  draft: QuickPhraseGroupDraft,
  sortOrder = 0,
): QuickPhraseGroup {
  const at = nowIso()
  return normalizeQuickPhraseGroup({
    id: createId(),
    name: draft.name,
    sortOrder,
    createdAt: at,
    updatedAt: at,
  })
}

export function createQuickPhrase(
  draft: QuickPhraseDraft,
  sortOrder = 0,
): QuickPhrase {
  const at = nowIso()
  return normalizeQuickPhrase({
    id: createId(),
    title: draft.title,
    content: draft.content,
    groupId: draft.groupId,
    sortOrder,
    createdAt: at,
    updatedAt: at,
  })
}

export function normalizeQuickPhraseGroup(
  group: QuickPhraseGroup,
): QuickPhraseGroup {
  return {
    ...group,
    name: normalizeQuickPhraseGroupName(group.name),
    sortOrder: normalizeSortOrder(group.sortOrder),
  }
}

export function normalizeQuickPhrase(phrase: QuickPhrase): QuickPhrase {
  return {
    ...phrase,
    title: phrase.title.trim(),
    content: phrase.content.trim(),
    groupId: normalizeGroupId(phrase.groupId),
    sortOrder: normalizeSortOrder(phrase.sortOrder),
  }
}

export function normalizeQuickPhraseGroupName(name: string) {
  return name.trim()
}

export function sortQuickPhraseGroups(groups: QuickPhraseGroup[]) {
  return [...groups].map(normalizeQuickPhraseGroup).sort(compareByOrderAndTime)
}

export function sortQuickPhrases(phrases: QuickPhrase[]) {
  return [...phrases].map(normalizeQuickPhrase).sort(compareByOrderAndTime)
}

export function filterQuickPhrasesByGroup(
  phrases: QuickPhrase[],
  groupId: string,
) {
  const sorted = sortQuickPhrases(phrases)
  if (groupId === QUICK_PHRASE_ALL_GROUP_ID) return sorted
  if (groupId === QUICK_PHRASE_DEFAULT_GROUP_ID) {
    return sorted.filter((phrase) => !phrase.groupId)
  }
  return sorted.filter((phrase) => phrase.groupId === groupId)
}

export function getQuickPhraseGroupLabel(
  groups: QuickPhraseGroup[],
  groupId?: string,
) {
  if (!groupId) return QUICK_PHRASE_DEFAULT_GROUP_LABEL
  return (
    groups.find((group) => group.id === groupId)?.name ??
    QUICK_PHRASE_DEFAULT_GROUP_LABEL
  )
}

export function getNextSortOrder(items: Array<{ sortOrder?: number }>) {
  if (!items.length) return 1
  return Math.max(...items.map((item) => normalizeSortOrder(item.sortOrder))) + 1
}

function normalizeGroupId(groupId: string | undefined) {
  const next = groupId?.trim()
  if (!next || next === QUICK_PHRASE_DEFAULT_GROUP_ID) return undefined
  return next
}

function normalizeSortOrder(sortOrder: number | undefined) {
  return Number.isFinite(sortOrder) ? sortOrder! : 0
}

function compareByOrderAndTime<T extends { sortOrder?: number; createdAt: string }>(
  left: T,
  right: T,
) {
  const order = normalizeSortOrder(left.sortOrder) - normalizeSortOrder(right.sortOrder)
  if (order !== 0) return order
  return left.createdAt.localeCompare(right.createdAt)
}
