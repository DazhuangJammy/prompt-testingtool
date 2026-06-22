import { Handle, Position } from '@xyflow/react'

const CANVAS_CONNECTION_HANDLES = [
  { id: 'top', position: Position.Top },
  { id: 'left', position: Position.Left },
  { id: 'right', position: Position.Right },
  { id: 'bottom', position: Position.Bottom },
] as const

export function CanvasConnectionHandles() {
  return (
    <>
      {CANVAS_CONNECTION_HANDLES.map(({ id, position }) => (
        <Handle
          key={id}
          id={id}
          className="canvas-connection-handle nodrag nopan"
          position={position}
          type="source"
        />
      ))}
    </>
  )
}
