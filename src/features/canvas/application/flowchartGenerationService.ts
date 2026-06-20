import { optimizeFullPrompt } from '@/features/prompt-card/application/promptOptimizationService'
import {
  createPromptCard,
  importMarkdownToPromptCard,
} from '@/features/prompt-card/model/prompt'
import { requestCompletionStream } from '@/shared/api/ai'
import { normalizeThinkingMode } from '@/shared/model/thinking'
import type {
  CanvasEdge,
  CanvasPoint,
  CanvasShapeNode,
  DefaultModelSettings,
  PromptCard,
  ProviderConfig,
} from '@/shared/types'
import { createId } from '@/shared/utils/identity'
import { nowIso } from '@/shared/utils/time'
import { createCanvasEdge } from '../model/canvasElements'
import {
  buildPromptNodeInstruction,
  createFlowchartPreviewSignature,
  parseFlowchartJson,
  parseFlowchartJsonPreview,
  type GeneratedFlowchart,
  type GeneratedFlowchartNode,
} from '../model/generatedFlowchart'
import { layoutGeneratedFlowchart, measureGeneratedNode } from '../model/generatedFlowchartLayout'

export { normalizeGeneratedFlowchart, parseFlowchartJson } from '../model/generatedFlowchart'

export interface FlowchartCanvasElements {
  edges: CanvasEdge[]
  promptCards: PromptCard[]
  shapeNodes: CanvasShapeNode[]
}

interface GenerateFlowchartCanvasElementsInput {
  canvasId: string
  edges: CanvasEdge[]
  flowchartProvider: ProviderConfig
  flowchartSettings?: DefaultModelSettings
  instruction: string
  origin: CanvasPoint
  promptCards: PromptCard[]
  promptOptimizationProvider?: ProviderConfig
  promptOptimizationSettings?: DefaultModelSettings
  shapeNodes: CanvasShapeNode[]
  signal?: AbortSignal
  topicSessionId?: string
}

interface GenerateFlowchartStreamInput extends GenerateFlowchartCanvasElementsInput {
  onPhase?: (phase: 'streaming' | 'optimizing') => void
  onPromptPending?: (elements: FlowchartCanvasElements) => void
  onPreview?: (elements: FlowchartCanvasElements) => void
  onText?: (text: string) => void
}

export async function generateFlowchartCanvasElements({
  canvasId,
  edges,
  flowchartProvider,
  flowchartSettings,
  instruction,
  origin,
  promptCards,
  promptOptimizationProvider,
  promptOptimizationSettings,
  signal,
  shapeNodes,
  topicSessionId,
}: GenerateFlowchartCanvasElementsInput): Promise<FlowchartCanvasElements> {
  return generateFlowchartCanvasElementsStream({
    canvasId,
    edges,
    flowchartProvider,
    flowchartSettings,
    instruction,
    origin,
    promptCards,
    promptOptimizationProvider,
    promptOptimizationSettings,
    shapeNodes,
    signal,
    topicSessionId,
  })
}

export async function generateFlowchartCanvasElementsStream({
  canvasId,
  edges,
  flowchartProvider,
  flowchartSettings,
  instruction,
  onPhase,
  onPromptPending,
  onPreview,
  onText,
  origin,
  promptCards,
  promptOptimizationProvider,
  promptOptimizationSettings,
  signal,
  shapeNodes,
  topicSessionId,
}: GenerateFlowchartStreamInput): Promise<FlowchartCanvasElements> {
  const trimmedInstruction = instruction.trim()
  if (!trimmedInstruction) throw new Error('请输入流程图生成需求')

  let streamedOutput = ''
  let lastPreviewSignature = ''
  onPhase?.('streaming')
  const rawOutput = await requestCompletionStream(
    flowchartProvider,
    buildFlowchartGenerationMessages({
      currentCanvas: summarizeCurrentCanvas({ edges, promptCards, shapeNodes }),
      instruction: trimmedInstruction,
      systemPrompt: flowchartSettings?.prompt,
    }),
    {
      onText: (chunk) => {
        streamedOutput += chunk
        onText?.(streamedOutput)
        const preview = parseFlowchartJsonPreview(streamedOutput)
        if (!preview) return
        const signature = createFlowchartPreviewSignature(preview)
        if (signature === lastPreviewSignature) return
        lastPreviewSignature = signature
        onPreview?.(
          materializeFlowchartPreview({
            canvasId,
            flowchart: preview,
            origin,
            topicSessionId,
          }),
        )
      },
    },
    normalizeThinkingMode(flowchartProvider, flowchartSettings?.thinkingMode ?? 'off'),
    signal,
  )
  const flowchart = parseFlowchartJson(rawOutput || streamedOutput)
  if (flowchart.nodes.some((node) => node.kind === 'prompt')) {
    onPhase?.('optimizing')
  }

  return materializeFlowchart({
    canvasId,
    flowchart,
    onPromptPending,
    origin,
    promptOptimizationProvider,
    promptOptimizationSettings,
    signal,
    topicSessionId,
  })
}

