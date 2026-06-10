import type { CanvasTool } from '@/features/canvas/model/flowTypes'

export type ShapeTool = Extract<CanvasTool, 'decision' | 'step'>

export function isShapeTool(tool: CanvasTool): tool is ShapeTool {
  return tool === 'step' || tool === 'decision'
}
