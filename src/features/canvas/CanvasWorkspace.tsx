import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  SelectionMode,
  ViewportPortal,
  type EdgeChange,
  type Connection,
  type Edge,
  type FinalConnectionState,
  type OnConnect,
  type OnEdgesChange,
  type OnReconnect,
  type OnNodeDrag,
  type OnSelectionChangeFunc,
  useReactFlow,
} from '@xyflow/react'
import { useCallback, useMemo, useState } from 'react'
import {
  deleteCanvasEdge,
  persistCanvasStrokePosition,
  persistPromptNodePosition,
  persistShapeNodePosition,
  persistTextNodePosition,
  reconnectCanvasEdge,
} from '@/features/canvas/application/canvasService'
import { CanvasWorkspaceToolbar } from '@/features/canvas/components/CanvasWorkspaceToolbar'
import { DraftStrokeLayer } from '@/features/canvas/components/DraftStrokeLayer'
import { useCanvasClipboard } from '@/features/canvas/hooks/useCanvasClipboard'
import { useCanvasDeletion } from '@/features/canvas/hooks/useCanvasDeletion'
import { useCanvasElements } from '@/features/canvas/hooks/useCanvasElements'
import { useCanvasFlowState } from '@/features/canvas/hooks/useCanvasFlowState'
import { useDraftStroke } from '@/features/canvas/hooks/useDraftStroke'
import { canvasRepository } from '@/features/canvas/infrastructure/canvasRepository'
import {
  createCanvasEdge,
  createCanvasShapeNode,
  createCanvasTextNode,
} from '@/features/canvas/model/canvasElements'
import { canvasNodeTypes, penColors } from '@/features/canvas/model/canvasWorkspaceRegistry'
import {
  createCanvasFlowEdges,
  createCanvasFlowNodes,
  type CanvasFlowNode,
} from '@/features/canvas/model/canvasFlowMapping'
import { isShapeTool } from '@/features/canvas/model/canvasTools'
import type { CanvasTool } from '@/features/canvas/model/flowTypes'
import {
  areFlowSelectionsEqual,
  emptyFlowSelection,
  toFlowSelectionIds,
  type FlowSelectionIds,
} from '@/features/canvas/model/flowSelection'
import {
  clampTextFontSize,
  defaultTextStyle,
  type CanvasTextStyle,
} from '@/features/canvas/model/textStyle'
import type { PromptCard } from '@/shared/types'

interface CanvasWorkspaceProps {
  effectiveCanvasId?: string
  promptCards: PromptCard[]
  onAddPrompt: (position?: PromptCard['position']) => void
  onDeleteCard: (id: string) => void
  onSelectCard: (id: string) => void
}