export function buildFlowchartGenerationMessages({
  currentCanvas,
  instruction,
  systemPrompt,
}: {
  currentCanvas: string
  instruction: string
  systemPrompt?: string
}) {
  return [
    {
      role: 'system' as const,
      content: systemPrompt?.trim() || '你是流程图结构生成专家，只输出 JSON。',
    },
    {
      role: 'user' as const,
      content: [
        '请根据用户需求生成或修改当前画布流程图。',
        '只能输出 JSON，禁止 Markdown 代码块围栏和解释。',
        'JSON 根对象必须是 {"nodes":[],"edges":[]}。',
        '节点 kind 只能是 step、prompt，禁止输出 decision 或判断节点。',
        'step 必须有清晰 title 和精简 body；step 标题不用自己加序号，系统会自动加【01】。',
        '主流程按 nodes 中 step 的顺序从上到下排列，系统会自动生成步骤主线。',
        '每个 step 可按实际需要连接多个 prompt 节点，prompt 节点表示这个步骤右侧可使用的智能体提示词。',
        'edges 只表达 step 指向 prompt 的归属和顺序，系统会把同一步骤下 prompt 从左到右串成链条。',
        '分支、判断、复杂关系直接写进对应 step 的 body。',
        'body 使用 Markdown 列表，多个要点必须换行，不要把多个 "- xxx" 堆在同一行。',
        '',
        '当前画布上下文：',
        currentCanvas,
        '',
        '用户需求：',
        instruction.trim(),
      ].join('\n'),
    },
  ]
}

async function materializeFlowchart({
  canvasId,
  flowchart,
  origin,
  onPromptPending,
  promptOptimizationProvider,
  promptOptimizationSettings,
  signal,
  topicSessionId,
}: {
  canvasId: string
  flowchart: GeneratedFlowchart
  origin: CanvasPoint
  onPromptPending?: (elements: FlowchartCanvasElements) => void
  promptOptimizationProvider?: ProviderConfig
  promptOptimizationSettings?: DefaultModelSettings
  signal?: AbortSignal
  topicSessionId?: string
}): Promise<FlowchartCanvasElements> {
  const layout = layoutGeneratedFlowchart(flowchart.nodes, flowchart.edges, origin)
  const nodeIdMap = new Map<string, string>()
  const shapeNodes: CanvasShapeNode[] = []
  const promptCards: PromptCard[] = []
  const pendingPromptCards: PromptCard[] = []

  flowchart.nodes.forEach((node) => {
    nodeIdMap.set(node.id, createId())
    if (node.kind === 'prompt') return
    shapeNodes.push(createGeneratedShapeNode({
      canvasId,
      id: nodeIdMap.get(node.id)!,
      node,
      frame: layout.get(node.id),
      position: layout.get(node.id)?.position ?? origin,
      topicSessionId,
    }))
  })

  for (const node of flowchart.nodes.filter((item) => item.kind === 'prompt')) {
    if (!promptOptimizationProvider) {
      throw new Error('请先在设置里配置提示词优化模型')
    }

    const card = createPromptCard(
      canvasId,
      promptCards.length,
      layout.get(node.id)?.position ?? origin,
      topicSessionId,
    )
    nodeIdMap.set(node.id, card.id)
    const pendingCard = createGeneratedPromptCard(card, node, createPromptLoadingMarkdown(node))
    pendingPromptCards.push(pendingCard)
    onPromptPending?.({
      edges: createGeneratedEdges({
        canvasId,
        flowchart,
        nodeIdMap,
        topicSessionId,
      }),
      promptCards: [...pendingPromptCards],
      shapeNodes,
    })
    const markdown = await optimizeFullPrompt({
      instruction: buildPromptNodeInstruction(node),
      promptMarkdown: '',
      provider: promptOptimizationProvider,
      signal,
      systemPrompt: promptOptimizationSettings?.prompt,
      thinkingMode: normalizeThinkingMode(
        promptOptimizationProvider,
        promptOptimizationSettings?.thinkingMode ?? 'off',
      ),
    })

    const generatedCard = createGeneratedPromptCard(card, node, markdown)
    promptCards.push(generatedCard)
    pendingPromptCards[pendingPromptCards.length - 1] = generatedCard
    onPromptPending?.({
      edges: createGeneratedEdges({
        canvasId,
        flowchart,
        nodeIdMap,
        topicSessionId,
      }),
      promptCards: [...pendingPromptCards],
      shapeNodes,
    })
  }

  return {
    edges: createGeneratedEdges({
      canvasId,
      flowchart,
      nodeIdMap,
      topicSessionId,
    }),
    promptCards,
    shapeNodes,
  }
}

