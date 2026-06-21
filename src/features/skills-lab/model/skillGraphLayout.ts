import { MarkerType, type Edge, type Node } from '@xyflow/react'
import type {
  SkillGraph,
  SkillGraphConfidence,
  SkillGraphEdgeRelation,
  SkillGraphNode,
  SkillGraphNodeType,
} from '@/shared/types'

export interface SkillGraphFlowNodeData extends Record<string, unknown> {
  node: SkillGraphNode
  selectedNodeId?: string
  testFailureNodeId?: string
  onSelect: (nodeId: string) => void
}

export type SkillGraphFlowNode = Node<SkillGraphFlowNodeData, 'skillGraphNode'>

const columnByType: Record<SkillGraphNodeType, number> = {
  main: 0,
  rule: 1,
  reference: 1,
  asset: 2,
  script: 2,
  test: 3,
  folder: 1,
  unknown: 2,
}

const typeOrder: SkillGraphNodeType[] = [
  'main',
  'rule',
  'reference',
  'script',
  'asset',
  'test',
  'folder',
  'unknown',
]

export function createSkillGraphFlowNodes(
  graph: SkillGraph | undefined,
  selectedNodeId: string | undefined,
  testFailureNodeId: string | undefined,
  onSelect: (nodeId: string) => void,
): SkillGraphFlowNode[] {
  if (!graph) return []

  const sortedNodes = [...graph.nodes].sort((left, right) => {
    const columnDiff = columnByType[left.type] - columnByType[right.type]
    if (columnDiff) return columnDiff
    const typeDiff = typeOrder.indexOf(left.type) - typeOrder.indexOf(right.type)
    if (typeDiff) return typeDiff
    return left.label.localeCompare(right.label)
  })
  const columnCounts = new Map<number, number>()

  return sortedNodes.map((node): SkillGraphFlowNode => {
    const column = columnByType[node.type] ?? 2
    const row = columnCounts.get(column) ?? 0
    columnCounts.set(column, row + 1)

    return {
      id: node.id,
      type: 'skillGraphNode',
      position: {
        x: column * 310,
        y: row * 168,
      },
      selected: selectedNodeId === node.id,
      data: {
        node,
        selectedNodeId,
        testFailureNodeId,
        onSelect,
      },
    }
  })
}

export function createSkillGraphFlowEdges(graph: SkillGraph | undefined): Edge[] {
  if (!graph) return []

  return graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.from,
    target: edge.to,
    label: edge.label || getRelationLabel(edge.relation),
    markerEnd: { type: MarkerType.ArrowClosed },
    type: 'smoothstep',
    animated: edge.confidence === 'rule',
    style: {
      stroke: getConfidenceStroke(edge.confidence),
      strokeDasharray: edge.confidence === 'inferred' ? '6 5' : undefined,
      strokeWidth: edge.confidence === 'explicit' ? 1.8 : 1.4,
    },
    labelStyle: {
      fill: 'var(--muted)',
      fontSize: 11,
    },
    labelBgStyle: {
      fill: 'var(--panel)',
      fillOpacity: 0.88,
    },
  }))
}

export function getNodeTypeLabel(type: SkillGraphNodeType) {
  const labels: Record<SkillGraphNodeType, string> = {
    main: '主说明',
    reference: '参考',
    asset: '素材',
    script: '脚本',
    test: '测试',
    rule: '规则',
    folder: '目录',
    unknown: '文件',
  }
  return labels[type]
}

export function getConfidenceLabel(confidence: SkillGraphConfidence) {
  if (confidence === 'explicit') return '明确引用'
  if (confidence === 'rule') return '规则触发'
  return 'AI 推断'
}

export function getRelationLabel(relation: SkillGraphEdgeRelation) {
  const labels: Record<SkillGraphEdgeRelation, string> = {
    reads: '读取',
    uses: '使用',
    runs: '运行',
    triggers: '触发',
    generates: '生成',
    contains: '包含',
    tests: '测试',
    suggests: '建议',
  }
  return labels[relation]
}

function getConfidenceStroke(confidence: SkillGraphConfidence) {
  if (confidence === 'explicit') return 'var(--accent)'
  if (confidence === 'rule') return 'var(--line-strong)'
  return 'var(--muted)'
}
