import {
  fitImageSize,
  type RenderedImageSize,
} from '@/features/chat/model/renderedImageSize'
import type { ChatMessage } from '@/shared/types'

export type TextStyle = 'normal' | 'heading' | 'code' | 'spacer'

export interface TextLine {
  style: TextStyle
  text: string
}

export interface TextBlock {
  kind: 'text'
  lines: TextLine[]
}

export interface ImageBlock {
  alt: string
  image?: HTMLImageElement
  intrinsicSize?: RenderedImageSize
  kind: 'image'
}

export interface FileBlock {
  kind: 'file'
  text: string
}

export type ExportBlock = FileBlock | ImageBlock | TextBlock

export interface PlannedTextLine extends TextLine {
  height: number
}

export interface PlannedBlock {
  height: number
  image?: HTMLImageElement
  kind: ExportBlock['kind']
  lines?: PlannedTextLine[]
  text?: string
  width?: number
}

export interface PlannedMessage {
  bubbleHeight: number
  bubbleWidth: number
  blocks: PlannedBlock[]
  role: ChatMessage['role']
}

export const EXPORT_WIDTH = 920
export const PAGE_PADDING = 30
export const BUBBLE_MAX_WIDTH = 720
export const BUBBLE_PADDING = 16
export const BLOCK_GAP = 10

const IMAGE_MAX_WIDTH = 520
const IMAGE_MAX_HEIGHT = 720
const IMAGE_FALLBACK_WIDTH = 360
const IMAGE_FALLBACK_HEIGHT = 220

export function wrapTextLine(
  context: CanvasRenderingContext2D,
  line: TextLine,
): PlannedTextLine[] {
  const height = getTextLineHeight(line.style)
  if (line.style === 'spacer') return [{ ...line, height: 12 }]

  context.font = getTextFont(line.style)
  const maxWidth = BUBBLE_MAX_WIDTH - BUBBLE_PADDING * 2
  const wrapped: PlannedTextLine[] = []
  let current = ''

  Array.from(line.text || ' ').forEach((char) => {
    const next = current + char
    if (context.measureText(next).width > maxWidth && current) {
      wrapped.push({ ...line, height, text: current })
      current = char
      return
    }
    current = next
  })

  wrapped.push({ ...line, height, text: current })
  return wrapped
}

export function calculateImageSize(
  image?: HTMLImageElement,
  intrinsicSize?: RenderedImageSize,
) {
  return fitImageSize(
    {
      height: intrinsicSize?.height || image?.naturalHeight || IMAGE_FALLBACK_HEIGHT,
      width: intrinsicSize?.width || image?.naturalWidth || IMAGE_FALLBACK_WIDTH,
    },
    IMAGE_MAX_WIDTH,
    IMAGE_MAX_HEIGHT,
  )
}

export function calculateCanvasHeight(messages: PlannedMessage[]) {
  const titleHeight = 60
  const messagesHeight = messages.length
    ? messages.reduce(
        (total, message) => total + 22 + 6 + message.bubbleHeight + 18,
        0,
      )
    : 44
  return PAGE_PADDING * 2 + titleHeight + messagesHeight
}

export function drawPage(
  context: CanvasRenderingContext2D,
  title: string,
  messages: PlannedMessage[],
  height: number,
) {
  context.fillStyle = '#fbfbfa'
  context.fillRect(0, 0, EXPORT_WIDTH, height)
  context.strokeStyle = '#dededc'
  context.strokeRect(0.5, 0.5, EXPORT_WIDTH - 1, height - 1)

  context.fillStyle = '#1f1f1d'
  context.font = '700 24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  context.fillText(title, PAGE_PADDING, PAGE_PADDING + 26)
  context.strokeStyle = '#dededc'
  context.beginPath?.()
  context.moveTo?.(PAGE_PADDING, PAGE_PADDING + 48)
  context.lineTo?.(EXPORT_WIDTH - PAGE_PADDING, PAGE_PADDING + 48)
  context.stroke?.()

  if (!messages.length) {
    context.fillStyle = '#70706b'
    context.font = getTextFont('normal')
    context.fillText('暂无聊天内容', PAGE_PADDING, PAGE_PADDING + 88)
    return
  }

  let y = PAGE_PADDING + 76
  messages.forEach((message) => {
    y = drawMessage(context, message, y)
  })
}