export function CanvasWorkspace({
  effectiveCanvasId,
  onAddPrompt,
  onDeleteCard,
  onSelectCard,
  promptCards,
}: CanvasWorkspaceProps) {
  const reactFlow = useReactFlow<CanvasFlowNode, Edge>()
  const [activeTool, setActiveTool] = useState<CanvasTool>('pan')
  const [selectedFlowIds, setSelectedFlowIds] =
    useState<FlowSelectionIds>(emptyFlowSelection)
  const [penColor, setPenColor] = useState(penColors[0].value)
  const [textStyle, setTextStyle] = useState<CanvasTextStyle>(defaultTextStyle)
  const {
    canvasEdges: canvasFlowEdges,
    shapeNodes: canvasShapeNodes,
    strokes: canvasStrokes,
    textNodes: canvasTextNodes,
  } = useCanvasElements(effectiveCanvasId)
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

  const businessNodes = useMemo(
    () =>
      createCanvasFlowNodes({
        promptCards,
        selectedNodeIds: selectedFlowIds.nodes,
        shapeNodes: canvasShapeNodes,
        strokes: canvasStrokes,
        textNodes: canvasTextNodes,
        onSavePromptCard: (nextCard) => {
          void canvasRepository.savePromptCard(nextCard)
        },
        onSelectPrompt: (id) => {
          onSelectCard(id)
        },
        onSelectShape: () => undefined,
        onSelectText: (id) => {
          updateSelection({ edges: [], nodes: [id] })
          const selectedText = canvasTextNodes.find((node) => node.id === id)
          if (selectedText) {
            setTextStyle({
              backgroundColor: selectedText.backgroundColor,
              color: selectedText.color,
              fontSize: selectedText.fontSize,
            })
          }
        },
        onUpdateShape: (id, updates) => {
          void canvasRepository
            .updateShapeNode(id, updates)
            .then(() =>
              effectiveCanvasId
                ? canvasRepository.touchCanvas(effectiveCanvasId)
                : undefined,
            )
        },
        onUpdateText: (id, updates) => {
          void canvasRepository
            .updateTextNode(id, updates)
            .then(() =>
              effectiveCanvasId
                ? canvasRepository.touchCanvas(effectiveCanvasId)
                : undefined,
            )
        },
      }),
    [
      canvasShapeNodes,
      canvasStrokes,
      canvasTextNodes,
      effectiveCanvasId,
      onSelectCard,
      promptCards,
      selectedFlowIds.nodes,
      updateSelection,
    ],
  )
  const businessEdges = useMemo(
    () => createCanvasFlowEdges(canvasFlowEdges),
    [canvasFlowEdges],
  )
  const {
    flowEdges,
    flowNodes,
    handleEdgesChange: updateFlowEdges,
    handleNodeChanges,
  } = useCanvasFlowState({ businessEdges, businessNodes })

  const { draftPoints, handlePointerDown } = useDraftStroke({
    activeTool,
    canvasId: effectiveCanvasId,
    onStart: clearSelection,
    penColor,
    reactFlow,
  })

  const handleNodeDragStop = useCallback<OnNodeDrag<CanvasFlowNode>>(
    (_, node) => {
      if (node.type === 'promptCard') {
        void persistPromptNodePosition(
          node.id,
          node.position,
          promptCards,
          effectiveCanvasId,
        )
        return
      }

      if (node.type === 'freehandStroke') {
        void persistCanvasStrokePosition(
          node.id,
          node.position,
          canvasStrokes,
          effectiveCanvasId,
        )
        return
      }

      if (node.type === 'freeText') {
        void persistTextNodePosition(
          node.id,
          node.position,
          canvasTextNodes,
          effectiveCanvasId,
        )
        return
      }

      void persistShapeNodePosition(
        node.id,
        node.position,
        canvasShapeNodes,
        effectiveCanvasId,
      )
    },
    [
      canvasShapeNodes,
      canvasStrokes,
      canvasTextNodes,
      effectiveCanvasId,
      promptCards,
    ],
  )

  const handleSelectionChange = useCallback<
    OnSelectionChangeFunc<CanvasFlowNode, Edge>
  >(({ edges, nodes }) => {
    updateSelection(toFlowSelectionIds({ edges, nodes }))
    if (nodes.length || edges.length) {
      const selectedPrompt = nodes.find((node) => node.type === 'promptCard')
      if (selectedPrompt) onSelectCard(selectedPrompt.id)
    }
  }, [onSelectCard, updateSelection])

  const handleConnect = useCallback<OnConnect>(
    (connection: Connection) => {
      if (
        !effectiveCanvasId ||
        !connection.source ||
        !connection.target ||
        connection.source === connection.target
      ) {
        return
      }

      void canvasRepository.saveEdge(
        createCanvasEdge(
          effectiveCanvasId,
          connection.source,
          connection.target,
          connection.sourceHandle,
          connection.targetHandle,
        ),
      )
    },
    [effectiveCanvasId],
  )

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

  const handleReconnect = useCallback<OnReconnect<Edge>>(
    (oldEdge, connection) => {
      if (
        !effectiveCanvasId ||
        !connection.source ||
        !connection.target ||
        connection.source === connection.target
      ) {
        return
      }

      void reconnectCanvasEdge(
        oldEdge.id,
        {
          sourceId: connection.source,
          targetId: connection.target,
          sourceHandle: connection.sourceHandle ?? undefined,
          targetHandle: connection.targetHandle ?? undefined,
        },
        effectiveCanvasId,
      )
    },
    [effectiveCanvasId],
  )

  const handleReconnectEnd = useCallback(
    (
      _event: MouseEvent | TouchEvent,
      edge: Edge,
      _handleType: unknown,
      connectionState: FinalConnectionState,
    ) => {
      if (connectionState.toHandle && connectionState.isValid !== false) return

      void deleteCanvasEdge(edge.id, effectiveCanvasId)
      clearSelection()
    },
    [clearSelection, effectiveCanvasId],
  )

  const handlePaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (!effectiveCanvasId) return
      const position = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      if (activeTool === 'prompt') {
        onAddPrompt(position)
        setActiveTool('select')
        return
      }

      if (isShapeTool(activeTool)) {
        void canvasRepository.saveShapeNode(
          createCanvasShapeNode(effectiveCanvasId, activeTool, position),
        )
        setActiveTool('select')
        return
      }

      if (activeTool === 'text') {
        void canvasRepository.saveTextNode(
          createCanvasTextNode(effectiveCanvasId, position, textStyle),
        )
        setActiveTool('select')
        return
      }

      if (activeTool === 'select') {
        clearSelection()
      }
    },
    [activeTool, clearSelection, effectiveCanvasId, onAddPrompt, reactFlow, textStyle],
  )

  const hasSelection = selectedFlowIds.edges.length > 0 || selectedFlowIds.nodes.length > 0
  const selectedTextNode = canvasTextNodes.find((node) =>
    selectedFlowIds.nodes.includes(node.id),
  )
  const activeTextStyle = selectedTextNode
    ? {
        backgroundColor: selectedTextNode.backgroundColor,
        color: selectedTextNode.color,
        fontSize: selectedTextNode.fontSize,
      }
    : textStyle
  const updateTextStyle = useCallback(
    (updates: Partial<CanvasTextStyle>) => {
      const normalizedUpdates = {
        ...updates,
        ...(updates.fontSize === undefined
          ? {}
          : { fontSize: clampTextFontSize(updates.fontSize) }),
      }
      const nextStyle = {
        ...textStyle,
        ...normalizedUpdates,
      }
      setTextStyle(nextStyle)

      if (selectedTextNode) {
        void canvasRepository
          .updateTextNode(selectedTextNode.id, normalizedUpdates)
          .then(() =>
            effectiveCanvasId ? canvasRepository.touchCanvas(effectiveCanvasId) : undefined,
          )
      }
    },
    [effectiveCanvasId, selectedTextNode, textStyle],
  )

  const { deleteSelected, handleDelete } = useCanvasDeletion({
    canvasId: effectiveCanvasId,
    flowNodes,
    onDeleteCard,
    onSelectionClear: clearSelection,
    selectedFlowIds,
  })
  const { updateCursorPosition } = useCanvasClipboard({
    canvasEdges: canvasFlowEdges,
    canvasId: effectiveCanvasId,
    onPasteSelection: (ids) => updateSelection({ edges: [], nodes: ids }),
    onSelectPrompt: onSelectCard,
    promptCards,
    reactFlow,
    selectedFlowIds,
    shapeNodes: canvasShapeNodes,
    strokes: canvasStrokes,
    textNodes: canvasTextNodes,
  })
  const selectTool = useCallback((tool: CanvasTool) => {
    setActiveTool(tool)
    if (tool !== 'select') clearSelection()
  }, [clearSelection])

  return (
    <div className="flow-wrap" onMouseMove={updateCursorPosition}>
      <ReactFlow
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
          updateSelection({ edges: [], nodes: [node.id] })
          if (node.type === 'promptCard') {
            onSelectCard(node.id)
          }
        }}
        onNodeDragStop={handleNodeDragStop}
        onEdgesChange={handleEdgesChange}
        onNodesChange={handleNodeChanges}
        onPaneClick={handlePaneClick}
        onReconnect={handleReconnect}
        onReconnectEnd={handleReconnectEnd}
        onSelectionChange={handleSelectionChange}
        fitView
        minZoom={0.3}
        maxZoom={1.6}
        connectOnClick={false}
        connectionLineStyle={{ stroke: 'var(--ok)', strokeWidth: 2 }}
        deleteKeyCode={['Delete', 'Backspace']}
        connectionMode={ConnectionMode.Loose}
        edgesFocusable
        edgesReconnectable
        nodesConnectable
        nodesFocusable={false}
        panActivationKeyCode={null}
        panOnDrag={activeTool === 'pan'}
        proOptions={{ hideAttribution: true }}
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
        </ViewportPortal>
        <Controls position="bottom-left" showInteractive={false} />
        <MiniMap pannable position="bottom-right" zoomable />
        <Panel position="bottom-center">
          <CanvasWorkspaceToolbar
            activeTool={activeTool}
            canDelete={hasSelection}
            canStyleText={Boolean(selectedTextNode)}
            penColor={penColor}
            penColors={penColors}
            textStyle={activeTextStyle}
            onDeleteSelected={deleteSelected}
            onSelectPenColor={setPenColor}
            onSelectTextStyle={updateTextStyle}
            onSelectTool={selectTool}
          />
        </Panel>
      </ReactFlow>
    </div>
  )
}
