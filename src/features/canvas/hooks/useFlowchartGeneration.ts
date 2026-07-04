import type { Edge, ReactFlowInstance } from '@xyflow/react'
import { useCallback, useRef, useState } from 'react'
import {
  generateFlowchartCanvasElementsStream,
  type FlowchartCanvasElements,
} from '@/features/canvas/application/flowchartGenerationService'
import { canvasRepository } from '@/features/canvas/infrastructure/canvasRepository'
import {
  createCanvasFlowEdges,
  createCanvasFlowNodes,
  type CanvasFlowNode,
} from '@/features/canvas/model/canvasFlowMapping'
import type { FlowSelectionIds } from '@/features/canvas/model/flowSelection'
import type {
  CanvasEdge,
  CanvasShapeNode,
  DefaultModelSettings,
  PromptCard,
  ProviderConfig,
} from '@/shared/types'

interface UseFlowchartGenerationInput {
  canvasEdges: CanvasEdge[]
  canvasId?: string
  flowchartProvider?: ProviderConfig
  flowchartSettings?: DefaultModelSettings
  onSelectionChange: (selection: FlowSelectionIds) => void
  promptCards: PromptCard[]
  promptOptimizationProvider?: ProviderConfig
  promptOptimizationSettings?: DefaultModelSettings
  reactFlow: ReactFlowInstance<CanvasFlowNode, Edge>
  shapeNodes: CanvasShapeNode[]
  topicSessionId?: string
}

type GenerationStatus = 'idle' | 'streaming' | 'optimizing' | 'saving'

export function useFlowchartGeneration({
  canvasEdges,
  canvasId,
  flowchartProvider,
  flowchartSettings,
  onSelectionChange,
  promptCards,
  promptOptimizationProvider,
  promptOptimizationSettings,
  reactFlow,
  shapeNodes,
  topicSessionId,
}: UseFlowchartGenerationInput) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [error, setError] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>('idle')
  const [hasPreview, setHasPreview] = useState(false)
  const abortControllerRef = useRef<AbortController | undefined>(undefined)

  const closeDialog = useCallback(() => {
    setDialogOpen(false)
    setError('')
  }, [])

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort()
    setGenerating(false)
    setGenerationStatus('idle')
    setHasPreview(false)
    setDialogOpen(false)
    clearPreviewNodes(reactFlow)
  }, [reactFlow])

  const openDialog = useCallback(() => {
    setDialogOpen(true)
    setError('')
  }, [])

  const submit = useCallback(
    async (instruction: string) => {
      if (!canvasId) {
        setError('请先选择一个画布')
        return
      }
      if (!flowchartProvider) {
        setError('请先在设置里配置流程图模型')
        return
      }

      setGenerating(true)
      setGenerationStatus('streaming')
      setHasPreview(false)
      setError('')
      setDialogOpen(false)
      const abortController = new AbortController()
      abortControllerRef.current = abortController
      clearPreviewNodes(reactFlow)
      try {
        const elements = await generateFlowchartCanvasElementsStream({
          canvasId,
          edges: canvasEdges,
          flowchartProvider,
          flowchartSettings,
          instruction,
          origin: getViewportOrigin(reactFlow),
          promptCards,
          promptOptimizationProvider,
          promptOptimizationSettings,
          shapeNodes,
          signal: abortController.signal,
          topicSessionId,
          onPhase: (phase) => setGenerationStatus(phase),
          onPromptPending: (preview) => {
            setHasPreview(true)
            renderPreviewNodes(reactFlow, preview, {
              promptOptimizationProvider,
              promptOptimizationSettings,
            })
          },
          onPreview: (preview) => {
            setHasPreview(true)
            renderPreviewNodes(reactFlow, preview, {
              promptOptimizationProvider,
              promptOptimizationSettings,
            })
          },
          onText: () => undefined,
        })

        setGenerationStatus('saving')
        await saveGeneratedElements(canvasId, elements)
        clearPreviewNodes(reactFlow)
        onSelectionChange({
          edges: [],
          nodes: [
            ...elements.shapeNodes.map((node) => node.id),
            ...elements.promptCards.map((card) => card.id),
          ],
        })
        setDialogOpen(false)
      } catch (cause) {
        clearPreviewNodes(reactFlow)
        if (isAbortError(cause)) {
          setError('')
          return
        }
        setError(cause instanceof Error ? cause.message : '流程图生成失败')
      } finally {
        abortControllerRef.current = undefined
        setGenerating(false)
        setGenerationStatus('idle')
        setHasPreview(false)
      }
    },
    [
      canvasEdges,
      canvasId,
      flowchartProvider,
      flowchartSettings,
      onSelectionChange,
      promptCards,
      promptOptimizationProvider,
      promptOptimizationSettings,
      reactFlow,
      shapeNodes,
      topicSessionId,
    ],
  )

  return {
    closeDialog,
    dialogOpen,
    error,
    generationStatus,
    generating,
    hasPreview,
    openDialog,
    stopGeneration,
    submit,
  }
}

