import { ExternalLink, Search, X } from 'lucide-react'
import {
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'
import type { WebSearchReference, WebSearchStreamStatus } from '@/shared/types'
import { MarkdownRenderer } from '@/shared/ui/MarkdownRenderer'
import {
  appendMissingWebSearchCitationMarks,
  summarizeWebSearchReference,
} from '@/features/web-search/model/webSearchContext'

interface WebSearchCitationSummaryProps {
  references: WebSearchReference[]
  status?: WebSearchStreamStatus
}

export function WebSearchCitationSummary({
  references,
  status,
}: WebSearchCitationSummaryProps) {
  const [expanded, setExpanded] = useState(false)
  if (!references.length && !status) return null
  const resultCount = status?.count ?? references.length

  return (
    <section className="web-search-results">
      <button
        type="button"
        className="web-search-results-head"
        onClick={() => setExpanded((value) => !value)}
      >
        <Search />
        <span>{formatWebSearchStatus(status, resultCount)}</span>
        <small>
          {status?.providerName ?? references[0]?.providerName ?? '网络搜索'}
        </small>
      </button>
      {expanded && references.length > 0 && (
        <div className="web-search-results-list">
          {references.map((reference, index) => (
            <a
              href={reference.url}
              target="_blank"
              rel="noreferrer"
              key={`${reference.url}-${index}`}
            >
              <span>{index + 1}</span>
              <strong>{reference.title || reference.url}</strong>
              <small>{reference.url}</small>
            </a>
          ))}
        </div>
      )}
    </section>
  )
}

function formatWebSearchStatus(
  status: WebSearchStreamStatus | undefined,
  resultCount: number,
) {
  if (!status) return `${resultCount} 个搜索结果`
  if (status.phase === 'preparing') return status.message ?? '准备联网搜索'
  if (status.phase === 'searching') {
    return status.query ? `正在搜索：${status.query}` : '正在搜索'
  }
  if (status.phase === 'error') return status.message ?? '搜索失败'
  return `${resultCount} 个搜索结果`
}

interface WebSearchAnswerContentProps {
  content: string
  references: WebSearchReference[]
  renderContent: (content: string) => ReactNode
}

export function WebSearchAnswerContent({
  content,
  references,
  renderContent,
}: WebSearchAnswerContentProps) {
  const contentWithMarks = useMemo(
    () =>
      linkWebSearchCitationMarks(
        appendMissingWebSearchCitationMarks(content, references),
        references,
      ),
    [content, references],
  )
  const referenceByNumber = useMemo(
    () => new Map(references.map((reference, index) => [index + 1, reference])),
    [references],
  )

  if (!references.length) return <>{renderContent(content)}</>

  const components: ComponentProps<typeof MarkdownRenderer>['components'] = {
    p({ children }) {
      return <p>{children}</p>
    },
    a({ children, href }) {
      const citationMatch = typeof href === 'string'
        ? href.match(/^#web-search-citation-(\d+)$/)
        : undefined
      if (citationMatch) {
        const number = Number(citationMatch[1])
        const reference = referenceByNumber.get(number)
        if (reference) {
          return <WebSearchCitationMarker number={number} reference={reference} />
        }
      }

      return (
        <a href={href} target="_blank" rel="noreferrer">
          {children}
        </a>
      )
    },
  }

  return <MarkdownRenderer components={components}>{contentWithMarks}</MarkdownRenderer>
}

interface WebSearchCitationMarkerProps {
  number: number
  reference: WebSearchReference
}

function WebSearchCitationMarker({
  number,
  reference,
}: WebSearchCitationMarkerProps) {
  return (
    <span className="web-search-citation-marker-wrap">
      <a
        href={reference.url}
        target="_blank"
        rel="noreferrer"
        className="web-search-citation-marker"
        aria-label={`搜索引用 ${number}：${reference.title}`}
      >
        {number}
      </a>
      <span className="web-search-citation-tooltip" role="tooltip">
        <button
          type="button"
          aria-label="关闭预览"
          onClick={(event) => event.preventDefault()}
        >
          <X />
        </button>
        <strong>{reference.title || reference.url}</strong>
        <span>{summarizeWebSearchReference(reference, 120)}</span>
        <small>
          <ExternalLink />
          {reference.url}
        </small>
      </span>
    </span>
  )
}

function linkWebSearchCitationMarks(
  content: string,
  references: readonly WebSearchReference[],
) {
  if (!content.trim() || !references.length) return content
  const citationNumbers = new Set(references.map((_, index) => index + 1))
  return content.replace(/(?<!!)\[(\d+)\](?!\()/g, (mark, rawNumber) => {
    const number = Number(rawNumber)
    if (!citationNumbers.has(number)) return mark
    return `[[${number}]](#web-search-citation-${number})`
  })
}
