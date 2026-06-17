import type { NodeTypes } from '@xyflow/react'
import CanvasImageNode from '@/features/canvas/components/CanvasImageNode'
import FlowShapeNode from '@/features/canvas/components/FlowShapeNode'
import FreeTextNode from '@/features/canvas/components/FreeTextNode'
import FreehandStrokeNode from '@/features/canvas/components/FreehandStrokeNode'
import PromptCardNode from '@/features/prompt-card/PromptCardNode'

export const canvasNodeTypes = {
  canvasImage: CanvasImageNode,
  freeText: FreeTextNode,
  freehandStroke: FreehandStrokeNode,
  flowShape: FlowShapeNode,
  promptCard: PromptCardNode,
} satisfies NodeTypes

export const penColors = [
  { label: '绿色', value: '#78d18b' },
  { label: '白色', value: '#ededed' },
  { label: '蓝色', value: '#6aa8ff' },
  { label: '黄色', value: '#f7c948' },
  { label: '红色', value: '#ff6b6b' },
]
