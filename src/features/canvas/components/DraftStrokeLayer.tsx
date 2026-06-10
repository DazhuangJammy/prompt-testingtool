import type { CanvasPoint } from '@/shared/types'

interface DraftStrokeLayerProps {
  points: CanvasPoint[]
}

export function DraftStrokeLayer({ points }: DraftStrokeLayerProps) {
  if (points.length < 2) return null

  return (
    <svg
      className="draft-stroke-layer"
      viewBox="-10000 -10000 20000 20000"
    >
      <path
        d={pointsToPath(points)}
        fill="none"
        stroke="var(--text)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={3}
      />
    </svg>
  )
}

function pointsToPath(points: CanvasPoint[]) {
  const [first, ...rest] = points
  if (!first) return ''

  return rest.reduce(
    (path, point) => `${path} L ${point.x} ${point.y}`,
    `M ${first.x} ${first.y}`,
  )
}
