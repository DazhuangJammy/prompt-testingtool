import { db } from '@/shared/storage/db'
import type {
  CanvasEdge,
  CanvasImageNode,
  CanvasShapeNode,
  CanvasStroke,
  CanvasTextNode,
  PromptCard,
} from '@/shared/types'
import { nowIso } from '@/shared/utils/time'

export const canvasRepository = {
  async savePromptCard(card: PromptCard) {
    await db.promptCards.put(card)
    await db.canvases.update(card.canvasId, { updatedAt: nowIso() })
  },

  async updatePromptCardPosition(
    id: string,
    position: PromptCard['position'],
  ) {
    await db.promptCards.update(id, { position, updatedAt: nowIso() })
  },

  async saveShapeNode(node: CanvasShapeNode) {
    await db.canvasShapeNodes.put(node)
    await this.touchCanvas(node.canvasId)
  },

  async updateShapeNode(
    id: string,
    updates: Partial<
      Pick<
        CanvasShapeNode,
        'body' | 'frameStyle' | 'height' | 'position' | 'title' | 'width'
      >
    >,
  ) {
    await db.canvasShapeNodes.update(id, { ...updates, updatedAt: nowIso() })
  },

  async deleteShapeNode(id: string) {
    await db.canvasShapeNodes.delete(id)
  },

  async listShapeNodesByCanvas(canvasId: string) {
    return db.canvasShapeNodes.where('canvasId').equals(canvasId).sortBy('updatedAt')
  },

  async saveEdge(edge: CanvasEdge) {
    await db.canvasEdges.put(edge)
    await this.touchCanvas(edge.canvasId)
  },

  async updateEdge(
    id: string,
    updates: Partial<
      Pick<CanvasEdge, 'sourceHandle' | 'sourceId' | 'targetHandle' | 'targetId'>
    >,
  ) {
    await db.canvasEdges.update(id, { ...updates, updatedAt: nowIso() })
  },

  async deleteEdge(id: string) {
    await db.canvasEdges.delete(id)
  },

  async deleteEdgesForNode(nodeId: string) {
    await Promise.all([
      db.canvasEdges.where('sourceId').equals(nodeId).delete(),
      db.canvasEdges.where('targetId').equals(nodeId).delete(),
    ])
  },

  async listEdgesByCanvas(canvasId: string) {
    return db.canvasEdges.where('canvasId').equals(canvasId).sortBy('updatedAt')
  },

  async saveStroke(stroke: CanvasStroke) {
    await db.canvasStrokes.put(stroke)
    await this.touchCanvas(stroke.canvasId)
  },

  async updateStroke(
    id: string,
    updates: Partial<Pick<CanvasStroke, 'color' | 'points' | 'strokeWidth'>>,
  ) {
    await db.canvasStrokes.update(id, { ...updates, updatedAt: nowIso() })
  },

  async deleteStroke(id: string) {
    await db.canvasStrokes.delete(id)
  },

  async listStrokesByCanvas(canvasId: string) {
    return db.canvasStrokes.where('canvasId').equals(canvasId).sortBy('updatedAt')
  },

  async saveTextNode(textNode: CanvasTextNode) {
    await db.canvasTextNodes.put(textNode)
    await this.touchCanvas(textNode.canvasId)
  },

  async saveImageNode(imageNode: CanvasImageNode) {
    await db.canvasImageNodes.put(imageNode)
    await this.touchCanvas(imageNode.canvasId)
  },

  async savePastedElements({
    canvasId,
    edges,
    imageNodes,
    promptCards,
    shapeNodes,
    strokes,
    textNodes,
  }: {
    canvasId: string
    edges: CanvasEdge[]
    imageNodes: CanvasImageNode[]
    promptCards: PromptCard[]
    shapeNodes: CanvasShapeNode[]
    strokes: CanvasStroke[]
    textNodes: CanvasTextNode[]
  }) {
    await db.transaction(
      'rw',
      [
        db.canvases,
        db.promptCards,
        db.canvasShapeNodes,
        db.canvasEdges,
        db.canvasImageNodes,
        db.canvasStrokes,
        db.canvasTextNodes,
      ],
      async () => {
        await Promise.all([
          promptCards.length ? db.promptCards.bulkPut(promptCards) : undefined,
          shapeNodes.length ? db.canvasShapeNodes.bulkPut(shapeNodes) : undefined,
          imageNodes.length ? db.canvasImageNodes.bulkPut(imageNodes) : undefined,
          textNodes.length ? db.canvasTextNodes.bulkPut(textNodes) : undefined,
          strokes.length ? db.canvasStrokes.bulkPut(strokes) : undefined,
          edges.length ? db.canvasEdges.bulkPut(edges) : undefined,
        ])
        await this.touchCanvas(canvasId)
      },
    )
  },

  async updateTextNode(
    id: string,
    updates: Partial<
      Pick<
        CanvasTextNode,
        | 'backgroundColor'
        | 'color'
        | 'fontSize'
        | 'frameStyle'
        | 'position'
        | 'text'
        | 'width'
      >
    >,
  ) {
    await db.canvasTextNodes.update(id, { ...updates, updatedAt: nowIso() })
  },

  async deleteTextNode(id: string) {
    await db.canvasTextNodes.delete(id)
  },

  async listTextNodesByCanvas(canvasId: string) {
    return db.canvasTextNodes.where('canvasId').equals(canvasId).sortBy('updatedAt')
  },

  async updateImageNode(
    id: string,
    updates: Partial<Pick<CanvasImageNode, 'height' | 'position' | 'width'>>,
  ) {
    await db.canvasImageNodes.update(id, { ...updates, updatedAt: nowIso() })
  },

  async deleteImageNode(id: string) {
    await db.canvasImageNodes.delete(id)
  },

  async listImageNodesByCanvas(canvasId: string) {
    return db.canvasImageNodes.where('canvasId').equals(canvasId).sortBy('updatedAt')
  },

  async touchCanvas(canvasId: string) {
    await db.canvases.update(canvasId, { updatedAt: nowIso() })
  },
}
