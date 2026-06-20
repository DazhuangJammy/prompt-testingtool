import { normalizeFlowBody } from './generatedFlowchartLayout'

export type GeneratedFlowNodeKind = 'step' | 'prompt'

interface RawFlowchartNode {
  body?: unknown
  id?: unknown
  kind?: unknown
  promptInstruction?: unknown
  title?: unknown
}

interface RawFlowchartEdge {
  sourceId?: unknown
  targetId?: unknown
}

export interface GeneratedFlowchartNode {
  body: string
  id: string
  kind: GeneratedFlowNodeKind
  parentStepId?: string
  promptInstruction?: string
  title: string
}

export interface GeneratedFlowchartEdge {
  sourceId: string
  targetId: string
}

export interface GeneratedFlowchart {
  edges: GeneratedFlowchartEdge[]
  nodes: GeneratedFlowchartNode[]
}

export function parseFlowchartJson(output: string): GeneratedFlowchart {
  const text = extractJsonText(stripThinkingBlocks(output))
  const parsed = JSON.parse(text) as {
    edges?: RawFlowchartEdge[]
    nodes?: RawFlowchartNode[]
  }

  return normalizeGeneratedFlowchart(parsed)
}

export function parseFlowchartJsonPreview(output: string) {
  const nodes = extractPartialArrayObjects<RawFlowchartNode>(
    stripThinkingBlocks(output),
    'nodes',
  )
  if (!nodes.length) return undefined
  const edges = extractPartialArrayObjects<RawFlowchartEdge>(output, 'edges')

  try {
    return normalizeGeneratedFlowchart({ nodes, edges })
  } catch {
    return undefined
  }
}

export function normalizeGeneratedFlowchart(input: {
  edges?: RawFlowchartEdge[]
  nodes?: RawFlowchartNode[]
}): GeneratedFlowchart {
  if (!Array.isArray(input.nodes)) throw new Error('模型没有返回 nodes')

  const idMap = new Map<string, string>()
  const nodes: GeneratedFlowchartNode[] = []

  input.nodes.forEach((node, index) => {
    const kind = normalizeKind(node.kind)
    if (!kind) return

    const originalId = asText(node.id) || `${kind}-${index + 1}`
    const id = createStableNodeId(originalId, idMap)
    const baseNode: GeneratedFlowchartNode = {
      body: normalizeFlowBody(asText(node.body) || fallbackBody(kind)),
      id,
      kind,
      title: asText(node.title) || fallbackTitle(kind, index),
    }

    if (kind === 'step') {
      baseNode.title = formatStepTitle(baseNode.title, countKind(nodes, 'step') + 1)
    }
    if (kind === 'prompt') {
      const instruction = asText(node.promptInstruction) || baseNode.body
      baseNode.promptInstruction = instruction || `生成${baseNode.title}提示词`
    }

    nodes.push(baseNode)
  })
  const validIds = new Set(nodes.map((node) => node.id))
  const edges = dedupeEdges(
    (input.edges ?? []).flatMap((edge) => {
      const sourceId = idMap.get(asText(edge.sourceId)) ?? ''
      const targetId = idMap.get(asText(edge.targetId)) ?? ''
      if (!sourceId || !targetId || sourceId === targetId) return []
      if (!validIds.has(sourceId) || !validIds.has(targetId)) return []
      return [{ sourceId, targetId }]
    }),
  )

  return enforceGeneratedFlowchart({ edges, nodes })
}

export function createFlowchartPreviewSignature(flowchart: GeneratedFlowchart) {
  return JSON.stringify({
    edges: flowchart.edges,
    nodes: flowchart.nodes.map(({ body, id, kind, parentStepId, title }) => ({
      body,
      id,
      kind,
      parentStepId,
      title,
    })),
  })
}

export function buildPromptNodeInstruction(node: GeneratedFlowchartNode) {
  return [
    node.promptInstruction,
    '',
    '流程节点标题：',
    node.title,
    '',
    '流程节点说明：',
    node.body,
    '',
    '请从零生成一张完整提示词卡片。',
  ].join('\n')
}

