import {
  ArrowUp,
  Eraser,
  Globe,
  Lightbulb,
  MessageSquare,
  Paperclip,
  FileSearch,
  Square,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ChatQuickPhraseControl } from '@/features/quick-phrases/components/ChatQuickPhraseControl'
import {
  type ChatAttachmentCapability,
  getFileAttachmentError,
} from '@/features/chat/model/attachments'
import { useComposerFileDrop } from '@/features/chat/hooks/useComposerFileDrop'
import { THINKING_OPTIONS, getThinkingOption } from '@/shared/model/thinking'
import { createChatAttachment } from '@/features/chat/infrastructure/fileAttachmentReader'
import type {
  ChatAttachment,
  KnowledgeBase,
  PromptInjectionMode,
  QuickPhrase,
  QuickPhraseGroup,
  ThinkingMode,
  WebSearchProviderId,
  WebSearchSettings,
} from '@/shared/types'
import { IconButton } from '@/shared/ui/IconButton'
import { resolvePreferredWebSearchProvider } from '@/features/web-search/model/webSearchSettings'
import { ComposerAttachmentPills } from './ComposerAttachmentPills'
import { WebSearchProviderMenu } from './WebSearchProviderMenu'

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
  knowledgeBases?: KnowledgeBase[]
  quickPhraseGroups?: QuickPhraseGroup[]
  quickPhrases?: QuickPhrase[]
  selectedKnowledgeBaseIds?: string[]
  webSearchEnabled?: boolean
  webSearchProviderId?: WebSearchProviderId
  webSearchSettings?: WebSearchSettings
  onAttachmentsChange: (attachments: ChatAttachment[]) => void
  onChange: (value: string) => void
  onDirectSendQuickPhrase?: (content: string) => void
  onClearMessages: () => void
  onKnowledgeSelectionChange?: (baseIds: string[]) => void
  onPromptInjectionModeChange: (mode: PromptInjectionMode) => void
  onStop?: () => void
  onSend: () => void
  onWebSearchEnabledChange?: (enabled: boolean) => void
  onWebSearchProviderChange?: (providerId?: WebSearchProviderId) => void
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
  knowledgeBases = [],
  quickPhraseGroups = [],
  quickPhrases = [],
  selectedKnowledgeBaseIds = [],
  webSearchEnabled = false,
  webSearchProviderId,
  webSearchSettings,
  onAttachmentsChange,
  onChange,
  onDirectSendQuickPhrase,
  onClearMessages,
  onKnowledgeSelectionChange,
  onPromptInjectionModeChange,
  onStop,
  onSend,
  onWebSearchEnabledChange,
  onWebSearchProviderChange,
  onThinkingModeChange,
}: ChatComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const knowledgeMenuRef = useRef<HTMLDivElement>(null)
  const quickPhraseMenuRef = useRef<HTMLDivElement>(null)
  const webSearchMenuRef = useRef<HTMLDivElement>(null)
  const promptModeMenuRef = useRef<HTMLDivElement>(null)
  const thinkingMenuRef = useRef<HTMLDivElement>(null)
  const [attachmentError, setAttachmentError] = useState('')
  const [promptModeMenuOpen, setPromptModeMenuOpen] = useState(false)
  const [thinkingMenuOpen, setThinkingMenuOpen] = useState(false)
  const [knowledgeMenuOpen, setKnowledgeMenuOpen] = useState(false)
  const [quickPhraseMenuOpen, setQuickPhraseMenuOpen] = useState(false)
  const [webSearchMenuOpen, setWebSearchMenuOpen] = useState(false)
  const activeThinkingOption = getThinkingOption(thinkingMode)
  const activeWebSearchProvider = webSearchSettings
    ? resolvePreferredWebSearchProvider(
        webSearchSettings,
        webSearchProviderId ?? webSearchSettings.defaultProviderId,
      )
    : undefined
  const webSearchProviders = webSearchSettings?.providers ?? []
  const promptModeLabel =
    promptInjectionMode === 'system' ? '系统提示词' : '用户提示词'
  const hasContent = Boolean(input.trim() || attachments.length)
  const sendDisabled = !generating && (busy || disabled || !hasContent)
  const acceptedFileTypes =
    'image/*,.txt,.md,.markdown,.csv,.html,.htm,.pdf,.doc,.docx,.pptx,.xls,.xlsx,.epub'

  useEffect(() => {
    if (!attachmentError) return

    const timer = window.setTimeout(() => setAttachmentError(''), 3000)
    return () => window.clearTimeout(timer)
  }, [attachmentError])

  useEffect(() => {
    if (
      !thinkingMenuOpen &&
      !promptModeMenuOpen &&
      !knowledgeMenuOpen &&
      !quickPhraseMenuOpen &&
      !webSearchMenuOpen
    ) return

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node
      if (
        knowledgeMenuRef.current?.contains(target) ||
        quickPhraseMenuRef.current?.contains(target) ||
        (target instanceof Element && target.closest('.quick-phrase-picker-menu')) ||
        webSearchMenuRef.current?.contains(target) ||
        thinkingMenuRef.current?.contains(target) ||
        promptModeMenuRef.current?.contains(target)
      ) {
        return
      }
      setThinkingMenuOpen(false)
      setPromptModeMenuOpen(false)
      setKnowledgeMenuOpen(false)
      setQuickPhraseMenuOpen(false)
      setWebSearchMenuOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setThinkingMenuOpen(false)
      setPromptModeMenuOpen(false)
      setKnowledgeMenuOpen(false)
      setQuickPhraseMenuOpen(false)
      setWebSearchMenuOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [
    knowledgeMenuOpen,
    promptModeMenuOpen,
    quickPhraseMenuOpen,
    thinkingMenuOpen,
    webSearchMenuOpen,
  ])

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
      try {
        nextAttachments.push(await createChatAttachment(file))
      } catch (readError) {
        setAttachmentError(
          `${file.name || '文件'}：${
            readError instanceof Error ? readError.message : '文件读取失败'
          }`,
        )
      }
    }

    if (nextAttachments.length) {
      onAttachmentsChange([...attachments, ...nextAttachments])
    }
  }
  const { fileDropHandlers, isFileDragging } = useComposerFileDrop({
    disabled,
    onFiles: (files) => void addFiles(files),
  })

  const handleSend = () => {
    if (generating) onStop?.()
    else if (!sendDisabled) onSend()
  }

  return (
    <div className="composer">
      <div
        className={`composer-input-surface ${isFileDragging ? 'is-file-dragging' : ''}`}
        {...fileDropHandlers}
      >
        <ComposerAttachmentPills
          attachments={attachments}
          onRemove={(attachmentId) =>
            onAttachmentsChange(
              attachments.filter((item) => item.id !== attachmentId),
            )
          }
        />
        {selectedKnowledgeBaseIds.length > 0 && (
          <div className="composer-knowledge-tags" aria-label="已选知识库">
            {selectedKnowledgeBaseIds.map((baseId) => {
              const base = knowledgeBases.find((item) => item.id === baseId)
              return (
                <span className="knowledge-pill" key={baseId}>
                  <FileSearch />
                  <span>{base?.name ?? '知识库'}</span>
                  <button
                    type="button"
                    aria-label={`移除 ${base?.name ?? '知识库'}`}
                    onClick={() =>
                      onKnowledgeSelectionChange?.(
                        selectedKnowledgeBaseIds.filter((id) => id !== baseId),
                      )
                    }
                  >
                    <X />
                  </button>
                </span>
              )
            })}
          </div>
        )}
        <textarea
          ref={textareaRef}
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
      {attachmentError && (
        <div className="composer-error-toast" role="alert">
          {attachmentError}
        </div>
      )}
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
          <div className="composer-menu-shell" ref={knowledgeMenuRef}>
            <IconButton
              active={knowledgeMenuOpen || selectedKnowledgeBaseIds.length > 0}
              icon={<FileSearch />}
              label="知识库"
              onClick={() => {
                setKnowledgeMenuOpen((value) => !value)
                setPromptModeMenuOpen(false)
                setThinkingMenuOpen(false)
                setWebSearchMenuOpen(false)
                setQuickPhraseMenuOpen(false)
              }}
            />
            {knowledgeMenuOpen && (
              <div className="composer-menu knowledge-menu">
                <button
                  type="button"
                  onClick={() => onKnowledgeSelectionChange?.([])}
                >
                  <span>清除</span>
                  <small>清除选中的知识库</small>
                </button>
                {knowledgeBases.map((base) => {
                  const selected = selectedKnowledgeBaseIds.includes(base.id)
                  return (
                    <button
                      type="button"
                      className={selected ? 'is-active' : ''}
                      key={base.id}
                      onClick={() => {
                        onKnowledgeSelectionChange?.(
                          selected
                            ? selectedKnowledgeBaseIds.filter((id) => id !== base.id)
                            : [...selectedKnowledgeBaseIds, base.id],
                        )
                      }}
                    >
                      <span>{base.name}</span>
                      <small>{selected ? '已选择' : '点击加载'}</small>
                    </button>
                  )
                })}
                {!knowledgeBases.length && (
                  <button type="button">
                    <span>暂无知识库</span>
                    <small>先到知识库页面创建</small>
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="composer-menu-shell" ref={webSearchMenuRef}>
            <IconButton
              active={webSearchMenuOpen || webSearchEnabled}
              icon={<Globe />}
              label={`网络搜索：${activeWebSearchProvider?.name ?? '未配置'}`}
              onClick={() => {
                setWebSearchMenuOpen((value) => !value)
                setKnowledgeMenuOpen(false)
                setPromptModeMenuOpen(false)
                setThinkingMenuOpen(false)
                setQuickPhraseMenuOpen(false)
              }}
            />
            {webSearchMenuOpen && (
              <WebSearchProviderMenu
                activeProviderId={activeWebSearchProvider?.id}
                enabled={webSearchEnabled}
                providers={webSearchProviders}
                onDisable={() => {
                  onWebSearchEnabledChange?.(false)
                  setWebSearchMenuOpen(false)
                }}
                onSelect={(providerId) => {
                  onWebSearchProviderChange?.(providerId)
                  onWebSearchEnabledChange?.(true)
                  setWebSearchMenuOpen(false)
                }}
              />
            )}
          </div>
          <ChatQuickPhraseControl
            busy={busy}
            disabled={disabled}
            generating={generating}
            groups={quickPhraseGroups}
            input={input}
            menuOpen={quickPhraseMenuOpen}
            phrases={quickPhrases}
            shellRef={quickPhraseMenuRef}
            textareaRef={textareaRef}
            onChange={onChange}
            onCloseMenu={() => setQuickPhraseMenuOpen(false)}
            onDirectSend={onDirectSendQuickPhrase}
            onToggleMenu={() => {
              setQuickPhraseMenuOpen((value) => !value)
              setKnowledgeMenuOpen(false)
              setPromptModeMenuOpen(false)
              setThinkingMenuOpen(false)
              setWebSearchMenuOpen(false)
            }}
          />
          <div className="composer-menu-shell" ref={promptModeMenuRef}>
            <IconButton
              active={promptModeMenuOpen}
              icon={<MessageSquare />}
              label={`提示词模式：${promptModeLabel}`}
              onClick={() => {
                setPromptModeMenuOpen((value) => !value)
                setKnowledgeMenuOpen(false)
                setQuickPhraseMenuOpen(false)
                setThinkingMenuOpen(false)
                setWebSearchMenuOpen(false)
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
                  setKnowledgeMenuOpen(false)
                  setQuickPhraseMenuOpen(false)
                  setPromptModeMenuOpen(false)
                  setWebSearchMenuOpen(false)
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
