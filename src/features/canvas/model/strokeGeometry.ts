import type { CanvasPoint } from '@/shared/types'

export function simplifyPoints(points: CanvasPoint[]) {
  return points.filter((point, index) => {
    if (index === 0 || index === points.length - 1) return true
    const previous = points[index - 1]
    return Math.abs(point.x - previous.x) + Math.abs(point.y - previous.y) > 2
  })
}

export function movePoints(points: CanvasPoint[], delta: CanvasPoint) {
  return points.map((point) => ({
    x: point.x + delta.x,
    y: point.y + delta.y,
  }))
}

export function getStrokeBounds(points: CanvasPoint[], padding: number) {
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const minX = Math.min(...xs) - padding
  const minY = Math.min(...ys) - padding
  const maxX = Math.max(...xs) + padding
  const maxY = Math.max(...ys) + padding

  return {
    height: Math.max(1, maxY - minY),
    minX,
    minY,
    width: Math.max(1, maxX - minX),
  }
}

export function toStrokeViewPoints(points: CanvasPoint[], bounds: { minX: number; minY: number }) {
  return points.map((point) => ({
    x: point.x - bounds.minX,
    y: point.y - bounds.minY,
  }))
}
