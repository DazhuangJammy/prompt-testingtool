const DASH_ITEM_BREAK_PATTERN =
  /([。！？!?；;.!]["'”’）】》」』]*)([ \t]+)(—[ \t]+)/g
const FENCED_CODE_BLOCK_PATTERN = /```[\s\S]*?(?:```|$)/g
const SENTENCE_END_PATTERN = /[。！？!?；;.!]["'”’）】》」』]*$/
const DASH_ITEM_START_PATTERN = /^—[ \t]+/
const PARAGRAPH_BREAK = '\n\n'

export function formatChatDisplayMarkdown(markdown: string) {
  if (!markdown.trim()) return markdown

  const parts: string[] = []
  let cursor = 0

  for (const match of markdown.matchAll(FENCED_CODE_BLOCK_PATTERN)) {
    if (match.index === undefined) continue
    parts.push(formatTextSegment(markdown.slice(cursor, match.index)))
    parts.push(match[0])
    cursor = match.index + match[0].length
  }

  parts.push(formatTextSegment(markdown.slice(cursor)))
  return parts.join('')
}

function formatTextSegment(segment: string) {
  const lines = splitLines(segment)
  return lines
    .map((line, index) => {
      const text = shouldKeepLineUntouched(line.text)
        ? line.text
        : line.text.replace(DASH_ITEM_BREAK_PATTERN, `$1${PARAGRAPH_BREAK}$3`)
      const nextLine = lines[index + 1]
      const readableText = shouldPromoteDashSoftBreak(line.text, nextLine?.text)
        ? `${text}\n`
        : text
      return `${readableText}${line.ending}`
    })
    .join('')
}

function splitLines(segment: string) {
  const lines: Array<{ text: string; ending: string }> = []
  const linePattern = /([^\r\n]*)(\r?\n|$)/g
  let match: RegExpExecArray | null

  while ((match = linePattern.exec(segment)) !== null) {
    if (match[0] === '' && match.index === segment.length) break
    lines.push({ text: match[1], ending: match[2] })
  }

  return lines
}

function shouldPromoteDashSoftBreak(currentLine: string, nextLine = '') {
  if (shouldKeepLineUntouched(currentLine) || shouldKeepLineUntouched(nextLine)) {
    return false
  }
  return (
    SENTENCE_END_PATTERN.test(currentLine.trimEnd()) &&
    DASH_ITEM_START_PATTERN.test(nextLine.trimStart())
  )
}

function shouldKeepLineUntouched(line: string) {
  return line.trimStart().startsWith('|')
}
