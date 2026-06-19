import type {
  CanvasEdge,
  CanvasImageNode,
  CanvasPoint,
  CanvasShapeKind,
  CanvasShapeNode,
  CanvasStroke,
  CanvasTextNode,
} from '@/shared/types'
import { createId } from '@/shared/utils/identity'
import { nowIso } from '@/shared/utils/time'

const shapeDefaults = {
  decision: {
    body: '分支条件',
    height: 120,
    title: '判断',
    width: 180,
  },
  step: {
    body: '流程说明',
    height: 112,
    title: '步骤',
    width: 200,
  },
} satisfies Record<
  Exclude<CanvasShapeKind, 'text'>,
  { body: string; height: number; title: string; width: number }
>

const DEFAULT_IMAGE_MAX_WIDTH = 420
const DEFAULT_IMAGE_MAX_HEIGHT = 280

export function createCanvasShapeNode(
  canvasId: string,
  kind: Exclude<CanvasShapeKind, 'text'>,
  position: CanvasPoint,
  topicSessionId?: string,
): CanvasShapeNode {
  const at = nowIso()
  const defaults = shapeDefaults[kind]

  return {
    id: createId(),
    canvasId,
    topicSessionId,
    kind,
    title: defaults.title,
    body: defaults.body,
    position,
    width: defaults.width,
    height: defaults.height,
    createdAt: at,
    updatedAt: at,
  }
}

export function createCanvasEdge(
  canvasId: string,
  sourceId: string,
  targetId: string,
  sourceHandle?: string | null,
  targetHandle?: string | null,
  topicSessionId?: string,
): CanvasEdge {
  const at = nowIso()

  return {
    id: createId(),
    canvasId,
    topicSessionId,
    sourceId,
    targetId,
    sourceHandle: sourceHandle ?? undefined,
    targetHandle: targetHandle ?? undefined,
    createdAt: at,
    updatedAt: at,
  }
}

export function createCanvasStroke(
  canvasId: string,
  points: CanvasPoint[],
  color = '#ededed',
  strokeWidth = 3,
  topicSessionId?: string,
): CanvasStroke {
  const at = nowIso()

  return {
    id: createId(),
    canvasId,
    topicSessionId,
    points,
    color,
    strokeWidth,
    createdAt: at,
    updatedAt: at,
  }
}

export function createCanvasTextNode(
  canvasId: string,
  position: CanvasPoint,
  style: Pick<CanvasTextNode, 'backgroundColor' | 'color' | 'fontSize'> = {
    backgroundColor: 'transparent',
    color: '#ededed',
    fontSize: 18,
  },
  topicSessionId?: string,
): CanvasTextNode {
  const at = nowIso()

  return {
    id: createId(),
    canvasId,
    topicSessionId,
    text: '双击编辑文字',
    position,
    width: 220,
    color: style.color,
    fontSize: style.fontSize,
    backgroundColor: style.backgroundColor,
    createdAt: at,
    updatedAt: at,
  }
}

export function createCanvasImageNode(
  canvasId: string,
  position: CanvasPoint,
  image: Pick<CanvasImageNode, 'dataUrl' | 'mimeType' | 'name'> & {
    naturalHeight?: number
    naturalWidth?: number
  },
  topicSessionId?: string,
): CanvasImageNode {
  const at = nowIso()
  const size = fitImageSize(
    image.naturalWidth ?? DEFAULT_IMAGE_MAX_WIDTH,
    image.naturalHeight ?? DEFAULT_IMAGE_MAX_HEIGHT,
  )

  return {
    id: createId(),
    canvasId,
    topicSessionId,
    name: image.name.trim() || '粘贴图片',
    mimeType: image.mimeType || 'image/png',
    dataUrl: image.dataUrl,
    position,
    width: size.width,
    height: size.height,
    createdAt: at,
    updatedAt: at,
  }
}

function fitImageSize(width: number, height: number) {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : DEFAULT_IMAGE_MAX_WIDTH
  const safeHeight =
    Number.isFinite(height) && height > 0 ? height : DEFAULT_IMAGE_MAX_HEIGHT
  const ratio = Math.min(
    1,
    DEFAULT_IMAGE_MAX_WIDTH / safeWidth,
    DEFAULT_IMAGE_MAX_HEIGHT / safeHeight,
  )

  return {
    width: Math.max(80, Math.round(safeWidth * ratio)),
    height: Math.max(60, Math.round(safeHeight * ratio)),
  }
}
