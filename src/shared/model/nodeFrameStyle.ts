import type { CanvasNodeFrameStyle } from '@/shared/types'

export interface CanvasFrameStyle {
  borderColor: string
  highlighted: boolean
}

export const defaultNodeFrameStyle: CanvasFrameStyle = {
  borderColor: '#4a4a4a',
  highlighted: false,
}

export const frameBorderColors = [
  { label: '默认边框', value: defaultNodeFrameStyle.borderColor },
  { label: '白色边框', value: '#ededed' },
  { label: '灰色边框', value: '#9b9b9b' },
  { label: '蓝色边框', value: '#6aa8ff' },
  { label: '黄色边框', value: '#f7c948' },
  { label: '红色边框', value: '#ff6b6b' },
  { label: '深色边框', value: '#1f2933' },
]

export function resolveCanvasNodeFrameStyle(
  frameStyle?: CanvasNodeFrameStyle,
): CanvasFrameStyle {
  return {
    borderColor: frameStyle?.borderColor ?? defaultNodeFrameStyle.borderColor,
    highlighted: frameStyle?.highlighted ?? false,
  }
}

export function mergeCanvasNodeFrameStyle(
  current: CanvasNodeFrameStyle | undefined,
  updates: Partial<CanvasFrameStyle>,
): CanvasNodeFrameStyle | undefined {
  const merged = {
    ...resolveCanvasNodeFrameStyle(current),
    ...updates,
  }
  const nextStyle: CanvasNodeFrameStyle = {}
  const shouldPersistBorder =
    current?.borderColor !== undefined || updates.borderColor !== undefined

  if (shouldPersistBorder) nextStyle.borderColor = merged.borderColor
  if (merged.highlighted) nextStyle.highlighted = true

  return Object.keys(nextStyle).length ? nextStyle : undefined
}

export function normalizeFrameColorInput(color: string) {
  return /^#[0-9a-f]{6}$/i.test(color)
    ? color
    : defaultNodeFrameStyle.borderColor
}