export function canvasToPngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('图片生成失败'))
      }, 'image/png')
    } catch {
      reject(new Error('图片生成失败'))
    }
  })
}

function drawMessage(
  context: CanvasRenderingContext2D,
  message: PlannedMessage,
  y: number,
) {
  const isUser = message.role === 'user'
  const bubbleX = isUser
    ? EXPORT_WIDTH - PAGE_PADDING - message.bubbleWidth
    : PAGE_PADDING
  const roleX = isUser ? bubbleX + message.bubbleWidth - 34 : bubbleX

  context.fillStyle = '#70706b'
  context.font = '650 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  context.fillText(getRoleLabel(message.role), roleX, y + 14)

  const bubbleY = y + 22
  drawBubble(context, bubbleX, bubbleY, message.bubbleWidth, message.bubbleHeight, isUser)

  let contentY = bubbleY + BUBBLE_PADDING
  message.blocks.forEach((block, index) => {
    if (index) contentY += BLOCK_GAP
    contentY = drawBlock(context, block, bubbleX + BUBBLE_PADDING, contentY)
  })

  return bubbleY + message.bubbleHeight + 18
}

function drawBubble(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  isUser: boolean,
) {
  context.fillStyle = isUser ? '#ffffff' : '#f0f0ef'
  context.strokeStyle = '#dededc'
  context.fillRect(x, y, width, height)
  context.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1)
}

function drawBlock(
  context: CanvasRenderingContext2D,
  block: PlannedBlock,
  x: number,
  y: number,
) {
  if (block.kind === 'image') {
    if (block.image) {
      context.drawImage(
        block.image,
        x,
        y,
        block.width ?? IMAGE_FALLBACK_WIDTH,
        block.height,
      )
    } else {
      drawImagePlaceholder(
        context,
        x,
        y,
        block.width ?? IMAGE_FALLBACK_WIDTH,
        block.height,
      )
    }
    return y + block.height
  }

  if (block.kind === 'file') {
    drawFilePill(context, block.text ?? '附件', x, y)
    return y + block.height
  }

  block.lines?.forEach((line) => {
    if (line.style === 'spacer') {
      y += line.height
      return
    }
    context.fillStyle = '#1f1f1d'
    context.font = getTextFont(line.style)
    context.fillText(line.text, x, y + line.height - 7)
    y += line.height
  })
  return y
}

function drawImagePlaceholder(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  context.fillStyle = '#f3f3f1'
  context.fillRect(x, y, width, height)
  context.strokeStyle = '#dededc'
  context.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1)
  context.fillStyle = '#70706b'
  context.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  context.fillText('图片加载失败', x + 14, y + 28)
}

function drawFilePill(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
) {
  const width = Math.min(360, Math.max(120, context.measureText(text).width + 24))
  context.fillStyle = '#ffffff'
  context.fillRect(x, y, width, 30)
  context.strokeStyle = '#dededc'
  context.strokeRect(x + 0.5, y + 0.5, width - 1, 29)
  context.fillStyle = '#70706b'
  context.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  context.fillText(text, x + 12, y + 20)
}

function getTextFont(style: TextStyle) {
  if (style === 'heading') {
    return '700 21px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  }
  if (style === 'code') return '15px ui-monospace, SFMono-Regular, Menlo, monospace'
  return '18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
}

function getTextLineHeight(style: TextStyle) {
  if (style === 'heading') return 30
  if (style === 'code') return 23
  return 27
}

function getRoleLabel(role: ChatMessage['role']) {
  if (role === 'user') return '用户'
  if (role === 'assistant') return 'AI'
  return '系统'
}
