import {
  createChatSessionExportContent,
  createMessageExportFilename,
  createChatSessionExportFilename,
  getMessageExportText,
  markdownToWordHtml,
  type MessageExportFormat,
} from '@/features/chat/model/messageExport'
import {
  fitImageSize,
  getSvgIntrinsicSize,
} from '@/features/chat/model/renderedImageSize'
import {
  renderChatSessionImageBlob,
  renderMessageImageBlob,
} from '@/features/chat/application/renderedExportImage'
import { formatAttachmentSize } from '@/features/chat/model/attachments'
import { splitSvgPreviewBlocks } from '@/features/chat/model/svgPreview'
import { splitThinkingBlock } from '@/features/chat/model/thinking'
import type { ChatMessage, ChatSession } from '@/shared/types'

const WORD_IMAGE_MAX_WIDTH = 620
const WORD_IMAGE_MAX_HEIGHT = 860
const WORD_IMAGE_FALLBACK_WIDTH = 420
const WORD_IMAGE_FALLBACK_HEIGHT = 260

export async function copyMessageText(
  message: ChatMessage,
  format: MessageExportFormat,
) {
  await navigator.clipboard.writeText(getMessageExportText(message, format))
}

export async function copyMessageImage(message: ChatMessage) {
  const blob = await renderMessageImageBlob(message)
  if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
    throw new Error('当前浏览器不支持复制图片')
  }
  await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
}

export async function downloadMessageMarkdown(
  message: ChatMessage,
  includeThinking: boolean,
) {
  const text = getMessageExportText(
    message,
    includeThinking ? 'markdown-with-thinking' : 'markdown',
  )
  downloadBlob(
    new Blob([text], { type: 'text/markdown;charset=utf-8' }),
    createMessageExportFilename(message, 'md'),
  )
}

export async function downloadMessageImage(message: ChatMessage) {
  const blob = await renderMessageImageBlob(message)
  downloadBlob(blob, createMessageExportFilename(message, 'png'))
}

export async function downloadMessageWord(message: ChatMessage) {
  const html = createWordDocumentHtml(
    'AI 回复',
    await createRenderedMessageHtml(message),
  )
  downloadBlob(
    new Blob([html], { type: 'application/msword;charset=utf-8' }),
    createMessageExportFilename(message, 'doc'),
  )
}

export async function copyChatSessionText(
  session: ChatSession,
  messages: ChatMessage[],
  includeThinking = false,
) {
  await navigator.clipboard.writeText(
    createChatSessionExportContent(session, messages, includeThinking).plainText,
  )
}

export async function copyChatSessionImage(
  session: ChatSession,
  messages: ChatMessage[],
) {
  const blob = await renderChatSessionImageBlob(session, messages)
  if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
    throw new Error('当前浏览器不支持复制图片')
  }
  await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
}

export async function downloadChatSessionMarkdown(
  session: ChatSession,
  messages: ChatMessage[],
  includeThinking: boolean,
) {
  const text = createChatSessionExportContent(session, messages, includeThinking)
    .markdown
  downloadBlob(
    new Blob([text], { type: 'text/markdown;charset=utf-8' }),
    createChatSessionExportFilename(session, 'md'),
  )
}

export async function downloadChatSessionImage(
  session: ChatSession,
  messages: ChatMessage[],
) {
  const blob = await renderChatSessionImageBlob(session, messages)
  downloadBlob(blob, createChatSessionExportFilename(session, 'png'))
}

export async function downloadChatSessionWord(
  session: ChatSession,
  messages: ChatMessage[],
) {
  const html = createWordDocumentHtml(
    session.title.trim() || '聊天记录',
    await createRenderedChatSessionHtml(messages),
  )
  downloadBlob(
    new Blob([html], { type: 'application/msword;charset=utf-8' }),
    createChatSessionExportFilename(session, 'doc'),
  )
}

