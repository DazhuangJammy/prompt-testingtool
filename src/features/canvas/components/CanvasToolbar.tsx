import {
  Brush,
  GitBranch,
  Hand,
  MousePointer2,
  Plus,
  Square,
  Trash2,
  Type,
} from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { CanvasFrameStyleControls } from '@/features/canvas/components/CanvasFrameStyleControls'
import { IconButton } from '@/shared/ui/IconButton'
import type { CanvasTool } from '@/features/canvas/model/flowTypes'

interface CanvasToolbarProps {
  activeTool: CanvasTool
  canDelete: boolean
  canStyleFrame: boolean
  canStyleText: boolean
  frameBorderColor: string
  frameBorderColors: Array<{ label: string; value: string }>
  frameHighlighted: boolean
  penColor: string
  penColors: Array<{ label: string; value: string }>
  textBackgroundColor: string
  textBackgroundColors: Array<{ label: string; value: string }>
  textColor: string
  textColors: Array<{ label: string; value: string }>
  textFontSize: number
  onDeleteSelected: () => void
  onSelectFrameBorderColor: (color: string) => void
  onSelectPenColor: (color: string) => void
  onSelectTextBackgroundColor: (color: string) => void
  onSelectTextColor: (color: string) => void
  onSelectTextFontSize: (fontSize: number) => void
  onSelectTool: (tool: CanvasTool) => void
  onToggleFrameHighlight: () => void
}

const toolItems: Array<{
  icon: ReactNode
  label: string
  tool: CanvasTool
}> = [
  { icon: <Hand />, label: '拖动画布', tool: 'pan' },
  { icon: <MousePointer2 />, label: '选择', tool: 'select' },
  { icon: <Plus />, label: '提示词', tool: 'prompt' },
  { icon: <Square />, label: '步骤', tool: 'step' },
  { icon: <GitBranch />, label: '判断', tool: 'decision' },
  { icon: <Type />, label: '文本', tool: 'text' },
  { icon: <Brush />, label: '画笔', tool: 'pen' },
]

export function CanvasToolbar({
  activeTool,
  canDelete,
  canStyleFrame,
  canStyleText,
  frameBorderColor,
  frameBorderColors,
  frameHighlighted,
  onDeleteSelected,
  onSelectFrameBorderColor,
  onSelectPenColor,
  onSelectTextBackgroundColor,
  onSelectTextColor,
  onSelectTextFontSize,
  onSelectTool,
  onToggleFrameHighlight,
  penColor,
  penColors,
  textBackgroundColor,
  textBackgroundColors,
  textColor,
  textColors,
  textFontSize,
}: CanvasToolbarProps) {
  const showTextControls = activeTool === 'text' || canStyleText

  return (
    <div className="canvas-toolbar" aria-label="画布工具">
      <div className="canvas-toolbar-group">
        {toolItems.map((item) => (
          <IconButton
            key={item.tool}
            active={activeTool === item.tool}
            icon={item.icon}
            label={item.label}
            onClick={() => onSelectTool(item.tool)}
          />
        ))}
      </div>
      {activeTool === 'pen' && (
        <>
          <div className="canvas-toolbar-separator" />
          <div className="canvas-color-group" aria-label="画笔颜色">
            {penColors.map((color) => (
              <button
                key={color.value}
                type="button"
                className={`canvas-color-button ${
                  penColor === color.value ? 'is-active' : ''
                }`}
                aria-label={color.label}
                data-tooltip={color.label}
                title={color.label}
                style={{ '--swatch': color.value } as CSSProperties}
                onClick={() => onSelectPenColor(color.value)}
              />
            ))}
          </div>
        </>
      )}
      {showTextControls && (
        <>
          <div className="canvas-toolbar-separator" />
          <div className="canvas-color-group" aria-label="文字颜色">
            {textColors.map((color) => (
              <button
                key={color.value}
                type="button"
                className={`canvas-color-button ${
                  textColor === color.value ? 'is-active' : ''
                }`}
                aria-label={color.label}
                data-tooltip={color.label}
                title={color.label}
                style={{ '--swatch': color.value } as CSSProperties}
                onClick={() => onSelectTextColor(color.value)}
              />
            ))}
          </div>
          <div className="canvas-color-group" aria-label="文字背景色">
            {textBackgroundColors.map((color) => (
              <button
                key={color.value}
                type="button"
                className={`canvas-color-button canvas-background-button ${
                  color.value === 'transparent' ? 'is-transparent' : ''
                } ${textBackgroundColor === color.value ? 'is-active' : ''}`}
                aria-label={color.label}
                data-tooltip={color.label}
                title={color.label}
                style={{ '--swatch': color.value } as CSSProperties}
                onClick={() => onSelectTextBackgroundColor(color.value)}
              />
            ))}
          </div>
          <input
            aria-label="字号"
            className="canvas-font-size-input"
            max={72}
            min={10}
            title="字号"
            type="number"
            value={textFontSize}
            onChange={(event) => {
              const nextSize = Number(event.target.value)
              if (Number.isFinite(nextSize)) onSelectTextFontSize(nextSize)
            }}
          />
        </>
      )}
      {canStyleFrame && (
        <>
          <div className="canvas-toolbar-separator" />
          <CanvasFrameStyleControls
            borderColor={frameBorderColor}
            borderColors={frameBorderColors}
            highlighted={frameHighlighted}
            onSelectBorderColor={onSelectFrameBorderColor}
            onToggleHighlight={onToggleFrameHighlight}
          />
        </>
      )}
      <div className="canvas-toolbar-separator" />
      <IconButton
        disabled={!canDelete}
        icon={<Trash2 />}
        label="删除"
        onClick={onDeleteSelected}
      />
    </div>
  )
}
