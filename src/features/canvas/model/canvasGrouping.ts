import type { CanvasFlowNode } from '@/features/canvas/model/canvasFlowMapping'
import type {
  CanvasImageNode,
  InputCard,
  CanvasShapeNode,
  CanvasStroke,
  CanvasTextNode,
  PromptCard,
} from '@/shared/types'

const DEFAULT_PROMPT_WIDTH = 420
const DEFAULT_PROMPT_HEIGHT = 320
const DEFAULT_TEXT_HEIGHT = 96
const DEFAULT_NODE_SIZE = 180

export type CanvasGroupableNodeKind =
  | 'canvasImage'
  | 'flowShape'
  | 'freeText'
  | 'freehandStroke'
  | 'inputCard'
  | 'promptCard'

export interface CanvasGroupableNodeRef {
  groupId?: string
  id: string
  kind: CanvasGroupableNodeKind
}

export interface CanvasGroupLookup {
  groupIdByNodeId: Map<string, string>
  nodeIdsByGroupId: Map<string, string[]>
  nodeRefsById: Map<string, CanvasGroupableNodeRef>
}

export interface CanvasGroupElements {
  imageNodes: CanvasImageNode[]
  inputCards: InputCard[]
  promptCards: PromptCard[]
  shapeNodes: CanvasShapeNode[]
  strokes: CanvasStroke[]
  textNodes: CanvasTextNode[]
}

export interface CanvasGroupAssignment {
  groupId?: string
  id: string
  kind: CanvasGroupableNodeKind
}

export type CanvasGroupAction =
  | { kind: 'group' }
  | { groupId: string; kind: 'ungroup' }

export interface CanvasSelectionBounds {
  height: number
  width: number
  x: number
  y: number
}

export function createCanvasGroupLookup(
  elements: CanvasGroupElements,
): CanvasGroupLookup {
  const refs = createCanvasGroupableNodeRefs(elements)
  const groupIdByNodeId = new Map<string, string>()
  const nodeIdsByGroupId = new Map<string, string[]>()
  const nodeRefsById = new Map(refs.map((ref) => [ref.id, ref]))

  refs.forEach((ref) => {
    if (!ref.groupId) return

    groupIdByNodeId.set(ref.id, ref.groupId)
    nodeIdsByGroupId.set(ref.groupId, [
      ...(nodeIdsByGroupId.get(ref.groupId) ?? []),
      ref.id,
    ])
  })

  return { groupIdByNodeId, nodeIdsByGroupId, nodeRefsById }
}

export function expandCanvasNodeIdsByGroups(
  nodeIds: string[],
  lookup: CanvasGroupLookup,
) {
  const expanded = new Set(nodeIds)

  nodeIds.forEach((nodeId) => {
    const groupId = lookup.groupIdByNodeId.get(nodeId)
    if (!groupId) return
    lookup.nodeIdsByGroupId.get(groupId)?.forEach((groupNodeId) => {
      expanded.add(groupNodeId)
    })
  })

  return Array.from(expanded)
}

export function resolveCanvasGroupAction(
  selectedNodeIds: string[],
  lookup: CanvasGroupLookup,
): CanvasGroupAction | undefined {
  if (selectedNodeIds.length < 2) return undefined

  const selectedGroupIds = new Set(
    selectedNodeIds
      .map((nodeId) => lookup.groupIdByNodeId.get(nodeId))
      .filter((groupId): groupId is string => Boolean(groupId)),
  )
  const selectedIds = new Set(selectedNodeIds)

  if (selectedGroupIds.size === 1) {
    const [groupId] = selectedGroupIds
    const groupNodeIds = lookup.nodeIdsByGroupId.get(groupId) ?? []
    const wholeGroupSelected =
      groupNodeIds.length === selectedNodeIds.length &&
      groupNodeIds.every((nodeId) => selectedIds.has(nodeId))

    if (wholeGroupSelected) return { groupId, kind: 'ungroup' }
  }

  return { kind: 'group' }
}

export function createCanvasGroupAssignments({
  elements,
  groupId,
  nodeIds,
}: {
  elements: CanvasGroupElements
  groupId?: string
  nodeIds: string[]
}): CanvasGroupAssignment[] {
  const selectedIds = new Set(nodeIds)
  return createCanvasGroupableNodeRefs(elements)
    .filter((ref) => selectedIds.has(ref.id))
    .map((ref) => ({
      groupId,
      id: ref.id,
      kind: ref.kind,
    }))
}

export function getCanvasFlowSelectionBounds(
  flowNodes: CanvasFlowNode[],
  selectedNodeIds: string[],
): CanvasSelectionBounds | undefined {
  const selectedIds = new Set(selectedNodeIds)
  const selectedNodes = flowNodes.filter((node) => selectedIds.has(node.id))
  if (!selectedNodes.length) return undefined

  const rects = selectedNodes.map(toNodeRect)
  const left = Math.min(...rects.map((rect) => rect.left))
  const top = Math.min(...rects.map((rect) => rect.top))
  const right = Math.max(...rects.map((rect) => rect.right))
  const bottom = Math.max(...rects.map((rect) => rect.bottom))

  return {
    height: bottom - top,
    width: right - left,
    x: left,
    y: top,
  }
}

function createCanvasGroupableNodeRefs({
  imageNodes,
  inputCards,
  promptCards,
  shapeNodes,
  strokes,
  textNodes,
}: CanvasGroupElements): CanvasGroupableNodeRef[] {
  return [
    ...promptCards.map((node) => toGroupableRef(node, 'promptCard')),
    ...inputCards.map((node) => toGroupableRef(node, 'inputCard')),
    ...shapeNodes.map((node) => toGroupableRef(node, 'flowShape')),
    ...imageNodes.map((node) => toGroupableRef(node, 'canvasImage')),
    ...textNodes.map((node) => toGroupableRef(node, 'freeText')),
    ...strokes.map((node) => toGroupableRef(node, 'freehandStroke')),
  ]
}

function toGroupableRef(
  node: { groupId?: string; id: string },
  kind: CanvasGroupableNodeKind,
): CanvasGroupableNodeRef {
  return {
    groupId: node.groupId,
    id: node.id,
    kind,
  }
}

function toNodeRect(node: CanvasFlowNode) {
  const width = readNodeDimension(node, 'width')
  const height = readNodeDimension(node, 'height')

  return {
    bottom: node.position.y + height,
    left: node.position.x,
    right: node.position.x + width,
    top: node.position.y,
  }
}

function readNodeDimension(node: CanvasFlowNode, key: 'height' | 'width') {
  const measured = node.measured?.[key] ?? node[key]
  if (typeof measured === 'number' && measured > 0) return measured

  const styled = readStyleDimension(node.style, key)
  if (styled > 0) return styled

  if (node.type === 'promptCard') {
    return key === 'width' ? DEFAULT_PROMPT_WIDTH : DEFAULT_PROMPT_HEIGHT
  }
  if (node.type === 'freeText' && key === 'height') return DEFAULT_TEXT_HEIGHT

  return DEFAULT_NODE_SIZE
}

function readStyleDimension(
  style: CanvasFlowNode['style'],
  key: 'height' | 'width',
) {
  if (!style) return 0
  const value = style[key]
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number.parseFloat(value)
  return 0
}