function materializeFlowchartPreview({
  canvasId,
  flowchart,
  origin,
  topicSessionId,
}: {
  canvasId: string
  flowchart: GeneratedFlowchart
  origin: CanvasPoint
  topicSessionId?: string
}): FlowchartCanvasElements {
  const layout = layoutGeneratedFlowchart(flowchart.nodes, flowchart.edges, origin, {
    stablePreview: true,
  })
  const nodeIdMap = new Map<string, string>()
  const shapeNodes: CanvasShapeNode[] = []
  const promptCards: PromptCard[] = []

  flowchart.nodes.forEach((node) => {
    const id = `flow-preview-${node.id}`
    nodeIdMap.set(node.id, id)
    const frame = layout.get(node.id)
    if (node.kind === 'prompt') {
      const card = createPromptCard(
        canvasId,
        promptCards.length,
        frame?.position ?? origin,
        topicSessionId,
      )
      promptCards.push({
        ...card,
        id,
        createdAt: 'preview',
        markdown: createPromptLoadingMarkdown(node),
        title: node.title,
        updatedAt: 'preview',
      })
      return
    }

    shapeNodes.push(createGeneratedShapeNode({
      canvasId,
      id,
      node,
      frame,
      position: frame?.position ?? origin,
      topicSessionId,
    }))
  })

  return {
    edges: createGeneratedEdges({
      canvasId,
      flowchart,
      nodeIdMap,
      topicSessionId,
    }),
    promptCards,
    shapeNodes,
  }
}

function createGeneratedEdges({
  canvasId,
  flowchart,
  nodeIdMap,
  topicSessionId,
}: {
  canvasId: string
  flowchart: GeneratedFlowchart
  nodeIdMap: Map<string, string>
  topicSessionId?: string
}) {
  return flowchart.edges.flatMap((edge) => {
    const sourceId = nodeIdMap.get(edge.sourceId)
    const targetId = nodeIdMap.get(edge.targetId)
    const handles = resolveGeneratedEdgeHandles(flowchart, edge)
    return sourceId && targetId
      ? [
          createCanvasEdge(
            canvasId,
            sourceId,
            targetId,
            handles.source,
            handles.target,
            topicSessionId,
          ),
        ]
      : []
  })
}

function resolveGeneratedEdgeHandles(
  flowchart: GeneratedFlowchart,
  edge: { sourceId: string; targetId: string },
) {
  const nodesById = new Map(flowchart.nodes.map((node) => [node.id, node]))
  const source = nodesById.get(edge.sourceId)
  const target = nodesById.get(edge.targetId)

  return target?.kind === 'prompt' && (source?.kind === 'step' || source?.kind === 'prompt')
    ? { source: 'right', target: 'left' }
    : { source: 'bottom', target: 'top' }
}

function createGeneratedPromptCard(
  card: PromptCard,
  node: GeneratedFlowchartNode,
  markdown: string,
) {
  return {
    ...importMarkdownToPromptCard(card, markdown),
    defaultCollapsed: true,
    title: node.title,
  }
}

function createPromptLoadingMarkdown(node: GeneratedFlowchartNode) {
  return [
    '# 生成中',
    '',
    '- 正在根据流程节点生成完整提示词卡片',
    `- 节点：${node.title}`,
    '- 完成后会自动替换为可编辑的 Markdown 提示词',
  ].join('\n')
}

function createGeneratedShapeNode({
  canvasId,
  frame,
  id,
  node,
  position,
  topicSessionId,
}: {
  canvasId: string
  frame?: { height: number; width: number }
  id: string
  node: GeneratedFlowchartNode
  position: CanvasPoint
  topicSessionId?: string
}): CanvasShapeNode {
  const at = nowIso()
  return {
    id,
    body: node.body,
    canvasId,
    createdAt: at,
    height: frame?.height ?? measureGeneratedNode(node).height,
    kind: 'step',
    position,
    title: node.title,
    topicSessionId,
    updatedAt: at,
    width: frame?.width ?? measureGeneratedNode(node).width,
  }
}

function summarizeCurrentCanvas({
  edges,
  promptCards,
  shapeNodes,
}: {
  edges: CanvasEdge[]
  promptCards: PromptCard[]
  shapeNodes: CanvasShapeNode[]
}) {
  return JSON.stringify({
    nodes: [
      ...shapeNodes.map((node) => ({
        id: node.id,
        kind: node.kind,
        title: node.title,
        body: node.body,
      })),
      ...promptCards.map((card) => ({
        id: card.id,
        kind: 'prompt',
        title: card.title,
        body: card.markdown?.slice(0, 900) ?? '',
      })),
    ],
    edges: edges.map((edge) => ({
      sourceId: edge.sourceId,
      targetId: edge.targetId,
    })),
  })
}
