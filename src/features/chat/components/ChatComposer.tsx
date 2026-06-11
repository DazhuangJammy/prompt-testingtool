import {
  ArrowUp,
  Eraser,
  FileText,
  Image,
  Lightbulb,
  MessageSquare,
  Paperclip,
  Square,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  type ChatAttachmentCapability,
  formatAttachmentSize,
  getFileAttachmentError,
} from '@/features/chat/model/attachments'
import {
  THINKING_OPTIONS,
  getThinkingOption,
} from '@/features/chat/model/thinking'
import { createChatAttachment } from '@/features/chat/infrastructure/fileAttachmentReader'
import type {
  ChatAttachment,
  PromptInjectionMode,
  ThinkingMode,
} from '@/shared/types'
import { IconButton } from '@/shared/ui/IconButton'

interface ChatComposerProps {
  attachmentCapability: ChatAttachmentCapability
  attachments: ChatAttachment[]
  busy: boolean
  canClearMessages: boolean
  disabled: boolean
  input: string
  generating?: boolean
  promptInjectionMode: PromptInjectionMode
  supportsDeepThinking: boolean
  supportsThinking: boolean
  thinkingMode: ThinkingMode
  onAttachmentsChange: (attachments: ChatAttachment[]) => void
  onChange: (value: string) => void
  onClearMessages: () => void
  onPromptInjectionModeChange: (mode: PromptInjectionMode) => void
  onStop?: () => void
  onSend: () => void
  onThinkingModeChange: (mode: ThinkingMode) => void
}

