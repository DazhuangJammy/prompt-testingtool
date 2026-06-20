import { Panel } from '@xyflow/react'
import { FlowchartGenerationDialog } from '@/features/canvas/components/FlowchartGenerationDialog'
import { CanvasWorkspaceToolbar } from '@/features/canvas/components/CanvasWorkspaceToolbar'
import type { CanvasTool } from '@/features/canvas/model/flowTypes'
import type { CanvasTextStyle } from '@/features/canvas/model/textStyle'
import type { CanvasFrameStyle } from '@/shared/model/nodeFrameStyle'
import type { CanvasToolShortcuts } from '@/shared/model/canvasToolShortcuts'

interface FlowchartGenerationState {
  closeDialog: () => void
  dialogOpen: boolean
  error: string
  generationStatus: 'idle' | 'streaming' | 'optimizing' | 'saving'
  generating: boolean
  hasPreview: boolean
  openDialog: () => void
  stopGeneration: () => void
  submit: (instruction: string) => void
}

interface CanvasWorkspaceControlsProps {
  activeFrameStyle: CanvasFrameStyle
  activeTextStyle: CanvasTextStyle
  activeTool: CanvasTool
  canDelete: boolean
  canStyleFrame: boolean
  canStyleText: boolean
  flowchartGeneration: FlowchartGenerationState
  penColor: string
  penColors: Array<{ label: string; value: string }>
  toolShortcuts: CanvasToolShortcuts
  onDeleteSelected: () => void
  onSelectFrameStyle: (updates: Partial<CanvasFrameStyle>) => void
  onSelectPenColor: (color: string) => void
  onSelectTextStyle: (updates: Partial<CanvasTextStyle>) => void
  onSelectTool: (tool: CanvasTool) => void
}

export function CanvasWorkspaceControls({
  activeFrameStyle,
  activeTextStyle,
  activeTool,
  canDelete,
  canStyleFrame,
  canStyleText,
  flowchartGeneration,
  onDeleteSelected,
  onSelectFrameStyle,
  onSelectPenColor,
  onSelectTextStyle,
  onSelectTool,
  penColor,
  penColors,
  toolShortcuts,
}: CanvasWorkspaceControlsProps) {
  return (
    <>
      <Panel position="bottom-center">
        <CanvasWorkspaceToolbar
          activeTool={activeTool}
          canDelete={canDelete}
          canStyleFrame={canStyleFrame}
          canStyleText={canStyleText}
          frameStyle={activeFrameStyle}
          flowchartGenerating={flowchartGeneration.generating}
          penColor={penColor}
          penColors={penColors}
          textStyle={activeTextStyle}
          toolShortcuts={toolShortcuts}
          onDeleteSelected={onDeleteSelected}
          onOpenFlowchartGenerator={flowchartGeneration.openDialog}
          onSelectFrameStyle={onSelectFrameStyle}
          onSelectPenColor={onSelectPenColor}
          onSelectTextStyle={onSelectTextStyle}
          onSelectTool={onSelectTool}
        />
      </Panel>
      {flowchartGeneration.generating && (
        <Panel position="top-center">
          <div className="flowchart-generation-live-status" role="status">
            {!flowchartGeneration.hasPreview && (
              <span className="flowchart-generator-spinner" aria-hidden="true" />
            )}
            <span>
              {flowchartGeneration.hasPreview
                ? '正在实时生成流程图'
                : statusText[flowchartGeneration.generationStatus]}
            </span>
            <button type="button" onClick={flowchartGeneration.stopGeneration}>
              停止
            </button>
          </div>
        </Panel>
      )}
      <FlowchartGenerationDialog
        error={flowchartGeneration.error}
        generating={flowchartGeneration.generating}
        open={flowchartGeneration.dialogOpen}
        onClose={flowchartGeneration.closeDialog}
        onSubmit={flowchartGeneration.submit}
      />
    </>
  )
}

const statusText = {
  idle: '等待生成',
  optimizing: '正在生成提示词节点',
  saving: '正在保存到画布',
  streaming: '正在读取流程结构',
} as const
