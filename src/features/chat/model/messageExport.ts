import { splitThinkingBlock } from '@/features/chat/model/thinking'
import { formatAttachmentSize } from './attachments'
import type { ChatAttachment, ChatMessage, ChatSession } from '@/shared/types'

export type MessageExportFormat =
  | 'plain-text'
  | 'markdown'
  | 'markdown-with-thinking'

export interface MessageExportContent {
  answerMarkdown: string
  markdown: string
  markdownWithThinking: string
  plainText: string
  thinking: string
}

export interface ChatSessionExportContent {
  markdown: string
  plainText: string
}

export function createMessageExportContent(
  message: Pick<ChatMessage, 'content'>,
): MessageExportContent {
  const parsed = splitThinkingBlock(message.content)
  const answerMarkdown = parsed.answer.trim()
  const thinking = parsed.thinking.trim()
  const markdownWithThinking = thinking
    ? `## 思考\n\n${thinking}\n\n## 回答\n\n${answerMarkdown}`.trim()
    : answerMarkdown

  return {
    answerMarkdown,
    markdown: answerMarkdown,
    markdownWithThinking,
    plainText: stripMarkdown(answerMarkdown),
    thinking,
  }
}

export function getMessageExportText(
  message: Pick<ChatMessage, 'content'>,
  format: MessageExportFormat,
) {
  const content = createMessageExportContent(message)
  if (format === 'markdown') return content.markdown
  if (format === 'markdown-with-thinking') return content.markdownWithThinking
  return content.plainText
}

export function createMessageExportFilename(
  message: Pick<ChatMessage, 'createdAt'>,
  extension: string,
) {
  const date = new Date(message.createdAt)
  const stamp = Number.isNaN(date.getTime())
    ? 'message'
    : date.toISOString().replace(/[:.]/g, '-')
  return `ai-reply-${stamp}.${extension}`
}

export function createChatSessionExportMessage(
  session: Pick<ChatSession, 'title' | 'createdAt'>,
  messages: ChatMessage[],
  includeThinking: boolean,
): ChatMessage {
  const exportedAt = messages.at(-1)?.createdAt ?? session.createdAt
  return {
    id: `session-export-${exportedAt}`,
    sessionId: 'session-export',
    role: 'assistant',
    content: createChatSessionExportContent(session, messages, includeThinking)
      .markdown,
    createdAt: exportedAt,
  }
}

export function createChatSessionExportContent(
  session: Pick<ChatSession, 'title'>,
  messages: ChatMessage[],
  includeThinking: boolean,
): ChatSessionExportContent {
  const orderedMessages = sortMessagesForExport(messages)
  const markdownBody = orderedMessages
    .map((message) => createChatSessionMessageMarkdown(message, includeThinking))
    .join('\n\n---\n\n')
  const plainTextBody = orderedMessages
    .map((message) => createChatSessionMessagePlainText(message, includeThinking))
    .join('\n\n')
  const title = session.title.trim() || '聊天记录'

  return {
    markdown: `# ${title}\n\n${markdownBody || '暂无聊天内容'}`,
    plainText: `${title}\n\n${plainTextBody || '暂无聊天内容'}`.trim(),
  }
}

export function createChatSessionExportFilename(
  session: Pick<ChatSession, 'title' | 'createdAt'>,
  extension: string,
) {
  const safeTitle =
    session.title
      .trim()
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, '-')
      .slice(0, 32) || 'chat-session'
  const date = new Date(session.createdAt)
  const stamp = Number.isNaN(date.getTime())
    ? 'session'
    : date.toISOString().slice(0, 10)
  return `${safeTitle}-${stamp}.${extension}`
}

export function markdownToWordHtml(markdown: string) {
  const lines = markdown.split(/\r?\n/)
  const html: string[] = []
  let codeBuffer: string[] = []
  let inCode = false

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (inCode) {
        html.push(`<pre>${escapeHtml(codeBuffer.join('\n'))}</pre>`)
        codeBuffer = []
      }
      inCode = !inCode
      continue
    }

    if (inCode) {
      codeBuffer.push(line)
      continue
    }

    if (!line.trim()) {
      html.push('<br>')
      continue
    }

    const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
    if (image) {
      html.push(
        `<p><img alt="${escapeAttribute(image[1])}" src="${escapeAttribute(
          image[2],
        )}" style="max-width: 100%; height: auto;" /></p>`,
      )
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/)
    if (heading) {
      const level = Math.min(heading[1].length, 3)
      html.push(`<h${level}>${inlineMarkdownToHtml(heading[2])}</h${level}>`)
      continue
    }

    const listItem = line.match(/^[-*]\s+(.+)$/)
    if (listItem) {
      html.push(`<p>• ${inlineMarkdownToHtml(listItem[1])}</p>`)
      continue
    }

    html.push(`<p>${inlineMarkdownToHtml(line)}</p>`)
  }

  if (codeBuffer.length) html.push(`<pre>${escapeHtml(codeBuffer.join('\n'))}</pre>`)
  return html.join('\n')
}

function stripMarkdown(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, (block) =>
      block.replace(/^```[^\n]*\n?/, '').replace(/```$/, ''),
    )
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/[*_~]{1,3}/g, '')
    .replace(/^\s*>\s?/gm, '')
    .trim()
}

function createChatSessionMessageMarkdown(
  message: ChatMessage,
  includeThinking: boolean,
) {
  const label = getRoleLabel(message.role)
  const content = getMessageMarkdownForSession(message, includeThinking)
  const attachments = createAttachmentsMarkdown(message.attachments ?? [])
  const body = [content, attachments].filter(Boolean).join('\n\n')
  return `## ${label}\n\n${body || '空内容'}`
}

function createChatSessionMessagePlainText(
  message: ChatMessage,
  includeThinking: boolean,
) {
  const label = getRoleLabel(message.role)
  const content =
    message.role === 'assistant'
      ? getMessageExportText(
          message,
          includeThinking ? 'markdown-with-thinking' : 'plain-text',
        )
      : stripMarkdown(message.content.trim())
  const attachments = createAttachmentsPlainText(message.attachments ?? [])
  return [`【${label}】`, content, attachments].filter(Boolean).join('\n')
}

function getMessageMarkdownForSession(
  message: ChatMessage,
  includeThinking: boolean,
) {
  if (message.role === 'assistant') {
    return getMessageExportText(
      message,
      includeThinking ? 'markdown-with-thinking' : 'markdown',
    )
  }
  return message.content.trim()
}

function createAttachmentsMarkdown(attachments: ChatAttachment[]) {
  if (!attachments.length) return ''

  const lines = attachments.map((attachment) => {
    if (attachment.kind === 'image' && attachment.dataUrl) {
      return `![${escapeMarkdownAlt(attachment.name)}](${attachment.dataUrl})`
    }
    return `- ${attachment.name}（${formatAttachmentSize(attachment.size)}）`
  })

  return ['### 附件', ...lines].join('\n')
}

function createAttachmentsPlainText(attachments: ChatAttachment[]) {
  if (!attachments.length) return ''
  return attachments
    .map((attachment) => {
      const type = attachment.kind === 'image' ? '图片' : '附件'
      return `[${type}: ${attachment.name}（${formatAttachmentSize(attachment.size)}）]`
    })
    .join('\n')
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

function escapeMarkdownAlt(value: string) {
  return value.replace(/[[\]\\]/g, '\\$&')
}

function inlineMarkdownToHtml(text: string) {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/'/g, '&#39;')
}
