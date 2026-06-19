import { CanvasToolbar } from '@/features/canvas/components/CanvasToolbar'
import type { CanvasTool } from '@/features/canvas/model/flowTypes'
import type { CanvasTextStyle } from '@/features/canvas/model/textStyle'
import {
  textBackgroundColors,
  textColors,
} from '@/features/canvas/model/textStyle'
import { frameBorderColors, type CanvasFrameStyle } from '@/shared/model/nodeFrameStyle'

interface CanvasWorkspaceToolbarProps {
  activeTool: CanvasTool
  canDelete: boolean
  canStyleFrame: boolean
  canStyleText: boolean
  frameStyle: CanvasFrameStyle
  penColor: string
  penColors: Array<{ label: string; value: string }>
  textStyle: CanvasTextStyle
  onDeleteSelected: () => void
  onSelectFrameStyle: (updates: Partial<CanvasFrameStyle>) => void
  onSelectPenColor: (color: string) => void
  onSelectTextStyle: (updates: Partial<CanvasTextStyle>) => void
  onSelectTool: (tool: CanvasTool) => void
}

export function CanvasWorkspaceToolbar({
  activeTool,
  canDelete,
  canStyleFrame,
  canStyleText,
  frameStyle,
  onDeleteSelected,
  onSelectFrameStyle,
  onSelectPenColor,
  onSelectTextStyle,
  onSelectTool,
  penColor,
  penColors,
  textStyle,
}: CanvasWorkspaceToolbarProps) {
  return (
    <CanvasToolbar
      activeTool={activeTool}
      canDelete={canDelete}
      canStyleFrame={canStyleFrame}
      canStyleText={canStyleText}
      frameBorderColor={frameStyle.borderColor}
      frameBorderColors={frameBorderColors}
      frameHighlighted={frameStyle.highlighted}
      penColor={penColor}
      penColors={penColors}
      textBackgroundColor={textStyle.backgroundColor}
      textBackgroundColors={textBackgroundColors}
      textColor={textStyle.color}
      textColors={textColors}
      textFontSize={textStyle.fontSize}
      onDeleteSelected={onDeleteSelected}
      onSelectFrameBorderColor={(borderColor) => onSelectFrameStyle({ borderColor })}
      onSelectPenColor={onSelectPenColor}
      onSelectTextBackgroundColor={(color) =>
        onSelectTextStyle({ backgroundColor: color })
      }
      onSelectTextColor={(color) => onSelectTextStyle({ color })}
      onSelectTextFontSize={(fontSize) => onSelectTextStyle({ fontSize })}
      onSelectTool={onSelectTool}
      onToggleFrameHighlight={() =>
        onSelectFrameStyle({ highlighted: !frameStyle.highlighted })
      }
    />
  )
}
