import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ComponentProps } from 'react'
import { escapeProtectedMarkdownHeadings } from '@/shared/model/markdownProtection'

interface MarkdownRendererProps {
  children: string
  components?: ComponentProps<typeof ReactMarkdown>['components']
  preserveLineBreaks?: boolean
  protectSpecialBlockHeadings?: boolean
}

export function MarkdownRenderer({
  children,
  components,
  preserveLineBreaks = false,
  protectSpecialBlockHeadings = false,
}: MarkdownRendererProps) {
  const markdown = protectSpecialBlockHeadings
    ? escapeProtectedMarkdownHeadings(children)
    : children
  const resolvedComponents = preserveLineBreaks
    ? {
        ...components,
        p: PreserveLineBreakParagraph,
      }
    : components

  return (
    <ReactMarkdown components={resolvedComponents} remarkPlugins={[remarkGfm]}>
      {markdown}
    </ReactMarkdown>
  )
}

function PreserveLineBreakParagraph({
  className,
  ...props
}: ComponentProps<'p'>) {
  return (
    <p
      className={['markdown-preserve-line-breaks', className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  )
}
