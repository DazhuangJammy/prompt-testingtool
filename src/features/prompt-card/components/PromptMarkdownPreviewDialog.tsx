import { Copy, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { IconButton } from '@/shared/ui/IconButton'

interface PromptMarkdownPreviewDialogProps {
  markdown: string
  title: string
  onClose: () => void
  onCopy: () => void
}

export function PromptMarkdownPreviewDialog({
  markdown,
  onClose,
  onCopy,
  title,
}: PromptMarkdownPreviewDialogProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return createPortal(
    <div
      className="prompt-preview-backdrop nodrag nopan nowheel"
      onClick={onClose}
    >
      <section
        aria-label="提示词预览"
        className="prompt-preview-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="prompt-preview-head">
          <div>
            <span>Markdown 预览</span>
            <strong>{title}</strong>
          </div>
          <div className="prompt-preview-actions">
            <IconButton icon={<Copy />} label="复制" onClick={onCopy} />
            <IconButton icon={<X />} label="关闭" onClick={onClose} />
          </div>
        </div>
        <article className="prompt-preview-body markdown-preview">
          <ReactMarkdown>{markdown}</ReactMarkdown>
        </article>
      </section>
    </div>,
    document.body,
  )
}
