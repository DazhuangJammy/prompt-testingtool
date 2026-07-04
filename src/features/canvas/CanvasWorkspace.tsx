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
  type NodeMouseHandler,
  type OnEdgesChange,
  type OnSelectionChangeFunc,
  useReactFlow,
} from '@xyflow/react'
import { Group, Ungroup } from 'lucide-react'
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
import { canvasRepository } from '@/features/canvas/infrastructure/canvasRepository'
import type { CanvasWorkspaceProps } from '@/features/canvas/CanvasWorkspace.types'
import {
  createCanvasGroupAssignments,
  createCanvasGroupLookup,
  expandCanvasNodeIdsByGroups,
  getCanvasFlowSelectionBounds,
  resolveCanvasGroupAction,
} from '@/features/canvas/model/canvasGrouping'
import { canvasNodeTypes, penColors } from '@/features/canvas/model/canvasWorkspaceRegistry'
import { createCanvasFlowEdges, type CanvasFlowNode } from '@/features/canvas/model/canvasFlowMapping'
import type { CanvasTool } from '@/features/canvas/model/flowTypes'
import {
  areFlowSelectionsEqual,
  emptyFlowSelection,
  replaceSelectedFlowItems,
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
  const groupingElements = useMemo(
    () => ({
      imageNodes: canvasImageNodes,
      inputCards,
      promptCards: scopedPromptCards,
      shapeNodes: canvasShapeNodes,
      strokes: canvasStrokes,
      textNodes: canvasTextNodes,
    }),
    [
      canvasImageNodes,
      canvasShapeNodes,
      canvasStrokes,
      canvasTextNodes,
      inputCards,
      scopedPromptCards,
    ],
  )
  const groupLookup = useMemo(
    () => createCanvasGroupLookup(groupingElements),
    [groupingElements],
  )
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
  const syncFlowNodeSelection = useCallback(
    (nodeIds: string[]) => {
      reactFlow.setNodes((nodes) => replaceSelectedFlowItems(nodes, nodeIds))
      reactFlow.setEdges((edges) => replaceSelectedFlowItems(edges, []))
    },
    [reactFlow],
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
    groupLookup,
    nodePersistence,
    onSelectCard,
    onSyncFlowSelection: syncFlowNodeSelection,
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
  const selectedGroupAction = useMemo(
    () => resolveCanvasGroupAction(selectedFlowIds.nodes, groupLookup),
    [groupLookup, selectedFlowIds.nodes],
  )
  const selectionBounds = useMemo(
    () => getCanvasFlowSelectionBounds(flowNodes, selectedFlowIds.nodes),
    [flowNodes, selectedFlowIds.nodes],
  )
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
    const nextSelection = toFlowSelectionIds({ edges, nodes })
    updateSelection({
      edges: nextSelection.edges,
      nodes: expandCanvasNodeIdsByGroups(nextSelection.nodes, groupLookup),
    })
    if (nodes.length || edges.length) {
      const selectedPrompt = nodes.find((node) => node.type === 'promptCard')
      if (selectedPrompt) onSelectCard(selectedPrompt.id)
    }
  }, [groupLookup, onSelectCard, updateSelection])

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

  const handleApplyGroupAction = useCallback(() => {
    if (!selectedGroupAction) return

    const assignments = createCanvasGroupAssignments({
      elements: groupingElements,
      groupId:
        selectedGroupAction.kind === 'group' ? crypto.randomUUID() : undefined,
      nodeIds: selectedFlowIds.nodes,
    })

    void canvasRepository.updateCanvasGroupAssignments(effectiveCanvasId, assignments)
  }, [
    effectiveCanvasId,
    groupingElements,
    selectedFlowIds.nodes,
    selectedGroupAction,
  ])

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

  const handleNodeClick = useCallback<NodeMouseHandler<CanvasFlowNode>>(
    (_, node) => {
      deactivateShortcutScope()
      updateSelection({
        edges: [],
        nodes: expandCanvasNodeIdsByGroups([node.id], groupLookup),
      })
      if (node.type === 'promptCard') {
        onSelectCard(node.id)
      }
    },
    [deactivateShortcutScope, groupLookup, onSelectCard, updateSelection],
  )

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
        onNodeClick={handleNodeClick}
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
          {selectedGroupAction && selectionBounds && (
            <div
              className="canvas-selection-group-toolbar nodrag nopan"
              style={{
                transform: `translate(${selectionBounds.x + selectionBounds.width / 2}px, ${
                  selectionBounds.y - 44
                }px)`,
              }}
            >
              <button type="button" onClick={handleApplyGroupAction}>
                {selectedGroupAction.kind === 'group' ? (
                  <Group aria-hidden="true" />
                ) : (
                  <Ungroup aria-hidden="true" />
                )}
                <span>
                  {selectedGroupAction.kind === 'group' ? '组合' : '解除组合'}
                </span>
              </button>
            </div>
          )}
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
