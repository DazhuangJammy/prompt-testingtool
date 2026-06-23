import type { WebSearchReference, WebSearchSettings } from '@/shared/types'

export interface WebSearchContextResult {
  context: string
  references: WebSearchReference[]
}

export function createWebSearchContext(
  references: WebSearchReference[],
  settings: Pick<WebSearchSettings, 'compression'>,
): WebSearchContextResult {
  const normalizedReferences = references
    .filter((reference) => reference.url.trim())
    .map((reference) => ({
      ...reference,
      title: reference.title.trim() || reference.url,
      content: normalizeResultContent(reference.content),
      url: reference.url.trim(),
    }))

  if (!normalizedReferences.length) return { context: '', references: [] }

  const today = new Date().toISOString().slice(0, 10)
  const cutoffLimit = settings.compression.method === 'cutoff'
    ? settings.compression.cutoffLimit
    : undefined
  const resultLines = normalizedReferences
    .map((reference, index) => {
      const number = index + 1
      const content = cutoffLimit
        ? reference.content.slice(0, cutoffLimit)
        : reference.content
      return [
        `[${number}] ${reference.title}`,
        `URL: ${reference.url}`,
        `摘要: ${content || reference.title}`,
      ].join('\n')
    })
    .join('\n\n')

  return {
    context: [
      `# 联网搜索结果（搜索日期：${today}）`,
      '请优先使用这些搜索结果回答。引用某条搜索结果时，在句末使用对应的 [数字] 标记，例如 [1]。不要编造这里没有的来源。',
      resultLines,
    ].join('\n\n'),
    references: normalizedReferences,
  }
}

export function appendMissingWebSearchCitationMarks(
  content: string,
  references: readonly WebSearchReference[],
) {
  if (!content.trim() || !references.length) return content
  const usedNumbers = new Set<number>()
  const markRegex = /(?<!!)\[(\d+)\](?!\()/g
  let match: RegExpExecArray | null

  while ((match = markRegex.exec(content)) !== null) {
    usedNumbers.add(Number(match[1]))
  }

  const missingMarks = references
    .map((_, index) => index + 1)
    .filter((number) => !usedNumbers.has(number))
    .map((number) => `[${number}]`)

  if (!missingMarks.length) return content
  return `${content.trimEnd()} ${missingMarks.join('')}`
}

export function summarizeWebSearchReference(
  reference: WebSearchReference,
  maxLength = 120,
) {
  const content = normalizeResultContent(reference.content || reference.title)
  if (content.length <= maxLength) return content
  return `${content.slice(0, maxLength)}...`
}

function normalizeResultContent(content: string) {
  return content.trim().replace(/\s+/g, ' ')
}
