import type {
  CanvasEdge,
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

export function createCanvasShapeNode(
  canvasId: string,
  kind: Exclude<CanvasShapeKind, 'text'>,
  position: CanvasPoint,
): CanvasShapeNode {
  const at = nowIso()
  const defaults = shapeDefaults[kind]

  return {
    id: createId(),
    canvasId,
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
): CanvasEdge {
  const at = nowIso()

  return {
    id: createId(),
    canvasId,
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
  color = '#78d18b',
  strokeWidth = 3,
): CanvasStroke {
  const at = nowIso()

  return {
    id: createId(),
    canvasId,
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
): CanvasTextNode {
  const at = nowIso()

  return {
    id: createId(),
    canvasId,
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
