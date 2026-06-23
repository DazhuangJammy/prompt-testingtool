import type { ChatKnowledgeReference } from '@/shared/types'

export interface KnowledgeCitation {
  number: number
  reference: ChatKnowledgeReference
}

export function createKnowledgeCitations(
  references: ChatKnowledgeReference[] = [],
): KnowledgeCitation[] {
  return references.map((reference, index) => ({
    number: index + 1,
    reference,
  }))
}

export function normalizeKnowledgeCitationContent(content: string) {
  return content.trim().replace(/\s+/g, ' ')
}

export function summarizeKnowledgeCitation(
  reference: ChatKnowledgeReference,
  maxLength = 120,
) {
  const content = normalizeKnowledgeCitationContent(reference.content)
  if (content.length <= maxLength) return content
  return `${content.slice(0, maxLength)}...`
}

export function appendMissingKnowledgeCitationMarks(
  content: string,
  citations: KnowledgeCitation[],
) {
  if (!content.trim() || !citations.length) return content

  const usedNumbers = new Set<number>()
  const markRegex = /(?<!!)\[(\d+)\](?!\()/g
  let match: RegExpExecArray | null

  while ((match = markRegex.exec(content)) !== null) {
    usedNumbers.add(Number(match[1]))
  }

  const missingMarks = citations
    .filter((citation) => !usedNumbers.has(citation.number))
    .map((citation) => `[${citation.number}]`)

  if (!missingMarks.length) return content
  return `${content.trimEnd()} ${missingMarks.join('')}`
}

export function linkKnowledgeCitationMarks(
  content: string,
  citations: KnowledgeCitation[],
) {
  if (!content.trim() || !citations.length) return content

  const citationNumbers = new Set(citations.map((citation) => citation.number))
  return content.replace(/(?<!!)\[(\d+)\](?!\()/g, (mark, rawNumber) => {
    const number = Number(rawNumber)
    if (!citationNumbers.has(number)) return mark
    return `[[${number}]](#knowledge-citation-${number})`
  })
}