function enforceGeneratedFlowchart(flowchart: GeneratedFlowchart): GeneratedFlowchart {
  const nodesById = new Map(flowchart.nodes.map((node) => [node.id, node]))
  const stepNodes = flowchart.nodes.filter((node) => node.kind === 'step')
  const promptIdsByStep = new Map<string, string[]>()
  const promptParentById = new Map<string, string>()

  const addPromptToStep = (stepId: string, promptId: string) => {
    if (promptParentById.has(promptId)) return false
    const current = promptIdsByStep.get(stepId) ?? []

    promptParentById.set(promptId, stepId)
    promptIdsByStep.set(stepId, [...current, promptId])
    return true
  }

  flowchart.edges.forEach((edge) => {
    const source = nodesById.get(edge.sourceId)
    const target = nodesById.get(edge.targetId)
    if (source?.kind !== 'step' || target?.kind !== 'prompt') return

    addPromptToStep(source.id, target.id)
  })

  let changed = true
  while (changed) {
    changed = false
    flowchart.edges.forEach((edge) => {
      const source = nodesById.get(edge.sourceId)
      const target = nodesById.get(edge.targetId)
      if (source?.kind !== 'prompt' || target?.kind !== 'prompt') return

      const parentStepId = promptParentById.get(source.id)
      if (!parentStepId || promptParentById.has(target.id)) return
      if (addPromptToStep(parentStepId, target.id)) changed = true
    })
  }

  const keptNodes = flowchart.nodes
    .map((node) =>
      node.kind === 'prompt'
        ? { ...node, parentStepId: promptParentById.get(node.id) }
        : node,
    )
  return {
    nodes: keptNodes.filter(
      (node) => node.kind !== 'prompt' || Boolean(node.parentStepId),
    ),
    edges: [...createSequentialStepEdges(stepNodes), ...createPromptChainEdges(promptIdsByStep)],
  }
}

function createSequentialStepEdges(stepNodes: GeneratedFlowchartNode[]) {
  return stepNodes.slice(1).map((node, index) => ({
    sourceId: stepNodes[index].id,
    targetId: node.id,
  }))
}

function createPromptChainEdges(promptIdsByStep: Map<string, string[]>) {
  return [...promptIdsByStep.entries()].flatMap(([stepId, promptIds]) =>
    promptIds.map((promptId, index) => ({
      sourceId: index === 0 ? stepId : promptIds[index - 1],
      targetId: promptId,
    })),
  )
}

function formatStepTitle(title: string, index: number) {
  const body = title.replace(/^【\d+】\s*/, '').trim() || '步骤'
  return `【${String(index).padStart(2, '0')}】${body}`
}

function countKind(nodes: GeneratedFlowchartNode[], kind: GeneratedFlowNodeKind) {
  return nodes.filter((node) => node.kind === kind).length
}

function dedupeEdges(edges: GeneratedFlowchartEdge[]) {
  return [...new Map(edges.map((edge) => [`${edge.sourceId}:${edge.targetId}`, edge])).values()]
}

function createStableNodeId(value: string, idMap: Map<string, string>) {
  const base = slugify(value) || 'node'
  let candidate = base
  let index = 2
  while ([...idMap.values()].includes(candidate)) {
    candidate = `${base}-${index}`
    index += 1
  }
  idMap.set(value, candidate)
  return candidate
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeKind(value: unknown): GeneratedFlowNodeKind | undefined {
  return value === 'step' || value === 'prompt' ? value : undefined
}

function asText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function fallbackTitle(kind: GeneratedFlowNodeKind, index: number) {
  if (kind === 'prompt') return `提示词 ${index + 1}`
  return '步骤'
}

function fallbackBody(kind: GeneratedFlowNodeKind) {
  if (kind === 'prompt') return '生成该环节需要使用的智能体提示词。'
  return '执行该步骤需要完成的事项。'
}

function extractJsonText(output: string) {
  const trimmed = output.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*\n([\s\S]*?)\n?```$/i)
  const candidate = (fenced?.[1] ?? trimmed).trim()
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) throw new Error('模型没有返回 JSON')
  return candidate.slice(start, end + 1)
}

function extractPartialArrayObjects<T>(output: string, key: string) {
  const keyIndex = output.search(new RegExp(`"${key}"\\s*:`))
  if (keyIndex === -1) return []
  const arrayStart = output.indexOf('[', keyIndex)
  if (arrayStart === -1) return []

  const objects: T[] = []
  let depth = 0
  let start = -1
  let inString = false
  let escaped = false

  for (let index = arrayStart + 1; index < output.length; index += 1) {
    const char = output[index]
    if (escaped) {
      escaped = false
      continue
    }
    if (char === '\\') {
      escaped = inString
      continue
    }
    if (char === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (char === ']' && depth === 0) break
    if (char === '{') {
      if (depth === 0) start = index
      depth += 1
    }
    if (char === '}') {
      depth -= 1
      if (depth === 0 && start !== -1) {
        const objectText = output.slice(start, index + 1)
        try {
          objects.push(JSON.parse(objectText) as T)
        } catch {
          return objects
        }
        start = -1
      }
    }
  }

  return objects
}

function stripThinkingBlocks(content: string) {
  return content.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '')
}
