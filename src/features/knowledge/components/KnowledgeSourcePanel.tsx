import {
  Check,
  FileText,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import type { RefObject } from 'react'
import { formatAttachmentSize } from '@/features/chat/model/attachments'
import type { KnowledgeItem, KnowledgeProviderType, KnowledgeSourceType } from '@/shared/types'
import { IconButton } from '@/shared/ui/IconButton'
import { KNOWLEDGE_SOURCE_LABELS } from '../model/knowledge'

export function SourceActions({
  activeSource,
  busy,
  fileInputRef,
  onAddDialog,
  onFiles,
  providerType,
}: {
  activeSource: KnowledgeSourceType
  busy: boolean
  fileInputRef: RefObject<HTMLInputElement | null>
  onAddDialog: (dialog: 'note' | 'url' | 'website') => void
  onFiles: (files: File[]) => Promise<void>
  providerType: KnowledgeProviderType
}) {
  if (activeSource === 'file' || activeSource === 'directory') {
    const directoryInputProps =
      activeSource === 'directory'
        ? ({ webkitdirectory: '', directory: '' } as Record<string, string>)
        : {}
    return (
      <div
        className="knowledge-dropzone"
        role="button"
        tabIndex={0}
        onClick={() => {
          if (!busy) fileInputRef.current?.click()
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          if (!busy) void onFiles(Array.from(event.dataTransfer.files))
        }}
        onKeyDown={(event) => {
          if (!busy && (event.key === 'Enter' || event.key === ' ')) fileInputRef.current?.click()
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          disabled={busy}
          {...directoryInputProps}
          onChange={(event) => {
            void onFiles(Array.from(event.target.files ?? []))
            event.target.value = ''
          }}
        />
        <strong>{busy ? '正在索引资料' : '拖拽或点击上传文件'}</strong>
        <span>
          {providerType === 'bailian'
            ? '百炼文档格式 · 单个文件最大 100MB'
            : '支持 TXT、MD、HTML、PDF、DOCX、PPTX、XLSX、CSV、EPUB'}
        </span>
      </div>
    )
  }
  return (
    <div className="knowledge-source-actionbar">
      <button type="button" onClick={() => onAddDialog(activeSource as 'note' | 'url' | 'website')}>
        <Plus />
        添加{KNOWLEDGE_SOURCE_LABELS[activeSource]}
      </button>
    </div>
  )
}

export function KnowledgeItemList({
  busy,
  items,
  onDelete,
  onReindex,
}: {
  busy: boolean
  items: KnowledgeItem[]
  onDelete: (item: KnowledgeItem) => void
  onReindex?: (item: KnowledgeItem) => void
}) {
  if (!items.length) {
    return <div className="knowledge-list-empty">{busy ? '正在处理资料' : '暂无资料'}</div>
  }

  return (
    <div className="knowledge-item-list">
      {items.map((item) => (
        <article className="knowledge-item-row" key={item.id}>
          <FileText />
          <div>
            <strong>{item.title}</strong>
            <span>
              {KNOWLEDGE_SOURCE_LABELS[item.sourceType]} ·{' '}
              {item.size ? formatAttachmentSize(item.size) : '文本'} · {STATUS_LABELS[item.status]}
            </span>
            {item.error && <small>{item.error}</small>}
          </div>
          <StatusIcon item={item} />
          {onReindex && (
            <IconButton disabled={busy} icon={<RefreshCw />} label="重建索引" onClick={() => onReindex(item)} />
          )}
          <IconButton disabled={busy} icon={<Trash2 />} label="删除" onClick={() => onDelete(item)} />
        </article>
      ))}
    </div>
  )
}

const STATUS_LABELS: Record<KnowledgeItem['status'], string> = {
  idle: '等待处理',
  processing: '处理中',
  reading: '读取中',
  embedding: '索引中',
  completed: '已完成',
  failed: '失败',
  deleting: '删除中',
}

function StatusIcon({ item }: { item: KnowledgeItem }) {
  if (item.status === 'completed') return <Check className="knowledge-status-icon" />
  if (item.status === 'failed') return <MoreHorizontal className="knowledge-status-icon is-failed" />
  return <LoaderCircle className="knowledge-status-icon is-loading" />
}
