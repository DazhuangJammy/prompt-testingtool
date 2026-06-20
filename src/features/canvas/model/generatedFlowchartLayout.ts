import type { CanvasPoint } from '@/shared/types'

export interface FlowchartLayoutNode {
  body: string
  id: string
  kind: 'step' | 'prompt'
  parentStepId?: string
  title: string
}

export interface FlowchartNodeFrame {
  height: number
  position: CanvasPoint
  width: number
}

interface LayoutOptions {
  stablePreview?: boolean
}

const STEP_WIDTH = 300
const PROMPT_WIDTH = 420
const MIN_STEP_HEIGHT = 132
const STABLE_PREVIEW_STEP_HEIGHT = 176
const STABLE_PREVIEW_PROMPT_HEIGHT = 220
const MAIN_GAP_Y = 92
const PROMPT_GAP_X = 170
const PROMPT_CHAIN_GAP_X = 140
const PROMPT_GAP_Y = 22
const NODE_VERTICAL_PADDING = 42
const TITLE_HEIGHT = 24
const BODY_LINE_HEIGHT = 26
const BODY_BLOCK_GAP = 8
const BODY_HEIGHT_BUFFER = 28

export function layoutGeneratedFlowchart(
  nodes: FlowchartLayoutNode[],
  edges: Array<{ sourceId: string; targetId: string }>,
  origin: CanvasPoint,
  options: LayoutOptions = {},
) {
  const frames = new Map<string, FlowchartNodeFrame>()
  const mainNodes = nodes.filter((node) => node.kind !== 'prompt')
  const promptNodesByStep = groupPromptNodesByStep(nodes, edges)
  let y = origin.y

  mainNodes.forEach((node) => {
    const frame = options.stablePreview
      ? measureStablePreviewNode(node)
      : measureGeneratedNode(node)
    frames.set(node.id, {
      ...frame,
      position: { x: origin.x, y },
    })

    const prompts = promptNodesByStep.get(node.id) ?? []
    const promptFrames = prompts.map((prompt) =>
      options.stablePreview
        ? measureStablePreviewNode(prompt)
        : measureGeneratedNode(prompt),
    )
    prompts.forEach((prompt, index) => {
      const promptFrame = promptFrames[index]
      frames.set(prompt.id, {
        ...promptFrame,
        position: {
          x:
            origin.x +
            frame.width +
            PROMPT_GAP_X +
            index * (PROMPT_WIDTH + PROMPT_CHAIN_GAP_X),
          y,
        },
      })
    })

    y += Math.max(
      frame.height,
      ...promptFrames.map((promptFrame) => promptFrame.height),
    ) + MAIN_GAP_Y
  })

  const unplacedPrompts = nodes.filter(
    (node) => node.kind === 'prompt' && !frames.has(node.id),
  )
  unplacedPrompts.forEach((node, index) => {
    const frame = options.stablePreview
      ? measureStablePreviewNode(node)
      : measureGeneratedNode(node)
    frames.set(node.id, {
      ...frame,
      position: {
        x: origin.x + STEP_WIDTH + PROMPT_GAP_X,
        y: origin.y + index * (frame.height + PROMPT_GAP_Y),
      },
    })
  })

  return frames
}

export function measureGeneratedNode(node: FlowchartLayoutNode) {
  const width = node.kind === 'prompt' ? PROMPT_WIDTH : STEP_WIDTH
  const bodyLines = estimateBodyLines(node.body, node.kind === 'prompt' ? 32 : 18)
  const blockGaps = Math.max(0, normalizeFlowBody(node.body).split('\n').filter(Boolean).length - 1)
  const height = Math.max(
    MIN_STEP_HEIGHT,
    NODE_VERTICAL_PADDING +
      TITLE_HEIGHT +
      bodyLines * BODY_LINE_HEIGHT +
      blockGaps * BODY_BLOCK_GAP +
      BODY_HEIGHT_BUFFER,
  )

  return {
    height: roundToGrid(height),
    width,
  }
}

function measureStablePreviewNode(node: FlowchartLayoutNode) {
  return {
    height: node.kind === 'prompt' ? STABLE_PREVIEW_PROMPT_HEIGHT : STABLE_PREVIEW_STEP_HEIGHT,
    width: node.kind === 'prompt' ? PROMPT_WIDTH : STEP_WIDTH,
  }
}

export function normalizeFlowBody(value: string) {
  const lines = value
    .split(/\r?\n/)
    .flatMap((line) => splitInlineList(line))
    .map((line) => line.trim())
    .filter(Boolean)

  return lines.join('\n')
}

function groupPromptNodesByStep(
  nodes: FlowchartLayoutNode[],
  edges: Array<{ sourceId: string; targetId: string }>,
) {
  const nodesById = new Map(nodes.map((node) => [node.id, node]))
  const result = new Map<string, FlowchartLayoutNode[]>()

  nodes.forEach((node) => {
    if (node.kind !== 'prompt') return
    const parentStepId = 'parentStepId' in node && typeof node.parentStepId === 'string'
      ? node.parentStepId
      : undefined
    if (!parentStepId || !nodesById.has(parentStepId)) return
    result.set(parentStepId, [...(result.get(parentStepId) ?? []), node])
  })

  edges.forEach((edge) => {
    const source = nodesById.get(edge.sourceId)
    const target = nodesById.get(edge.targetId)
    if (source?.kind !== 'step' || target?.kind !== 'prompt') return
    if ((result.get(source.id) ?? []).some((node) => node.id === target.id)) return
    result.set(source.id, [...(result.get(source.id) ?? []), target])
  })

  return new Map(
    [...result.entries()].map(([stepId, prompts]) => [
      stepId,
      orderPromptNodesByChain(stepId, prompts, edges),
    ]),
  )
}

function orderPromptNodesByChain(
  stepId: string,
  prompts: FlowchartLayoutNode[],
  edges: Array<{ sourceId: string; targetId: string }>,
) {
  const promptById = new Map(prompts.map((prompt) => [prompt.id, prompt]))
  const ordered: FlowchartLayoutNode[] = []
  const used = new Set<string>()
  let nextId = edges.find((edge) => edge.sourceId === stepId && promptById.has(edge.targetId))
    ?.targetId

  while (nextId && promptById.has(nextId) && !used.has(nextId)) {
    ordered.push(promptById.get(nextId)!)
    used.add(nextId)
    nextId = edges.find((edge) => edge.sourceId === nextId && promptById.has(edge.targetId))
      ?.targetId
  }

  prompts.forEach((prompt) => {
    if (!used.has(prompt.id)) ordered.push(prompt)
  })
  return ordered
}

function estimateBodyLines(value: string, charactersPerLine: number) {
  const lines = normalizeFlowBody(value).split('\n').filter(Boolean)
  if (!lines.length) return 1

  return lines.reduce(
    (count, line) => count + Math.max(1, Math.ceil(line.length / charactersPerLine)),
    0,
  )
}

function splitInlineList(line: string) {
  const trimmed = line.trim()
  if (!trimmed) return []
  const parts = trimmed.split(/\s+(?=[-*]\s+)/)
  return parts.length > 1 ? parts : [trimmed]
}

function roundToGrid(value: number) {
  return Math.ceil(value / 8) * 8
}
