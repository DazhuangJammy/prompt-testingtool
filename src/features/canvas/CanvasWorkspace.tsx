import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  SelectionMode,
  ViewportPortal,
  type EdgeChange,
  type Edge,
  type OnEdgesChange,
  type OnSelectionChangeFunc,
  useReactFlow,
} from '@xyflow/react'
import { useCallback, useMemo, useState } from 'react'
import { CanvasAlignmentGuides } from '@/features/canvas/components/CanvasAlignmentGuides'
import { CanvasLayoutControls } from '@/features/canvas/components/CanvasLayoutControls'
import { CanvasWorkspaceControls } from '@/features/canvas/components/CanvasWorkspaceControls'
import { DraftStrokeLayer } from '@/features/canvas/components/DraftStrokeLayer'
import { useCanvasAlignment } from '@/features/canvas/hooks/useCanvasAlignment'
import { useCanvasBusinessNodes } from '@/features/canvas/hooks/useCanvasBusinessNodes'
import { useCanvasClipboard } from '@/features/canvas/hooks/useCanvasClipboard'
import { useCanvasConnectionHandlers } from '@/features/canvas/hooks/useCanvasConnectionHandlers'
import { useCanvasDeletion } from '@/features/canvas/hooks/useCanvasDeletion'
import { useCanvasFlowState } from '@/features/canvas/hooks/useCanvasFlowState'
import { useCanvasFrameStyle } from '@/features/canvas/hooks/useCanvasFrameStyle'
import { useCanvasNodePersistence } from '@/features/canvas/hooks/useCanvasNodePersistence'
import { useCanvasPaneClick } from '@/features/canvas/hooks/useCanvasPaneClick'
import { useFlowchartGeneration } from '@/features/canvas/hooks/useFlowchartGeneration'
import { useScopedCanvasRecords } from '@/features/canvas/hooks/useScopedCanvasRecords'
import { useCanvasToolKeyboardShortcuts } from '@/features/canvas/hooks/useCanvasToolKeyboardShortcuts'
import { useCanvasTextStyle } from '@/features/canvas/hooks/useCanvasTextStyle'
import { useCanvasViewportPersistence } from '@/features/canvas/hooks/useCanvasViewportPersistence'
import { useDraftStroke } from '@/features/canvas/hooks/useDraftStroke'
import type { CanvasWorkspaceProps } from '@/features/canvas/CanvasWorkspace.types'
import { canvasNodeTypes, penColors } from '@/features/canvas/model/canvasWorkspaceRegistry'
import { createCanvasFlowEdges, type CanvasFlowNode } from '@/features/canvas/model/canvasFlowMapping'
import type { CanvasTool } from '@/features/canvas/model/flowTypes'
import {
  areFlowSelectionsEqual,
  emptyFlowSelection,
  toFlowSelectionIds,
  type FlowSelectionIds,
} from '@/features/canvas/model/flowSelection'

const reactFlowConnectionLineStyle = { stroke: 'var(--accent)', strokeWidth: 2 }
const reactFlowDeleteKeyCode = ['Delete', 'Backspace']
const reactFlowProOptions = { hideAttribution: true }
const createReactFlowScopeKey = (canvasId?: string, sessionId?: string) =>
  `${canvasId ?? 'canvas'}:${sessionId ?? 'workspace'}`

