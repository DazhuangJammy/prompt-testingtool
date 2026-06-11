import { formatAttachmentSize } from '@/features/chat/model/attachments'
import { getSvgIntrinsicSize } from '@/features/chat/model/renderedImageSize'
import { splitSvgPreviewBlocks } from '@/features/chat/model/svgPreview'
import { splitThinkingBlock } from '@/features/chat/model/thinking'
import {
  BLOCK_GAP,
  BUBBLE_MAX_WIDTH,
  BUBBLE_PADDING,
  EXPORT_WIDTH,
  calculateCanvasHeight,
  calculateImageSize,
  canvasToPngBlob,
  drawPage,
  wrapTextLine,
  type ExportBlock,
  type PlannedBlock,
  type PlannedMessage,
  type TextLine,
} from './renderedExportImageCanvas'
import type { ChatAttachment, ChatMessage, ChatSession } from '@/shared/types'

export async function renderMessageImageBlob(message: ChatMessage) {
  return renderChatImageBlob('AI 回复', [message])
}

export async function renderChatSessionImageBlob(
  session: ChatSession,
  messages: ChatMessage[],
) {
  return renderChatImageBlob(session.title.trim() || '聊天记录', messages)
}

async function renderChatImageBlob(title: string, messages: ChatMessage[]) {
  const measureCanvas = document.createElement('canvas')
  const measureContext = measureCanvas.getContext('2d')
  if (!measureContext) throw new Error('无法创建图片')

  const orderedMessages = sortMessagesForExport(messages)
  const plannedMessages = await Promise.all(
    orderedMessages.map((message) => planMessage(measureContext, message)),
  )
  const height = calculateCanvasHeight(plannedMessages)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) throw new Error('无法创建图片')

  const scale = Math.max(1, window.devicePixelRatio || 1)
  canvas.width = EXPORT_WIDTH * scale
  canvas.height = height * scale
  canvas.style.width = `${EXPORT_WIDTH}px`
  canvas.style.height = `${height}px`
  context.scale(scale, scale)

  drawPage(context, title, plannedMessages, height)
  return canvasToPngBlob(canvas)
}

async function planMessage(
  context: CanvasRenderingContext2D,
  message: ChatMessage,
): Promise<PlannedMessage> {
  const messageBlocks = await createMessageBlocks(message)
  const blocks = await Promise.all(
    messageBlocks.map((block) => planBlock(context, block)),
  )
  const visibleBlocks = blocks.filter((block) => block.height > 0)
  const contentWidth = Math.min(
    BUBBLE_MAX_WIDTH,
    Math.max(
      260,
      Math.max(0, ...visibleBlocks.map((block) => block.width ?? 0)) +
        BUBBLE_PADDING * 2,
    ),
  )
  const bubbleHeight =
    BUBBLE_PADDING * 2 +
    visibleBlocks.reduce(
      (total, block, index) => total + block.height + (index ? BLOCK_GAP : 0),
      0,
    )

  return {
    blocks: visibleBlocks,
    bubbleHeight: Math.max(54, bubbleHeight),
    bubbleWidth: contentWidth,
    role: message.role,
  }
}

async function planBlock(
  context: CanvasRenderingContext2D,
  block: ExportBlock,
): Promise<PlannedBlock> {
  if (block.kind === 'image') {
    const size = calculateImageSize(block.image, block.intrinsicSize)
    return {
      height: size.height,
      image: block.image,
      kind: block.kind,
      width: size.width,
    }
  }

  if (block.kind === 'file') {
    return { height: 30, kind: block.kind, text: block.text, width: 260 }
  }

  const lines = block.lines.flatMap((line) => wrapTextLine(context, line))
  return {
    height: lines.reduce((total, line) => total + line.height, 0),
    kind: block.kind,
    lines,
    width: BUBBLE_MAX_WIDTH - BUBBLE_PADDING * 2,
  }
}

