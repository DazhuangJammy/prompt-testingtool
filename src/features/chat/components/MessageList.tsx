import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  FileText,
  Pencil,
  RotateCcw,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  formatGenerationDuration,
  formatMessageTime,
  formatThinkingSeconds,
  splitThinkingBlock,
} from '@/shared/model/thinking'
import { MarkdownRenderer } from '@/shared/ui/MarkdownRenderer'
import { formatAttachmentSize } from '@/features/chat/model/attachments'
import { formatChatDisplayMarkdown } from '@/features/chat/model/messageDisplay'
import {
  splitSvgPreviewBlocks,
  type SvgPreviewBlock,
} from '@/features/chat/model/svgPreview'
import type { ChatAttachment, ChatMessage } from '@/shared/types'
import { IconButton } from '@/shared/ui/IconButton'
import { ImagePreviewDialog } from '@/shared/ui/ImagePreviewDialog'
import { MessageExportMenu } from './MessageExportMenu'
import {
  KnowledgeAnswerContent,
  KnowledgeCitationSummary,
} from './KnowledgeCitations'
import {
  WebSearchAnswerContent,
  WebSearchCitationSummary,
} from './WebSearchCitations'

const defaultThinkingCollapsed = true

interface MessageListProps {
  generating?: boolean
  messages: ChatMessage[]
  onEdit: (message: ChatMessage, content: string) => void
  onResend: (message: ChatMessage, content: string) => void
}

interface ImagePreviewItem {
  name: string
  src: string
}

