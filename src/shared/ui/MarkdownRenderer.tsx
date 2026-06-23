import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ComponentProps } from 'react'

interface MarkdownRendererProps {
  children: string
  components?: ComponentProps<typeof ReactMarkdown>['components']
}

export function MarkdownRenderer({ children, components }: MarkdownRendererProps) {
  return (
    <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
      {children}
    </ReactMarkdown>
  )
}