async function createMessageBlocks(message: ChatMessage): Promise<ExportBlock[]> {
  const blocks: Array<Promise<ExportBlock | undefined>> = []
  const markdown = getVisibleMessageMarkdown(message)

  if (markdown) {
    splitSvgPreviewBlocks(markdown).forEach((block) => {
      if (block.kind === 'markdown') {
        const lines = parseMarkdownText(block.markdown)
        if (lines.length) blocks.push(Promise.resolve({ kind: 'text', lines }))
        return
      }
      blocks.push(
        loadCanvasImage(block.dataUrl).then((image) => ({
          alt: block.filename,
          image,
          intrinsicSize: getSvgIntrinsicSize(block.svg),
          kind: 'image',
        })),
      )
    })
  }

  message.attachments?.forEach((attachment) => {
    if (attachment.kind === 'image' && attachment.dataUrl) {
      blocks.push(
        loadCanvasImage(attachment.dataUrl).then((image) => ({
          alt: attachment.name,
          image,
          kind: 'image',
        })),
      )
      return
    }
    blocks.push(
      Promise.resolve({ kind: 'file', text: formatAttachmentLabel(attachment) }),
    )
  })

  return (await Promise.all(blocks)).filter(
    (block): block is ExportBlock => Boolean(block),
  )
}

function getVisibleMessageMarkdown(message: ChatMessage) {
  if (message.role !== 'assistant') return message.content.trim()
  return splitThinkingBlock(message.content).answer.trim()
}

function parseMarkdownText(markdown: string) {
  const lines: TextLine[] = []
  let inCode = false

  markdown.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trimEnd()
    if (line.trim().startsWith('```')) {
      inCode = !inCode
      return
    }
    if (!line.trim()) {
      lines.push({ style: 'spacer', text: '' })
      return
    }
    if (inCode) {
      lines.push({ style: 'code', text: line })
      return
    }

    const heading = line.match(/^\s{0,3}#{1,6}\s+(.+)$/)
    if (heading) {
      lines.push({ style: 'heading', text: stripInlineMarkdown(heading[1]) })
      return
    }

    const list = line.match(/^\s*(?:[-*+]|\d+\.)\s+(.+)$/)
    if (list) {
      lines.push({ style: 'normal', text: `• ${stripInlineMarkdown(list[1])}` })
      return
    }

    lines.push({ style: 'normal', text: stripInlineMarkdown(line.trim()) })
  })

  return trimSpacerLines(lines)
}

function stripInlineMarkdown(markdown: string) {
  return markdown
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*_~]{1,3}/g, '')
    .replace(/^\s*>\s?/g, '')
    .trim()
}

function trimSpacerLines(lines: TextLine[]) {
  let start = 0
  let end = lines.length
  while (lines[start]?.style === 'spacer') start += 1
  while (lines[end - 1]?.style === 'spacer') end -= 1
  return lines.slice(start, end)
}

async function loadCanvasImage(src: string) {
  return new Promise<HTMLImageElement | undefined>((resolve) => {
    const image = new Image()
    const timeout = window.setTimeout(() => resolve(undefined), 1200)

    image.onload = () => {
      window.clearTimeout(timeout)
      resolve(image)
    }
    image.onerror = () => {
      window.clearTimeout(timeout)
      resolve(undefined)
    }
    image.src = src
  })
}

function formatAttachmentLabel(attachment: ChatAttachment) {
  return `${attachment.name} · ${formatAttachmentSize(attachment.size)}`
}

function sortMessagesForExport(messages: ChatMessage[]) {
  return messages
    .map((message, index) => ({ message, index }))
    .sort((left, right) => {
      const leftTime = new Date(left.message.createdAt).getTime()
      const rightTime = new Date(right.message.createdAt).getTime()
      const safeLeft = Number.isNaN(leftTime) ? 0 : leftTime
      const safeRight = Number.isNaN(rightTime) ? 0 : rightTime
      return safeLeft - safeRight || left.index - right.index
    })
    .map((item) => item.message)
}
