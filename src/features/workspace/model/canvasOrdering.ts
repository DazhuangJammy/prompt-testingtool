import type { Canvas } from '@/shared/types'

export function sortCanvasesForSidebar(canvases: Canvas[]) {
  return [...canvases].sort((left, right) => {
    const orderDiff = getCanvasSortOrder(left) - getCanvasSortOrder(right)
    if (orderDiff) return orderDiff
    const createdDiff = left.createdAt.localeCompare(right.createdAt)
    if (createdDiff) return createdDiff
    return left.id.localeCompare(right.id)
  })
}

export function createReorderedCanvasSortUpdates(
  canvases: Canvas[],
  draggedId: string,
  targetId: string,
) {
  if (draggedId === targetId) return []
  const sorted = sortCanvasesForSidebar(canvases)
  const draggedIndex = sorted.findIndex((canvas) => canvas.id === draggedId)
  const targetIndex = sorted.findIndex((canvas) => canvas.id === targetId)
  if (draggedIndex < 0 || targetIndex < 0) return []

  const next = [...sorted]
  const [draggedCanvas] = next.splice(draggedIndex, 1)
  if (!draggedCanvas) return []
  next.splice(targetIndex, 0, draggedCanvas)

  return next.map((canvas, index) => ({
    id: canvas.id,
    sortOrder: index + 1,
  }))
}

export function getCanvasSortOrder(canvas: Canvas) {
  if (typeof canvas.sortOrder === 'number' && Number.isFinite(canvas.sortOrder)) {
    return canvas.sortOrder
  }
  const parsed = Date.parse(canvas.createdAt)
  return Number.isFinite(parsed) ? parsed : 0
}
