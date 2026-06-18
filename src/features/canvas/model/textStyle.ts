import type { CanvasTextNode } from '@/shared/types'

export type CanvasTextStyle = Pick<
  CanvasTextNode,
  'backgroundColor' | 'color' | 'fontSize'
>

export const textColors = [
  { label: '白色文字', value: '#ededed' },
  { label: '灰色文字', value: '#9b9b9b' },
  { label: '蓝色文字', value: '#6aa8ff' },
  { label: '黄色文字', value: '#f7c948' },
  { label: '红色文字', value: '#ff6b6b' },
  { label: '深色文字', value: '#1f2933' },
]

export const textBackgroundColors = [
  { label: '无背景', value: 'transparent' },
  { label: '浅黄背景', value: '#f7c94833' },
  { label: '浅蓝背景', value: '#6aa8ff2f' },
  { label: '浅灰背景', value: '#9b9b9b2f' },
  { label: '深色背景', value: '#1f2933d9' },
]

export const defaultTextStyle: CanvasTextStyle = {
  backgroundColor: 'transparent',
  color: '#ededed',
  fontSize: 18,
}

export function clampTextFontSize(fontSize: number) {
  return Math.min(72, Math.max(10, Math.round(fontSize)))
}
