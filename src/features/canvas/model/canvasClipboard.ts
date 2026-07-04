import { getStrokeBounds, movePoints } from '@/features/canvas/model/strokeGeometry'
import type {
  CanvasEdge,
  CanvasImageNode,
  CanvasPoint,
  InputCard,
  CanvasShapeNode,
  CanvasStroke,
  CanvasTextNode,
  PromptCard,
} from '@/shared/types'
import { createId } from '@/shared/utils/identity'
import { nowIso } from '@/shared/utils/time'

export interface CanvasClipboardElements {
  edges: CanvasEdge[]
  imageNodes: CanvasImageNode[]
  inputCards?: InputCard[]
  promptCards: PromptCard[]
  shapeNodes: CanvasShapeNode[]
  strokes: CanvasStroke[]
  textNodes: CanvasTextNode[]
}

export interface CanvasClipboardSnapshot extends CanvasClipboardElements {
  origin: CanvasPoint
}

export interface CanvasPastePayload extends CanvasClipboardElements {
  canvasId: string
}

export interface CanvasPasteResult {
  nodeIds: string[]
  payload: CanvasPastePayload
  promptCardIds: string[]
}

interface CreateCanvasClipboardOptions extends CanvasClipboardElements {
  selectedNodeIds: string[]
}

interface CreateCanvasPasteOptions {
  anchor: CanvasPoint
  canvasId: string
  clipboard: CanvasClipboardSnapshot
  createNextId?: () => string
  now?: () => string
  topicSessionId?: string
}

export function createCanvasClipboard({
  edges,
  imageNodes,
  inputCards = [],
  promptCards,
  selectedNodeIds,
  shapeNodes,
  strokes,
  textNodes,
}: CreateCanvasClipboardOptions): CanvasClipboardSnapshot | undefined {
  const selectedIds = new Set(selectedNodeIds)
  const selectedPromptCards = promptCards.filter((card) => selectedIds.has(card.id))
  const selectedImageNodes = imageNodes.filter((node) => selectedIds.has(node.id))
  const selectedInputCards = inputCards.filter((card) => selectedIds.has(card.id))
  const selectedShapeNodes = shapeNodes.filter((node) => selectedIds.has(node.id))
  const selectedTextNodes = textNodes.filter((node) => selectedIds.has(node.id))
  const selectedStrokes = strokes.filter((stroke) => selectedIds.has(stroke.id))

  if (
    !selectedPromptCards.length &&
    !selectedImageNodes.length &&
    !selectedInputCards.length &&
    !selectedShapeNodes.length &&
    !selectedTextNodes.length &&
    !selectedStrokes.length
  ) {
    return undefined
  }

  return {
    edges: cloneEdgesBetweenSelectedNodes(edges, selectedIds),
    origin: getClipboardOrigin({
      promptCards: selectedPromptCards,
      imageNodes: selectedImageNodes,
      inputCards: selectedInputCards,
      shapeNodes: selectedShapeNodes,
      strokes: selectedStrokes,
      textNodes: selectedTextNodes,
    }),
    promptCards: structuredClone(selectedPromptCards),
    imageNodes: structuredClone(selectedImageNodes),
    inputCards: structuredClone(selectedInputCards),
    shapeNodes: structuredClone(selectedShapeNodes),
    strokes: structuredClone(selectedStrokes),
    textNodes: structuredClone(selectedTextNodes),
  }
}

