import { Highlighter } from 'lucide-react'
import type { CSSProperties } from 'react'
import { normalizeFrameColorInput } from '@/shared/model/nodeFrameStyle'
import { IconButton } from '@/shared/ui/IconButton'

interface CanvasFrameStyleControlsProps {
  borderColor: string
  borderColors: Array<{ label: string; value: string }>
  highlighted: boolean
  onSelectBorderColor: (color: string) => void
  onToggleHighlight: () => void
}

export function CanvasFrameStyleControls({
  borderColor,
  borderColors,
  highlighted,
  onSelectBorderColor,
  onToggleHighlight,
}: CanvasFrameStyleControlsProps) {
  return (
    <>
      <IconButton
        active={highlighted}
        className="canvas-highlight-button"
        icon={<Highlighter />}
        label={highlighted ? '取消高亮' : '高亮'}
        onClick={onToggleHighlight}
      />
      <div className="canvas-color-group" aria-label="外边框颜色">
        {borderColors.map((color) => (
          <button
            key={color.value}
            type="button"
            className={`canvas-color-button canvas-frame-color-button ${
              borderColor === color.value ? 'is-active' : ''
            }`}
            aria-label={color.label}
            data-tooltip={color.label}
            title={color.label}
            style={{ '--swatch': color.value } as CSSProperties}
            onClick={() => onSelectBorderColor(color.value)}
          />
        ))}
        <input
          aria-label="自定义边框颜色"
          className="canvas-custom-color-input"
          title="自定义边框颜色"
          type="color"
          value={normalizeFrameColorInput(borderColor)}
          onChange={(event) => onSelectBorderColor(event.target.value)}
        />
      </div>
    </>
  )
}
