import { CanvasToolbar } from '@/features/canvas/components/CanvasToolbar'
import type { CanvasTool } from '@/features/canvas/model/flowTypes'
import type { CanvasTextStyle } from '@/features/canvas/model/textStyle'
import {
  textBackgroundColors,
  textColors,
} from '@/features/canvas/model/textStyle'

interface CanvasWorkspaceToolbarProps {
  activeTool: CanvasTool
  canDelete: boolean
  canStyleText: boolean
  penColor: string
  penColors: Array<{ label: string; value: string }>
  textStyle: CanvasTextStyle
  onDeleteSelected: () => void
  onSelectPenColor: (color: string) => void
  onSelectTextStyle: (updates: Partial<CanvasTextStyle>) => void
  onSelectTool: (tool: CanvasTool) => void
}

export function CanvasWorkspaceToolbar({
  activeTool,
  canDelete,
  canStyleText,
  onDeleteSelected,
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
      canStyleText={canStyleText}
      penColor={penColor}
      penColors={penColors}
      textBackgroundColor={textStyle.backgroundColor}
      textBackgroundColors={textBackgroundColors}
      textColor={textStyle.color}
      textColors={textColors}
      textFontSize={textStyle.fontSize}
      onDeleteSelected={onDeleteSelected}
      onSelectPenColor={onSelectPenColor}
      onSelectTextBackgroundColor={(color) =>
        onSelectTextStyle({ backgroundColor: color })
      }
      onSelectTextColor={(color) => onSelectTextStyle({ color })}
      onSelectTextFontSize={(fontSize) => onSelectTextStyle({ fontSize })}
      onSelectTool={onSelectTool}
    />
  )
}