export function createCanvasPastePayload({
  anchor,
  canvasId,
  clipboard,
  createNextId = createId,
  now = nowIso,
  topicSessionId,
}: CreateCanvasPasteOptions): CanvasPasteResult {
  const at = now()
  const delta = {
    x: anchor.x - clipboard.origin.x,
    y: anchor.y - clipboard.origin.y,
  }
  const nodeIdMap = new Map<string, string>()
  const groupIdMap = createGroupIdMap(clipboard, createNextId)

  const promptCards = clipboard.promptCards.map((card) => {
    const id = createNextId()
    nodeIdMap.set(card.id, id)

    return {
      ...structuredClone(card),
      canvasId,
      topicSessionId,
      createdAt: at,
      id,
      position: movePoint(card.position, delta),
      sections: clonePromptSections(card, createNextId),
      title: `${card.title} 副本`,
      groupId: remapGroupId(card.groupId, groupIdMap),
      updatedAt: at,
    }
  })
  const shapeNodes = clipboard.shapeNodes.map((node) => {
    const id = createNextId()
    nodeIdMap.set(node.id, id)

    return {
      ...structuredClone(node),
      canvasId,
      topicSessionId,
      createdAt: at,
      id,
      position: movePoint(node.position, delta),
      groupId: remapGroupId(node.groupId, groupIdMap),
      updatedAt: at,
    }
  })
  const inputCards = (clipboard.inputCards ?? []).map((card) => {
    const id = createNextId()
    nodeIdMap.set(card.id, id)

    return {
      ...structuredClone(card),
      canvasId,
      topicSessionId,
      createdAt: at,
      id,
      position: movePoint(card.position, delta),
      title: `${card.title} 副本`,
      groupId: remapGroupId(card.groupId, groupIdMap),
      updatedAt: at,
    }
  })
  const imageNodes = clipboard.imageNodes.map((node) => {
    const id = createNextId()
    nodeIdMap.set(node.id, id)

    return {
      ...structuredClone(node),
      canvasId,
      topicSessionId,
      createdAt: at,
      id,
      position: movePoint(node.position, delta),
      groupId: remapGroupId(node.groupId, groupIdMap),
      updatedAt: at,
    }
  })
  const textNodes = clipboard.textNodes.map((node) => {
    const id = createNextId()
    nodeIdMap.set(node.id, id)

    return {
      ...structuredClone(node),
      canvasId,
      topicSessionId,
      createdAt: at,
      id,
      position: movePoint(node.position, delta),
      groupId: remapGroupId(node.groupId, groupIdMap),
      updatedAt: at,
    }
  })
  const strokes = clipboard.strokes.map((stroke) => {
    const id = createNextId()
    nodeIdMap.set(stroke.id, id)

    return {
      ...structuredClone(stroke),
      canvasId,
      topicSessionId,
      createdAt: at,
      groupId: remapGroupId(stroke.groupId, groupIdMap),
      id,
      points: movePoints(stroke.points, delta),
      updatedAt: at,
    }
  })
  const edges = clipboard.edges.flatMap((edge) => {
    const sourceId = nodeIdMap.get(edge.sourceId)
    const targetId = nodeIdMap.get(edge.targetId)
    if (!sourceId || !targetId) return []

    return {
      ...structuredClone(edge),
      canvasId,
      topicSessionId,
      createdAt: at,
      id: createNextId(),
      sourceId,
      targetId,
      updatedAt: at,
    }
  })

  return {
    nodeIds: [
      ...promptCards.map((card) => card.id),
      ...inputCards.map((card) => card.id),
      ...shapeNodes.map((node) => node.id),
      ...imageNodes.map((node) => node.id),
      ...textNodes.map((node) => node.id),
      ...strokes.map((stroke) => stroke.id),
    ],
    payload: {
      canvasId,
      edges,
      imageNodes,
      inputCards,
      promptCards,
      shapeNodes,
      strokes,
      textNodes,
    },
    promptCardIds: promptCards.map((card) => card.id),
  }
}

function cloneEdgesBetweenSelectedNodes(
  edges: CanvasEdge[],
  selectedIds: Set<string>,
) {
  return structuredClone(
    edges.filter(
      (edge) => selectedIds.has(edge.sourceId) && selectedIds.has(edge.targetId),
    ),
  )
}

function getClipboardOrigin({
  promptCards,
  imageNodes,
  inputCards,
  shapeNodes,
  strokes,
  textNodes,
}: Omit<CanvasClipboardElements, 'edges'>): CanvasPoint {
  const points = [
    ...promptCards.map((card) => card.position),
    ...imageNodes.map((node) => node.position),
    ...(inputCards ?? []).map((card) => card.position),
    ...shapeNodes.map((node) => node.position),
    ...textNodes.map((node) => node.position),
    ...strokes.map((stroke) => {
      const bounds = getStrokeBounds(stroke.points, stroke.strokeWidth + 8)
      return { x: bounds.minX, y: bounds.minY }
    }),
  ]

  return {
    x: Math.min(...points.map((point) => point.x)),
    y: Math.min(...points.map((point) => point.y)),
  }
}

function movePoint(point: CanvasPoint, delta: CanvasPoint): CanvasPoint {
  return {
    x: point.x + delta.x,
    y: point.y + delta.y,
  }
}

function createGroupIdMap(
  clipboard: CanvasClipboardSnapshot,
  createNextId: () => string,
) {
  const sourceGroupIds = new Set<string>()
  const nodes = [
    ...clipboard.promptCards,
    ...(clipboard.inputCards ?? []),
    ...clipboard.shapeNodes,
    ...clipboard.imageNodes,
    ...clipboard.textNodes,
    ...clipboard.strokes,
  ]

  nodes.forEach((node) => {
    if (node.groupId) sourceGroupIds.add(node.groupId)
  })

  return new Map(
    Array.from(sourceGroupIds).map((groupId) => [groupId, createNextId()]),
  )
}

function remapGroupId(
  groupId: string | undefined,
  groupIdMap: Map<string, string>,
) {
  return groupId ? groupIdMap.get(groupId) : undefined
}

function clonePromptSections(
  card: PromptCard,
  createNextId: () => string,
): PromptCard['sections'] {
  return Object.fromEntries(
    Object.entries(card.sections).map(([key, section]) => [
      key,
      {
        ...structuredClone(section),
        workflowSteps: section.workflowSteps?.map((step) => ({
          ...structuredClone(step),
          id: createNextId(),
        })),
      },
    ]),
  ) as PromptCard['sections']
}