function createWordDocumentHtml(title: string, bodyHtml: string) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; color: #1f1f1d; }
    h1.export-title { border-bottom: 1px solid #dededc; font-size: 24px; margin: 0 0 18px; padding-bottom: 12px; }
    .export-message { margin: 0 0 18px; }
    .export-role { color: #70706b; font-size: 13px; font-weight: 650; margin: 0 0 6px; }
    .export-bubble { border: 1px solid #dededc; border-radius: 10px; padding: 12px 14px; }
    .export-message.is-user .export-bubble { background: #ffffff; }
    .export-message.is-assistant .export-bubble, .export-message.is-system .export-bubble { background: #f3f3f3; }
    pre { background: #e8e8e6; border-radius: 8px; padding: 12px; white-space: pre-wrap; }
    code { background: #e8e8e6; border-radius: 4px; padding: 2px 4px; }
    img { max-width: 100%; height: auto; }
    .export-svg-card, .export-attachment-list { margin-top: 10px; }
    .export-file-pill { border: 1px solid #dededc; border-radius: 999px; color: #70706b; display: inline-block; font-size: 13px; margin: 4px 6px 0 0; padding: 5px 9px; }
  </style>
</head>
<body>
<h1 class="export-title">${escapeHtml(title)}</h1>
${bodyHtml || '<p>暂无聊天内容</p>'}
</body>
</html>`
}

function createChatSessionAttachmentsNode(message: ChatMessage) {
  const attachments = message.attachments ?? []
  if (!attachments.length) return undefined

  const list = document.createElement('div')
  list.className = 'chat-session-export-attachments'

  attachments.forEach((attachment) => {
    if (attachment.kind === 'image' && attachment.dataUrl) {
      const image = document.createElement('img')
      image.className = 'chat-session-export-image'
      image.alt = attachment.name
      image.src = attachment.dataUrl
      list.append(image)
      return
    }

    const file = document.createElement('span')
    file.className = 'chat-session-export-file'
    file.textContent = `${attachment.name} · ${formatAttachmentSize(attachment.size)}`
    list.append(file)
  })

  return list
}

async function appendRenderedMessageContent(
  parent: HTMLElement,
  message: ChatMessage,
) {
  const markdown = getVisibleMessageMarkdown(message)
  if (markdown) await appendRenderedMarkdown(parent, markdown)

  const attachments = createChatSessionAttachmentsNode(message)
  if (attachments) parent.append(attachments)
}

async function appendRenderedMarkdown(parent: HTMLElement, markdown: string) {
  const blocks = splitSvgPreviewBlocks(markdown)
  for (const block of blocks) {
    if (block.kind === 'markdown') {
      const content = document.createElement('div')
      content.className = 'chat-session-export-markdown'
      content.innerHTML = markdownToWordHtml(block.markdown)
      parent.append(content)
      continue
    }

    const card = document.createElement('div')
    card.className = 'chat-session-export-svg-card export-svg-card'
    const image = document.createElement('img')
    image.className = 'chat-session-export-svg-image'
    image.alt = block.filename
    const renderedSvg = await renderSvgToPngDataUrl(block.svg)
    image.src = renderedSvg.src
    image.width = renderedSvg.width
    image.height = renderedSvg.height
    image.setAttribute(
      'style',
      `width:${renderedSvg.width}px;height:${renderedSvg.height}px;max-width:100%;object-fit:contain;`,
    )
    card.append(image)
    parent.append(card)
  }
}

function getVisibleMessageMarkdown(message: ChatMessage) {
  if (message.role !== 'assistant') return message.content.trim()
  return splitThinkingBlock(message.content).answer.trim()
}

async function createRenderedMessageHtml(message: ChatMessage) {
  const article = await createWordMessageNode(message)
  return article.outerHTML
}

async function createRenderedChatSessionHtml(messages: ChatMessage[]) {
  const orderedMessages = sortMessagesForExport(messages)
  if (!orderedMessages.length) return ''
  const nodes = await Promise.all(
    orderedMessages.map((message) => createWordMessageNode(message)),
  )
  return nodes.map((node) => node.outerHTML).join('\n')
}

async function createWordMessageNode(message: ChatMessage) {
  const article = document.createElement('article')
  article.className = `export-message is-${message.role}`

  const role = document.createElement('div')
  role.className = 'export-role'
  role.textContent = getRoleLabel(message.role)
  article.append(role)

  const bubble = document.createElement('div')
  bubble.className = 'export-bubble'
  await appendRenderedMessageContent(bubble, message)
  if (!bubble.childElementCount) bubble.textContent = '空内容'
  article.append(bubble)

  return article
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

function getRoleLabel(role: ChatMessage['role']) {
  if (role === 'user') return '用户'
  if (role === 'assistant') return 'AI'
  return '系统'
}

async function renderSvgToPngDataUrl(svg: string) {
  const intrinsicSize = getSvgIntrinsicSize(svg)
  const size = fitImageSize(
    intrinsicSize ?? {
      height: WORD_IMAGE_FALLBACK_HEIGHT,
      width: WORD_IMAGE_FALLBACK_WIDTH,
    },
    WORD_IMAGE_MAX_WIDTH,
    WORD_IMAGE_MAX_HEIGHT,
  )
  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  try {
    const image = await loadImageFromDataUrl(svgDataUrl)
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) {
      return {
        height: size.height,
        src: svgDataUrl,
        width: size.width,
      }
    }

    canvas.width = size.width
    canvas.height = size.height
    context.drawImage(image, 0, 0, size.width, size.height)

    return {
      height: size.height,
      src: canvas.toDataURL('image/png'),
      width: size.width,
    }
  } catch {
    return {
      height: size.height,
      src: svgDataUrl,
      width: size.width,
    }
  }
}

function loadImageFromDataUrl(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片生成失败'))
    image.src = src
  })
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