export function MessageList({
  generating = false,
  messages,
  onEdit,
  onResend,
}: MessageListProps) {
  const [editingId, setEditingId] = useState<string>()
  const [previewItem, setPreviewItem] = useState<ImagePreviewItem>()
  const [expandedThinkingIds, setExpandedThinkingIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [draft, setDraft] = useState('')
  const [exportError, setExportError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (!successMessage) return
    const timer = window.setTimeout(() => setSuccessMessage(''), 1400)
    return () => window.clearTimeout(timer)
  }, [successMessage])

  const copyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setSuccessMessage('复制成功')
      setExportError('')
    } catch (error) {
      setExportError(error instanceof Error ? error.message : '复制失败')
    }
  }

  useEffect(() => {
    if (!previewItem) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewItem(undefined)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [previewItem])

  const lastMessage = messages.at(-1)
  const showPendingAssistant =
    generating && (!lastMessage || lastMessage.role === 'user')

  return (
    <>
      <div className="message-list" aria-busy={generating}>
        {exportError && <div className="message-export-error">{exportError}</div>}
        {successMessage && <div className="action-toast">{successMessage}</div>}
        {messages.map((message) => {
          const isEditing = editingId === message.id
          const attachments = message.attachments ?? []
          const parsed = splitThinkingBlock(message.content)
          const showThinking =
            message.role === 'assistant' &&
            message.thinkingMode !== 'off' &&
            Boolean(parsed.thinking)
          const answerText =
            parsed.answer ||
            (message.role === 'assistant' && message.status === 'complete'
              ? '空回复'
              : '')
          const awaitingAnswer =
            generating &&
            message.id === lastMessage?.id &&
            message.role === 'assistant' &&
            message.status === 'streaming' &&
            !parsed.answer
          const hasWebSearchProgress =
            message.role === 'assistant' &&
            (Boolean(message.webSearchStatus) ||
              Boolean(message.webSearchReferences?.length))
          const showBubble =
            isEditing ||
            Boolean(answerText) ||
            attachments.length > 0 ||
            hasWebSearchProgress ||
            awaitingAnswer
          const thinkingCollapsed =
            defaultThinkingCollapsed && !expandedThinkingIds.has(message.id)

          return (
            <article className={`message is-${message.role}`} key={message.id}>
              {!isEditing && showThinking && (
                <div className="thinking-box">
                  <button
                    type="button"
                    className="thinking-head"
                    onClick={() =>
                      setExpandedThinkingIds((current) => {
                        const next = new Set(current)
                        if (next.has(message.id)) next.delete(message.id)
                        else next.add(message.id)
                        return next
                      })
                    }
                  >
                    {thinkingCollapsed ? <ChevronRight /> : <ChevronDown />}
                    <span>Thinking</span>
                    {message.thinkingDurationMs && (
                      <span>{formatThinkingSeconds(message.thinkingDurationMs)}</span>
                    )}
                  </button>
                  {!thinkingCollapsed && (
                    <MarkdownRenderer>
                      {formatChatDisplayMarkdown(parsed.thinking)}
                    </MarkdownRenderer>
                  )}
                </div>
              )}
              {showBubble && (
                <div
                  className={`message-bubble ${
                    answerText === '空回复' && !attachments.length ? 'is-empty' : ''
                  } ${awaitingAnswer ? 'is-loading' : ''}`}
                >
                  {isEditing ? (
                    <textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                    />
                  ) : (
                    <>
                      {(answerText || hasWebSearchProgress) && (
                        <MessageContent
                          content={answerText}
                          knowledgeReferences={
                            message.role === 'assistant'
                              ? message.knowledgeReferences ?? []
                              : []
                          }
                          webSearchReferences={
                            message.role === 'assistant'
                              ? message.webSearchReferences ?? []
                              : []
                          }
                          webSearchStatus={
                            message.role === 'assistant'
                              ? message.webSearchStatus
                              : undefined
                          }
                          onPreview={setPreviewItem}
                        />
                      )}
                      <MessageAttachments
                        attachments={attachments}
                        onPreview={setPreviewItem}
                      />
                      {awaitingAnswer && <AssistantLoadingIndicator />}
                    </>
                  )}
                </div>
              )}
              <div className="message-actions">
                <div className="message-action-buttons">
                  <IconButton
                    icon={<Copy />}
                    label="复制"
                    onClick={() => void copyMessage(message.content)}
                  />
                  {message.role === 'assistant' && (
                    <MessageExportMenu
                      message={message}
                      onError={setExportError}
                      onSuccess={(value) => {
                        setSuccessMessage(value)
                        setExportError('')
                      }}
                    />
                  )}
                  {message.role === 'user' &&
                    (isEditing ? (
                      <>
                        <IconButton
                          icon={<Check />}
                          label="保存"
                          onClick={() => {
                            onEdit(message, draft)
                            setEditingId(undefined)
                          }}
                        />
                        <IconButton
                          icon={<RotateCcw />}
                          label="重发"
                          onClick={() => {
                            onResend(message, draft)
                            setEditingId(undefined)
                          }}
                        />
                        <IconButton
                          icon={<X />}
                          label="取消"
                          onClick={() => setEditingId(undefined)}
                        />
                      </>
                    ) : (
                      <>
                        <IconButton
                          icon={<Pencil />}
                          label="编辑"
                          onClick={() => {
                            setDraft(message.content)
                            setEditingId(message.id)
                          }}
                        />
                        <IconButton
                          icon={<RotateCcw />}
                          label="重发"
                          onClick={() => onResend(message, message.content)}
                        />
                      </>
                    ))}
                </div>
                <span className="message-time">
                  {formatMessageTime(message.createdAt)}
                  {message.role === 'assistant' &&
                    message.thinkingMode !== 'off' &&
                    formatGenerationDuration(message.thinkingDurationMs)}
                </span>
              </div>
            </article>
          )
        })}
        {showPendingAssistant && (
          <article className="message is-assistant">
            <div className="message-bubble is-loading">
              <AssistantLoadingIndicator />
            </div>
          </article>
        )}
      </div>
      {previewItem && (
        <ImagePreviewDialog
          name={previewItem.name}
          src={previewItem.src}
          onClose={() => setPreviewItem(undefined)}
        />
      )}
    </>
  )
}

function AssistantLoadingIndicator() {
  return (
    <div
      className="assistant-loading-indicator"
      role="status"
      aria-label="模型正在思考"
    >
      <span aria-hidden="true" />
      <span aria-hidden="true" />
      <span aria-hidden="true" />
    </div>
  )
}