export function ChatComposer({
  attachmentCapability,
  attachments,
  busy,
  canClearMessages,
  disabled,
  generating = false,
  input,
  promptInjectionMode,
  supportsDeepThinking,
  supportsThinking,
  thinkingMode,
  onAttachmentsChange,
  onChange,
  onClearMessages,
  onPromptInjectionModeChange,
  onStop,
  onSend,
  onThinkingModeChange,
}: ChatComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const promptModeMenuRef = useRef<HTMLDivElement>(null)
  const thinkingMenuRef = useRef<HTMLDivElement>(null)
  const [attachmentError, setAttachmentError] = useState('')
  const [promptModeMenuOpen, setPromptModeMenuOpen] = useState(false)
  const [thinkingMenuOpen, setThinkingMenuOpen] = useState(false)
  const activeThinkingOption = getThinkingOption(thinkingMode)
  const promptModeLabel =
    promptInjectionMode === 'system' ? '系统提示词' : '用户提示词'
  const hasContent = Boolean(input.trim() || attachments.length)
  const sendDisabled = !generating && (busy || disabled || !hasContent)
  const acceptedFileTypes = 'image/*,.txt,.md,.pdf,.doc,.docx'

  useEffect(() => {
    if (!thinkingMenuOpen && !promptModeMenuOpen) return

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node
      if (
        thinkingMenuRef.current?.contains(target) ||
        promptModeMenuRef.current?.contains(target)
      ) {
        return
      }
      setThinkingMenuOpen(false)
      setPromptModeMenuOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setThinkingMenuOpen(false)
      setPromptModeMenuOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [promptModeMenuOpen, thinkingMenuOpen])

  const addFiles = async (files: File[]) => {
    if (!files.length) return
    const nextAttachments: ChatAttachment[] = []
    setAttachmentError('')

    for (const file of files) {
      const error = getFileAttachmentError(file, attachmentCapability)
      if (error) {
        setAttachmentError(`${file.name || '文件'}：${error}`)
        continue
      }
      nextAttachments.push(await createChatAttachment(file))
    }

    if (nextAttachments.length) {
      onAttachmentsChange([...attachments, ...nextAttachments])
    }
  }

  const handleSend = () => {
    if (generating) onStop?.()
    else if (!sendDisabled) onSend()
  }

  return (
    <div className="composer">
      <div className="composer-input-surface">
        {attachments.length > 0 && (
          <div className="composer-attachments">
            {attachments.map((attachment) => (
              <span className="attachment-pill" key={attachment.id}>
                {attachment.kind === 'image' ? <Image /> : <FileText />}
                <span>{attachment.name}</span>
                <small>{formatAttachmentSize(attachment.size)}</small>
                <button
                  type="button"
                  aria-label={`移除 ${attachment.name}`}
                  onClick={() =>
                    onAttachmentsChange(
                      attachments.filter((item) => item.id !== attachment.id),
                    )
                  }
                >
                  <X />
                </button>
              </span>
            ))}
          </div>
        )}
        <textarea
          value={input}
          placeholder="在这里输入消息，按 Enter 发送"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              handleSend()
            }
            if (event.key === 'Escape') setThinkingMenuOpen(false)
          }}
          onPaste={(event) => {
            const files = Array.from(event.clipboardData.files)
            if (!files.length) return
            event.preventDefault()
            void addFiles(files)
          }}
        />
      </div>
      {attachmentError && <div className="composer-error">{attachmentError}</div>}
      <div className="composer-toolbar">
        <div className="composer-tool-group">
          <IconButton
            icon={<Paperclip />}
            label="上传"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
          />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedFileTypes}
            onChange={(event) => {
              void addFiles(Array.from(event.target.files ?? []))
              event.target.value = ''
            }}
          />
          <div className="composer-menu-shell" ref={promptModeMenuRef}>
            <IconButton
              active={promptModeMenuOpen}
              icon={<MessageSquare />}
              label={`提示词模式：${promptModeLabel}`}
              onClick={() => {
                setPromptModeMenuOpen((value) => !value)
                setThinkingMenuOpen(false)
              }}
            />
            {promptModeMenuOpen && (
              <div className="composer-menu prompt-mode-menu">
                {[
                  { mode: 'system' as const, label: '系统', description: 'S' },
                  { mode: 'user' as const, label: '用户', description: 'U' },
                ].map((option) => (
                  <button
                    type="button"
                    className={
                      option.mode === promptInjectionMode ? 'is-active' : ''
                    }
                    key={option.mode}
                    onClick={() => {
                      onPromptInjectionModeChange(option.mode)
                      setPromptModeMenuOpen(false)
                    }}
                  >
                    <span>{option.label}</span>
                    <small>{option.description}</small>
                  </button>
                ))}
              </div>
            )}
          </div>
          {supportsThinking && (
            <div className="composer-menu-shell" ref={thinkingMenuRef}>
              <IconButton
                active={thinkingMenuOpen}
                icon={<Lightbulb />}
                label={`思考：${activeThinkingOption.label}`}
                onClick={() => {
                  setThinkingMenuOpen((value) => !value)
                  setPromptModeMenuOpen(false)
                }}
              />
              {thinkingMenuOpen && (
                <div className="composer-menu thinking-menu">
                  {THINKING_OPTIONS.filter(
                    (option) => supportsDeepThinking || option.mode !== 'deep',
                  ).map((option) => (
                    <button
                      type="button"
                      className={option.mode === thinkingMode ? 'is-active' : ''}
                      key={option.mode}
                      onClick={() => {
                        onThinkingModeChange(option.mode)
                        setThinkingMenuOpen(false)
                      }}
                    >
                      <span>{option.label}</span>
                      <small>{option.description}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <IconButton
            icon={<Eraser />}
            label="清空"
            disabled={!canClearMessages}
            onClick={() => {
              setAttachmentError('')
              onClearMessages()
            }}
          />
        </div>
        <div className="composer-status">
          <IconButton
            className="send-button"
            icon={generating ? <Square /> : <ArrowUp />}
            label={generating ? '停止' : '发送'}
            disabled={sendDisabled}
            onClick={handleSend}
          />
        </div>
      </div>
    </div>
  )
}
