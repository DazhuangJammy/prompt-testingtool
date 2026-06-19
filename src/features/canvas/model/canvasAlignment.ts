import type { Edge } from '@xyflow/react'
import type { CanvasFlowNode } from '@/features/canvas/model/canvasFlowMapping'

const DEFAULT_PROMPT_WIDTH = 420
const DEFAULT_PROMPT_HEIGHT = 320
const DEFAULT_TEXT_HEIGHT = 96
const DEFAULT_NODE_SIZE = 180
const SNAP_THRESHOLD = 8
const MICRO_ARRANGE_THRESHOLD = 72
const GUIDE_PADDING = 24

export interface CanvasAlignmentGuide {
  axis: 'x' | 'y'
  from: number
  id: string
  position: number
  to: number
}

interface CanvasNodeRect {
  bottom: number
  centerX: number
  centerY: number
  height: number
  id: string
  left: number
  right: number
  top: number
  width: number
}

interface SnapCandidate {
  delta: number
  guide: CanvasAlignmentGuide
  score: number
}

export function snapCanvasNodeToNearbyNodes(
  node: CanvasFlowNode,
  nodes: CanvasFlowNode[],
) {
  if (!isCanvasAlignmentNode(node)) {
    return { guides: [], position: node.position }
  }

  const movingRect = toNodeRect(node)
  const targets = nodes
    .filter((target) => target.id !== node.id && isCanvasAlignmentNode(target))
    .map(toNodeRect)

  const xCandidate = findBestAxisCandidate(movingRect, targets, 'x')
  const yCandidate = findBestAxisCandidate(movingRect, targets, 'y')
  const xDelta = xCandidate?.delta ?? 0
  const yDelta = yCandidate?.delta ?? 0

  return {
    guides: [xCandidate?.guide, yCandidate?.guide].filter(
      Boolean,
    ) as CanvasAlignmentGuide[],
    position: {
      x: node.position.x + xDelta,
      y: node.position.y + yDelta,
    },
  }
}

export function microArrangeCanvasNodes(
  nodes: CanvasFlowNode[],
  edges: Edge[],
  selectedNodeIds: string[],
) {
  const selectedIds = new Set(selectedNodeIds)
  const hasSelection = selectedIds.size > 0
  const rects = new Map(
    nodes.filter(isCanvasAlignmentNode).map((node) => [node.id, toNodeRect(node)]),
  )
  const proposals = new Map<string, { centerX: number[]; centerY: number[] }>()

  edges.forEach((edge) => {
    const sourceRect = rects.get(edge.source)
    const targetRect = rects.get(edge.target)
    if (!sourceRect || !targetRect) return

    const canMoveSource = shouldArrangeNode(edge.source, hasSelection, selectedIds)
    const canMoveTarget = shouldArrangeNode(edge.target, hasSelection, selectedIds)
    if (!canMoveSource && !canMoveTarget) return

    const dx = targetRect.centerX - sourceRect.centerX
    const dy = targetRect.centerY - sourceRect.centerY
    const isVerticalRelationship = Math.abs(dy) >= Math.abs(dx)

    if (isVerticalRelationship) {
      addAxisProposal({
        axis: 'x',
        canMoveSource,
        canMoveTarget,
        proposals,
        sourceRect,
        targetRect,
      })
      return
    }

    addAxisProposal({
      axis: 'y',
      canMoveSource,
      canMoveTarget,
      proposals,
      sourceRect,
      targetRect,
    })
  })

  const changedNodes: CanvasFlowNode[] = []
  const arrangedNodes = nodes.map((node) => {
    const nodeProposal = proposals.get(node.id)
    const rect = rects.get(node.id)
    if (!nodeProposal || !rect) return node

    const nextCenterX = averageOrCurrent(nodeProposal.centerX, rect.centerX)
    const nextCenterY = averageOrCurrent(nodeProposal.centerY, rect.centerY)
    const nextPosition = {
      x: node.position.x + nextCenterX - rect.centerX,
      y: node.position.y + nextCenterY - rect.centerY,
    }

    if (
      Math.round(nextPosition.x) === Math.round(node.position.x) &&
      Math.round(nextPosition.y) === Math.round(node.position.y)
    ) {
      return node
    }

    const arrangedNode = {
      ...node,
      position: {
        x: Math.round(nextPosition.x),
        y: Math.round(nextPosition.y),
      },
    } as CanvasFlowNode
    changedNodes.push(arrangedNode)
    return arrangedNode
  })

  return { changedNodes, nodes: arrangedNodes }
}