interface MessageContentProps {
  content: string
  knowledgeReferences: ChatMessage['knowledgeReferences']
  webSearchReferences: ChatMessage['webSearchReferences']
  webSearchStatus: ChatMessage['webSearchStatus']
  onPreview: (item: ImagePreviewItem) => void
}

function MessageContent({
  content,
  knowledgeReferences = [],
  webSearchReferences = [],
  webSearchStatus,
  onPreview,
}: MessageContentProps) {
  const blocks = splitSvgPreviewBlocks(content)
  const hasKnowledgeCitations = knowledgeReferences.length > 0
  const hasWebSearchCitations = webSearchReferences.length > 0 || Boolean(webSearchStatus)
  if (!blocks.length && !hasKnowledgeCitations && !hasWebSearchCitations) {
    return null
  }

  return (
    <>
      {hasKnowledgeCitations && (
        <KnowledgeCitationSummary references={knowledgeReferences} />
      )}
      {hasWebSearchCitations && (
        <WebSearchCitationSummary
          references={webSearchReferences}
          status={webSearchStatus}
        />
      )}
      {blocks.map((block) =>
        block.kind === 'svg' ? (
          <SvgPreviewCard block={block} key={block.id} onPreview={onPreview} />
        ) : webSearchReferences.length > 0 ? (
          <WebSearchAnswerContent
            content={formatChatDisplayMarkdown(block.markdown)}
            key={block.id}
            references={webSearchReferences}
            renderContent={(markdown) => (
              <MarkdownRenderer>{markdown}</MarkdownRenderer>
            )}
          />
        ) : (
          <KnowledgeAnswerContent
            content={formatChatDisplayMarkdown(block.markdown)}
            key={block.id}
            references={knowledgeReferences}
            renderContent={(markdown) => (
              <MarkdownRenderer>{markdown}</MarkdownRenderer>
            )}
          />
        ),
      )}
    </>
  )
}

interface SvgPreviewCardProps {
  block: SvgPreviewBlock
  onPreview: (item: ImagePreviewItem) => void
}

function SvgPreviewCard({ block, onPreview }: SvgPreviewCardProps) {
  return (
    <div className="message-svg-card">
      <button
        type="button"
        className="message-image-thumb message-svg-thumb"
        aria-label={`查看 ${block.filename}`}
        onClick={() => onPreview({ name: block.filename, src: block.dataUrl })}
      >
        <img src={block.dataUrl} alt={block.filename} />
      </button>
      <IconButton
        icon={<Download />}
        label="下载 SVG"
        disabled={block.status !== 'complete'}
        onClick={() => downloadSvg(block)}
      />
      {block.status === 'streaming' && (
        <span className="message-svg-status">生成中</span>
      )}
    </div>
  )
}

interface MessageAttachmentsProps {
  attachments: ChatAttachment[]
  onPreview: (item: ImagePreviewItem) => void
}

function MessageAttachments({ attachments, onPreview }: MessageAttachmentsProps) {
  if (!attachments.length) return null

  const imageAttachments = attachments.filter(
    (attachment) => attachment.kind === 'image' && attachment.dataUrl,
  )
  const fileAttachments = attachments.filter(
    (attachment) => attachment.kind !== 'image' || !attachment.dataUrl,
  )

  return (
    <div className="message-attachments">
      {imageAttachments.length > 0 && (
        <div className="message-image-grid">
          {imageAttachments.map((attachment) => (
            <button
              type="button"
              className="message-image-thumb"
              key={attachment.id}
              aria-label={`查看 ${attachment.name}`}
              onClick={() =>
                onPreview({
                  name: attachment.name,
                  src: attachment.dataUrl as string,
                })
              }
            >
              <img src={attachment.dataUrl} alt={attachment.name} />
            </button>
          ))}
        </div>
      )}
      {fileAttachments.length > 0 && (
        <div className="message-file-list">
          {fileAttachments.map((attachment) => (
            <span className="attachment-pill" key={attachment.id}>
              <FileText />
              <span>{attachment.name}</span>
              <small>{formatAttachmentSize(attachment.size)}</small>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function downloadSvg(block: SvgPreviewBlock) {
  const blob = new Blob([block.svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = block.filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
