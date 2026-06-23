import { FileSearch, X } from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'
import type { ChatKnowledgeReference } from '@/shared/types'
import { MarkdownRenderer } from '@/shared/ui/MarkdownRenderer'
import {
  createKnowledgeCitations,
  linkKnowledgeCitationMarks,
  summarizeKnowledgeCitation,
  type KnowledgeCitation,
} from '@/features/chat/model/knowledgeCitations'

interface KnowledgeCitationSummaryProps {
  references: ChatKnowledgeReference[]
}

export function KnowledgeCitationSummary({
  references,
}: KnowledgeCitationSummaryProps) {
  const [open, setOpen] = useState(false)
  const citations = useMemo(
    () => createKnowledgeCitations(references),
    [references],
  )

  if (!citations.length) return null

  return (
    <>
      <button
        type="button"
        className="knowledge-citation-summary"
        onClick={() => setOpen(true)}
      >
        <span className="knowledge-citation-stack" aria-hidden="true">
          {citations.slice(0, 3).map((citation) => (
            <span key={citation.reference.chunkId}>
              <FileSearch />
            </span>
          ))}
        </span>
        <span>{citations.length} 个引用内容</span>
      </button>
      {open && (
        <KnowledgeCitationDialog
          citations={citations}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

interface KnowledgeAnswerContentProps {
  content: string
  references: ChatKnowledgeReference[]
  renderContent: (content: string) => ReactNode
}

export function KnowledgeAnswerContent({
  content,
  references,
  renderContent,
}: KnowledgeAnswerContentProps) {
  const citations = useMemo(
    () => createKnowledgeCitations(references),
    [references],
  )
  const citationByNumber = useMemo(
    () => new Map(citations.map((citation) => [citation.number, citation])),
    [citations],
  )
  const contentWithMarks = useMemo(
    () => linkKnowledgeCitationMarks(content, citations),
    [citations, content],
  )

  if (!citations.length) return <>{renderContent(content)}</>

  const components: ComponentProps<typeof MarkdownRenderer>['components'] = {
    p({ children }) {
      return <p>{children}</p>
    },
    a({ children, href }) {
      const citationMatch = typeof href === 'string'
        ? href.match(/^#knowledge-citation-(\d+)$/)
        : undefined
      if (citationMatch) {
        const citation = citationByNumber.get(Number(citationMatch[1]))
        if (citation) {
          return <KnowledgeCitationMarker citation={citation} />
        }
      }

      return (
        <a href={href}>
          {children}
        </a>
      )
    },
  }

  return <MarkdownRenderer components={components}>{contentWithMarks}</MarkdownRenderer>
}

interface KnowledgeCitationDialogProps {
  citations: KnowledgeCitation[]
  onClose: () => void
}

function KnowledgeCitationDialog({
  citations,
  onClose,
}: KnowledgeCitationDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="knowledge-citation-backdrop"
      role="presentation"
      onPointerDown={(event) => {
        if (!dialogRef.current?.contains(event.target as Node)) onClose()
      }}
    >
      <div
        aria-label="引用内容"
        aria-modal="true"
        className="knowledge-citation-dialog"
        ref={dialogRef}
        role="dialog"
      >
        <header>
          <strong>引用内容</strong>
          <button type="button" aria-label="关闭引用内容" onClick={onClose}>
            <X />
          </button>
        </header>
        <div className="knowledge-citation-dialog-list">
          {citations.map((citation) => (
            <article key={citation.reference.chunkId}>
              <div className="knowledge-citation-dialog-title">
                <FileSearch />
                <strong>{citation.reference.itemTitle}</strong>
                <span>{citation.number}</span>
              </div>
              <p>{citation.reference.content}</p>
              <small>{citation.reference.baseName}</small>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}

interface KnowledgeCitationMarkerProps {
  citation: KnowledgeCitation
}

function KnowledgeCitationMarker({ citation }: KnowledgeCitationMarkerProps) {
  return (
    <span className="knowledge-citation-marker-wrap">
      <button
        type="button"
        className="knowledge-citation-marker"
        aria-label={`引用 ${citation.number}：${citation.reference.itemTitle}`}
      >
        {citation.number}
      </button>
      <span className="knowledge-citation-tooltip" role="tooltip">
        <strong>{citation.reference.itemTitle}</strong>
        <span>{summarizeKnowledgeCitation(citation.reference, 96)}</span>
        <small>{citation.reference.baseName}</small>
      </span>
    </span>
  )
}
