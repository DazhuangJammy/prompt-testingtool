import type { NodeProps } from '@xyflow/react'
import { memo } from 'react'
import type { CanvasStrokeFlowNode } from '@/features/canvas/model/flowTypes'

function FreehandStrokeNode({ data }: NodeProps<CanvasStrokeFlowNode>) {
  const { bounds, selectedNodeId, stroke, viewPoints } = data
  const selected = selectedNodeId === stroke.id
  const path = pointsToPath(viewPoints)

  return (
    <svg
      className={`stroke-node ${selected ? 'is-selected' : ''}`}
      height={bounds.height}
      viewBox={`0 0 ${bounds.width} ${bounds.height}`}
      width={bounds.width}
    >
      <path
        className="stroke-node-hit"
        d={path}
        fill="none"
        stroke="transparent"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={Math.max(18, stroke.strokeWidth + 12)}
      />
      <path
        className="stroke-node-visible"
        d={path}
        fill="none"
        stroke={stroke.color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={stroke.strokeWidth}
      />
    </svg>
  )
}

function pointsToPath(points: Array<{ x: number; y: number }>) {
  const [first, ...rest] = points
  if (!first) return ''
  return rest.reduce(
    (path, point) => `${path} L ${point.x} ${point.y}`,
    `M ${first.x} ${first.y}`,
  )
}

export default memo(FreehandStrokeNode)
