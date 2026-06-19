import { ControlButton } from '@xyflow/react'
import { AlignCenterHorizontal } from 'lucide-react'

interface CanvasLayoutControlsProps {
  disabled: boolean
  onArrange: () => void
}

export function CanvasLayoutControls({
  disabled,
  onArrange,
}: CanvasLayoutControlsProps) {
  return (
    <ControlButton
      aria-label="微整理布局"
      className="canvas-arrange-control"
      disabled={disabled}
      onClick={onArrange}
      title="微整理布局"
      type="button"
    >
      <AlignCenterHorizontal aria-hidden="true" />
    </ControlButton>
  )
}
