export type CollapsedCanvasIdSet = Set<string>

const storageKey = 'prompt-sidebar-collapsed-canvas-ids'

export function getCollapsedCanvasIdsStorageKey() {
  return storageKey
}

export function normalizeCollapsedCanvasIds(value: unknown) {
  if (!Array.isArray(value)) return []

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  )
}

export function readStoredCollapsedCanvasIds() {
  try {
    return new Set(
      normalizeCollapsedCanvasIds(
        JSON.parse(localStorage.getItem(storageKey) ?? '[]'),
      ),
    )
  } catch {
    return new Set<string>()
  }
}

export function writeStoredCollapsedCanvasIds(ids: CollapsedCanvasIdSet) {
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify(Array.from(ids).sort((left, right) => left.localeCompare(right))),
    )
  } catch {
    // Storage can be unavailable in restricted browser modes.
  }
}

export function toggleCollapsedCanvasId(
  current: CollapsedCanvasIdSet,
  canvasId: string,
) {
  const normalizedCanvasId = canvasId.trim()
  if (!normalizedCanvasId) return current

  const next = new Set(current)
  if (next.has(normalizedCanvasId)) next.delete(normalizedCanvasId)
  else next.add(normalizedCanvasId)
  return next
}
