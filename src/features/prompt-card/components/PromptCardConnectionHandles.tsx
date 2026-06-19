import { Handle, Position } from '@xyflow/react'

const PROMPT_CARD_HANDLES = [
  { id: 'top', position: Position.Top },
  { id: 'left', position: Position.Left },
  { id: 'right', position: Position.Right },
  { id: 'bottom', position: Position.Bottom },
] as const

export function PromptCardConnectionHandles() {
  return (
    <>
      {PROMPT_CARD_HANDLES.map(({ id, position }) => (
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