function getViewportOrigin(reactFlow: ReactFlowInstance<CanvasFlowNode, Edge>) {
  return reactFlow.screenToFlowPosition({
    x: window.innerWidth / 2 - 260,
    y: window.innerHeight / 2 - 120,
  })
}

async function saveGeneratedElements(
  canvasId: string,
  elements: FlowchartCanvasElements,
) {
  await canvasRepository.savePastedElements({
    canvasId,
    edges: elements.edges,
    imageNodes: [],
    inputCards: [],
    promptCards: elements.promptCards,
    shapeNodes: elements.shapeNodes,
    strokes: [],
    textNodes: [],
  })
}

function renderPreviewNodes(
  reactFlow: ReactFlowInstance<CanvasFlowNode, Edge>,
  elements: FlowchartCanvasElements,
  options: Pick<
    Parameters<typeof createCanvasFlowNodes>[0],
    'promptOptimizationProvider' | 'promptOptimizationSettings'
  >,
) {
  const previewElements = toPreviewElements(elements)
  const previewNodes = createCanvasFlowNodes({
    ...options,
    imageNodes: [],
    inputCards: [],
    onSavePromptCard: () => undefined,
    onSaveInputCard: () => undefined,
    onSelectInputCard: () => undefined,
    onSelectImage: () => undefined,
    onSelectPrompt: () => undefined,
    onSelectShape: () => undefined,
    onSelectStroke: () => undefined,
    onSelectText: () => undefined,
    onUpdateImage: () => undefined,
    onUpdateShape: () => undefined,
    onUpdateText: () => undefined,
    promptCards: previewElements.promptCards,
    selectedNodeIds: [],
    shapeNodes: previewElements.shapeNodes,
    strokes: [],
    textNodes: [],
  }).map((node) => ({
    ...node,
    draggable: false,
    selectable: false,
  }))
  const previewEdges = createCanvasFlowEdges(previewElements.edges).map((edge) => ({
    ...edge,
    id: `flow-preview-edge-${edge.id}`,
    reconnectable: false,
    selectable: false,
  }))

  reactFlow.setNodes((nodes) => [
    ...nodes.filter((node) => !isPreviewId(node.id)),
    ...previewNodes,
  ])
  reactFlow.setEdges((edges) => [
    ...edges.filter((edge) => !isPreviewId(edge.id)),
    ...previewEdges,
  ])
}

function toPreviewElements(elements: FlowchartCanvasElements): FlowchartCanvasElements {
  const idMap = new Map<string, string>()
  const mapId = (id: string) => {
    const existing = idMap.get(id)
    if (existing) return existing
    const next = isPreviewId(id) ? id : `flow-preview-${id}`
    idMap.set(id, next)
    return next
  }

  return {
    edges: elements.edges.map((edge) => ({
      ...edge,
      id: mapId(edge.id),
      sourceId: mapId(edge.sourceId),
      targetId: mapId(edge.targetId),
    })),
    promptCards: elements.promptCards.map((card) => ({
      ...card,
      id: mapId(card.id),
    })),
    shapeNodes: elements.shapeNodes.map((node) => ({
      ...node,
      id: mapId(node.id),
    })),
  }
}

function clearPreviewNodes(reactFlow: ReactFlowInstance<CanvasFlowNode, Edge>) {
  reactFlow.setNodes((nodes) => nodes.filter((node) => !isPreviewId(node.id)))
  reactFlow.setEdges((edges) => edges.filter((edge) => !isPreviewId(edge.id)))
}

function isPreviewId(id: string) {
  return id.startsWith('flow-preview')
}

function isAbortError(cause: unknown) {
  return cause instanceof DOMException && cause.name === 'AbortError'
}