export function isCanvasAlignmentNode(node: CanvasFlowNode) {
  return (
    node.type === 'promptCard' ||
    node.type === 'flowShape' ||
    node.type === 'freeText' ||
    node.type === 'canvasImage'
  )
}

function findBestAxisCandidate(
  movingRect: CanvasNodeRect,
  targets: CanvasNodeRect[],
  axis: 'x' | 'y',
) {
  let bestCandidate: SnapCandidate | undefined
  targets.forEach((targetRect) => {
    const movingAnchors =
      axis === 'x'
        ? [movingRect.left, movingRect.centerX, movingRect.right]
        : [movingRect.top, movingRect.centerY, movingRect.bottom]
    const targetAnchors =
      axis === 'x'
        ? [targetRect.left, targetRect.centerX, targetRect.right]
        : [targetRect.top, targetRect.centerY, targetRect.bottom]

    movingAnchors.forEach((movingAnchor) => {
      targetAnchors.forEach((targetAnchor) => {
        const delta = targetAnchor - movingAnchor
        const score = Math.abs(delta)
        if (score > SNAP_THRESHOLD) return
        if (bestCandidate && score >= bestCandidate.score) return

        bestCandidate = {
          delta,
          guide: createGuide(axis, targetAnchor, movingRect, targetRect),
          score,
        }
      })
    })
  })

  return bestCandidate
}

function createGuide(
  axis: 'x' | 'y',
  position: number,
  movingRect: CanvasNodeRect,
  targetRect: CanvasNodeRect,
): CanvasAlignmentGuide {
  if (axis === 'x') {
    return {
      axis,
      from: Math.min(movingRect.top, targetRect.top) - GUIDE_PADDING,
      id: `${axis}-${targetRect.id}-${Math.round(position)}`,
      position,
      to: Math.max(movingRect.bottom, targetRect.bottom) + GUIDE_PADDING,
    }
  }

  return {
    axis,
    from: Math.min(movingRect.left, targetRect.left) - GUIDE_PADDING,
    id: `${axis}-${targetRect.id}-${Math.round(position)}`,
    position,
    to: Math.max(movingRect.right, targetRect.right) + GUIDE_PADDING,
  }
}

function addAxisProposal({
  axis,
  canMoveSource,
  canMoveTarget,
  proposals,
  sourceRect,
  targetRect,
}: {
  axis: 'x' | 'y'
  canMoveSource: boolean
  canMoveTarget: boolean
  proposals: Map<string, { centerX: number[]; centerY: number[] }>
  sourceRect: CanvasNodeRect
  targetRect: CanvasNodeRect
}) {
  const sourceCenter = axis === 'x' ? sourceRect.centerX : sourceRect.centerY
  const targetCenter = axis === 'x' ? targetRect.centerX : targetRect.centerY
  if (Math.abs(targetCenter - sourceCenter) > MICRO_ARRANGE_THRESHOLD) return

  if (canMoveTarget) {
    addProposal(proposals, targetRect.id, axis, sourceCenter)
  }
  if (canMoveSource && !canMoveTarget) {
    addProposal(proposals, sourceRect.id, axis, targetCenter)
  }
}

function addProposal(
  proposals: Map<string, { centerX: number[]; centerY: number[] }>,
  id: string,
  axis: 'x' | 'y',
  center: number,
) {
  const existing = proposals.get(id) ?? { centerX: [], centerY: [] }
  if (axis === 'x') {
    existing.centerX.push(center)
  } else {
    existing.centerY.push(center)
  }
  proposals.set(id, existing)
}

function shouldArrangeNode(
  nodeId: string,
  hasSelection: boolean,
  selectedIds: Set<string>,
) {
  return !hasSelection || selectedIds.has(nodeId)
}

function averageOrCurrent(values: number[], current: number) {
  if (!values.length) return current
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function toNodeRect(node: CanvasFlowNode): CanvasNodeRect {
  const width = readNodeDimension(node, 'width')
  const height = readNodeDimension(node, 'height')

  return {
    bottom: node.position.y + height,
    centerX: node.position.x + width / 2,
    centerY: node.position.y + height / 2,
    height,
    id: node.id,
    left: node.position.x,
    right: node.position.x + width,
    top: node.position.y,
    width,
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
  if (node.type === 'freeText' && key === 'height') {
    return DEFAULT_TEXT_HEIGHT
  }

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