export function CanvasWorkspace({
  activeSessionId,
  activeSessionCreatedAt,
  activeSessionPromptCardId,
  effectiveCanvasId,
  flowchartProvider,
  flowchartSettings,
  onAddInputCard,
  onAddPrompt,
  onDeleteCard,
  onDeleteInputCard,
  onSelectCard,
  promptOptimizationProvider,
  promptOptimizationSettings,
  toolShortcuts,
  promptCards,
}: CanvasWorkspaceProps) {
  const reactFlow = useReactFlow<CanvasFlowNode, Edge>()
  const canvasViewport = useCanvasViewportPersistence({
    canvasId: effectiveCanvasId,
    reactFlow,
    sessionId: activeSessionId,
  })
  const [activeTool, setActiveTool] = useState<CanvasTool>('pan')
  const [selectedFlowIds, setSelectedFlowIds] =
    useState<FlowSelectionIds>(emptyFlowSelection)
  const [penColor, setPenColor] = useState(penColors[0].value)
  const scopedRecords = useScopedCanvasRecords({
    canvasId: effectiveCanvasId,
    promptCardId: activeSessionPromptCardId,
    promptCards,
    sessionId: activeSessionId,
    sessionCreatedAt: activeSessionCreatedAt,
  })
  const canvasFlowEdges = scopedRecords.canvasEdges
  const canvasImageNodes = scopedRecords.canvasImageNodes
  const inputCards = scopedRecords.inputCards
  const canvasShapeNodes = scopedRecords.canvasShapeNodes
  const canvasStrokes = scopedRecords.canvasStrokes
  const canvasTextNodes = scopedRecords.canvasTextNodes
  const scopedPromptCards = scopedRecords.promptCards
  const updateSelection = useCallback((nextSelection: FlowSelectionIds) => {
    setSelectedFlowIds((currentSelection) =>
      areFlowSelectionsEqual(currentSelection, nextSelection)
        ? currentSelection
        : nextSelection,
    )
  }, [])
  const clearSelection = useCallback(
    () => updateSelection(emptyFlowSelection),
    [updateSelection],
  )
  const nodePersistence = useCanvasNodePersistence({
    canvasId: effectiveCanvasId,
    imageNodes: canvasImageNodes,
    inputCards,
    promptCards: scopedPromptCards,
    shapeNodes: canvasShapeNodes,
    strokes: canvasStrokes,
    textNodes: canvasTextNodes,
  })
  const {
    activeTextStyle,
    canStyleText,
    setTextStyle,
    textStyle,
    updateTextStyle,
  } = useCanvasTextStyle({
    canvasId: effectiveCanvasId,
    selectedNodeIds: selectedFlowIds.nodes,
    textNodes: canvasTextNodes,
  })

  const businessNodes = useCanvasBusinessNodes({
    imageNodes: canvasImageNodes,
    inputCards,
    nodePersistence,
    onSelectCard,
    promptCards: scopedPromptCards,
    promptOptimizationProvider,
    promptOptimizationSettings,
    selectedNodeIds: selectedFlowIds.nodes,
    setSelectedFlowIds,
    setTextStyle,
    shapeNodes: canvasShapeNodes,
    strokes: canvasStrokes,
    textNodes: canvasTextNodes,
  })
  const businessEdges = useMemo(
    () => createCanvasFlowEdges(canvasFlowEdges),
    [canvasFlowEdges],
  )
  const {
    flowEdges,
    flowNodes,
    handleEdgesChange: updateFlowEdges,
    handleNodeChanges,
    setFlowNodes,
  } = useCanvasFlowState({ businessEdges, businessNodes })
  const getFlowNode = useCallback(
    (nodeId: string) => reactFlow.getNode(nodeId) as CanvasFlowNode | undefined,
    [reactFlow],
  )
  const canvasAlignment = useCanvasAlignment({
    flowEdges,
    flowNodes,
    getNode: getFlowNode,
    onPersistNode: nodePersistence.persistNodePosition,
    selectedNodeIds: selectedFlowIds.nodes,
    setFlowNodes,
  })

  const { draftPoints, handlePointerDown } = useDraftStroke({
    activeTool,
    canvasId: effectiveCanvasId,
    topicSessionId: activeSessionId,
    onStart: clearSelection,
    penColor,
    reactFlow,
  })

  const handleSelectionChange = useCallback<
    OnSelectionChangeFunc<CanvasFlowNode, Edge>
  >(({ edges, nodes }) => {
    updateSelection(toFlowSelectionIds({ edges, nodes }))
    if (nodes.length || edges.length) {
      const selectedPrompt = nodes.find((node) => node.type === 'promptCard')
      if (selectedPrompt) onSelectCard(selectedPrompt.id)
    }
  }, [onSelectCard, updateSelection])

  const handleEdgesChange = useCallback<OnEdgesChange<Edge>>(
    (changes: EdgeChange<Edge>[]) => {
      updateFlowEdges(changes)
      changes.forEach((change) => {
        if (change.type === 'select') {
          setSelectedFlowIds((current) => ({
            edges: change.selected
              ? [...new Set([...current.edges, change.id])]
              : current.edges.filter((id) => id !== change.id),
            nodes: change.selected ? [] : current.nodes,
          }))
        }
      })
    },
    [updateFlowEdges],
  )

  const { handleConnect, handleReconnect, handleReconnectEnd } =
    useCanvasConnectionHandlers({
      canvasId: effectiveCanvasId,
      onClearSelection: clearSelection,
      topicSessionId: activeSessionId,
    })

  const selectTool = useCallback((tool: CanvasTool) => {
    setActiveTool(tool)
    if (tool !== 'select') clearSelection()
  }, [clearSelection])
  const {
    activateShortcutScope,
    deactivateShortcutScope,
    handleShortcutKeyDown,
    shortcutScopeRef,
  } = useCanvasToolKeyboardShortcuts({
    onSelectTool: selectTool,
    shortcuts: toolShortcuts,
  })

  const handlePaneClick = useCanvasPaneClick({
    activeTool,
    canvasId: effectiveCanvasId,
    topicSessionId: activeSessionId,
    onActivateShortcuts: activateShortcutScope,
    onAddInputCard,
    onAddPrompt,
    onClearSelection: clearSelection,
    onSelectTool: selectTool,
    screenToFlowPosition: reactFlow.screenToFlowPosition,
    textStyle,
  })

  const hasSelection = selectedFlowIds.edges.length > 0 || selectedFlowIds.nodes.length > 0
  const { activeFrameStyle, canStyleFrame, updateFrameStyle } = useCanvasFrameStyle({
    canvasId: effectiveCanvasId,
    inputCards,
    promptCards: scopedPromptCards,
    selectedNodeIds: selectedFlowIds.nodes,
    shapeNodes: canvasShapeNodes,
    textNodes: canvasTextNodes,
  })

  const { deleteSelected, handleDelete } = useCanvasDeletion({
    canvasId: effectiveCanvasId,
    flowNodes,
    onDeleteCard,
    onDeleteInputCard,
    onSelectionClear: clearSelection,
    selectedFlowIds,
  })
  const { updateCursorPosition } = useCanvasClipboard({
    canvasEdges: canvasFlowEdges,
    canvasId: effectiveCanvasId,
    onPasteSelection: (ids) => updateSelection({ edges: [], nodes: ids }),
    onSelectPrompt: onSelectCard,
    inputCards,
    promptCards: scopedPromptCards,
    reactFlow,
    selectedFlowIds,
    shapeNodes: canvasShapeNodes,
    strokes: canvasStrokes,
    imageNodes: canvasImageNodes,
    textNodes: canvasTextNodes,
    topicSessionId: activeSessionId,
  })
  const flowchartGeneration = useFlowchartGeneration({
    canvasEdges: canvasFlowEdges,
    canvasId: effectiveCanvasId,
    flowchartProvider,
    flowchartSettings,
    onSelectionChange: updateSelection,
    promptCards: scopedPromptCards,
    promptOptimizationProvider,
    promptOptimizationSettings,
    reactFlow,
    shapeNodes: canvasShapeNodes,
    topicSessionId: activeSessionId,
  })

  return (
    <div
      ref={shortcutScopeRef}
      className="flow-wrap"
      tabIndex={-1}
      onKeyDown={handleShortcutKeyDown}
      onMouseMove={updateCursorPosition}
    >
      <ReactFlow
        key={createReactFlowScopeKey(effectiveCanvasId, activeSessionId)}
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={canvasNodeTypes}
        onConnect={handleConnect}
        onDelete={handleDelete}
        onEdgeClick={(event, edge) => {
          event.stopPropagation()
          updateSelection({ edges: [edge.id], nodes: [] })
        }}
        onNodeClick={(_, node) => {
          deactivateShortcutScope()
          updateSelection({ edges: [], nodes: [node.id] })
          if (node.type === 'promptCard') {
            onSelectCard(node.id)
          }
        }}
        onNodeDrag={canvasAlignment.handleNodeDrag}
        onNodeDragStop={canvasAlignment.handleNodeDragStop}
        onEdgesChange={handleEdgesChange}
        onNodesChange={handleNodeChanges}
        onPaneClick={handlePaneClick}
        onReconnect={handleReconnect}
        onReconnectEnd={handleReconnectEnd}
        onSelectionChange={handleSelectionChange}
        defaultViewport={canvasViewport.defaultViewport}
        fitView={!canvasViewport.hasStoredViewport}
        minZoom={0.3}
        maxZoom={1.6}
        onMoveEnd={canvasViewport.handleMoveEnd}
        connectOnClick={false}
        connectionLineStyle={reactFlowConnectionLineStyle}
        deleteKeyCode={reactFlowDeleteKeyCode}
        connectionMode={ConnectionMode.Loose}
        edgesFocusable
        edgesReconnectable
        nodesConnectable
        nodesFocusable={false}
        panActivationKeyCode={null}
        panOnDrag={activeTool === 'pan'}
        proOptions={reactFlowProOptions}
        selectionMode={SelectionMode.Partial}
        selectionOnDrag={activeTool === 'select'}
        zoomActivationKeyCode={null}
      >
        <Background
          color="var(--canvas-dot)"
          gap={22}
          size={1}
          variant={BackgroundVariant.Dots}
        />
        {activeTool === 'pen' && (
          <div
            className="canvas-pen-capture"
            onPointerDown={handlePointerDown}
          />
        )}
        <ViewportPortal>
          <DraftStrokeLayer points={draftPoints} />
          <CanvasAlignmentGuides guides={canvasAlignment.alignmentGuides} />
        </ViewportPortal>
        <Controls position="bottom-left" showInteractive={false}>
          <CanvasLayoutControls
            disabled={flowEdges.length === 0}
            onArrange={canvasAlignment.arrangeCanvas}
          />
        </Controls>
        <MiniMap pannable position="bottom-right" zoomable />
        <CanvasWorkspaceControls
          activeFrameStyle={activeFrameStyle}
          activeTextStyle={activeTextStyle}
          activeTool={activeTool}
          canDelete={hasSelection}
          canStyleFrame={canStyleFrame}
          canStyleText={canStyleText}
          flowchartGeneration={flowchartGeneration}
          penColor={penColor}
          penColors={penColors}
          toolShortcuts={toolShortcuts}
          onDeleteSelected={deleteSelected}
          onSelectFrameStyle={updateFrameStyle}
          onSelectPenColor={setPenColor}
          onSelectTextStyle={updateTextStyle}
          onSelectTool={selectTool}
        />
      </ReactFlow>
    </div>
  )
}
