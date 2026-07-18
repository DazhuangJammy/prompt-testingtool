export interface MarkdownHeadingMatch {
  lineIndex: number
  depth: number
  title: string
}

interface MarkdownLineState {
  codeFence: boolean
  protectedBlock: boolean
}

type MarkdownLineVisitor<T> = (
  line: string,
  lineIndex: number,
  state: MarkdownLineState,
) => T

const codeFencePattern = /^\s*(`{3,}|~{3,})/
const doubleQuoteFencePattern = /^\s*("{3,})\s*$/
const headingPattern = /^(#{1,6})\s+(.+?)\s*#*\s*$/
const thinkOpenPattern = /<think(?:\s+[^>/][^>]*)?>/i
const thinkClosePattern = /<\/think\s*>|<think\s*\/>/i
const protectedHeadingPattern = /^(\s{0,3})(#{1,6})(\s+)/

export function collectMarkdownHeadingsOutsideProtectedBlocks(lines: string[]) {
  const headings: MarkdownHeadingMatch[] = []

  scanMarkdownLines(lines, (line, lineIndex, state) => {
    if (state.codeFence || state.protectedBlock) return

    const headingMatch = line.match(headingPattern)
    if (!headingMatch) return

    headings.push({
      lineIndex,
      depth: headingMatch[1].length,
      title: headingMatch[2].trim(),
    })
  })

  return headings
}

export function escapeProtectedMarkdownHeadings(markdown: string) {
  return scanMarkdownLines(normalizeLineEndings(markdown).split('\n'), (
    line,
    _lineIndex,
    state,
  ) => {
    if (!state.protectedBlock) return line
    return line.replace(protectedHeadingPattern, '$1\\$2$3')
  }).join('\n')
}

function scanMarkdownLines<T>(
  lines: string[],
  visit: MarkdownLineVisitor<T>,
): T[] {
  let codeFenceMarker: string | undefined
  let doubleQuoteFenceLength: number | undefined
  let insideThinkBlock = false

  return lines.map((line, lineIndex) => {
    if (doubleQuoteFenceLength !== undefined) {
      const result = visit(line, lineIndex, {
        codeFence: false,
        protectedBlock: true,
      })
      const closeFenceLength = getDoubleQuoteFenceLength(line)
      if (
        closeFenceLength !== undefined &&
        closeFenceLength >= doubleQuoteFenceLength
      ) {
        doubleQuoteFenceLength = undefined
      }
      return result
    }

    if (insideThinkBlock) {
      const result = visit(line, lineIndex, {
        codeFence: false,
        protectedBlock: true,
      })
      if (thinkClosePattern.test(line)) insideThinkBlock = false
      return result
    }

    const codeFenceMatch = line.match(codeFencePattern)
    if (codeFenceMatch) {
      const marker = codeFenceMatch[1][0]
      const closesFence = codeFenceMarker === marker
      if (!codeFenceMarker) {
        codeFenceMarker = marker
      } else if (closesFence) {
        codeFenceMarker = undefined
      }

      return visit(line, lineIndex, {
        codeFence: true,
        protectedBlock: false,
      })
    }

    if (codeFenceMarker) {
      return visit(line, lineIndex, {
        codeFence: true,
        protectedBlock: false,
      })
    }

    const doubleQuoteFenceStart = getDoubleQuoteFenceLength(line)
    if (doubleQuoteFenceStart !== undefined) {
      doubleQuoteFenceLength = doubleQuoteFenceStart
      return visit(line, lineIndex, {
        codeFence: false,
        protectedBlock: true,
      })
    }

    const thinkOpenMatch = line.match(thinkOpenPattern)
    if (thinkOpenMatch) {
      const afterOpen = line.slice(
        (thinkOpenMatch.index ?? 0) + thinkOpenMatch[0].length,
      )
      insideThinkBlock = !thinkClosePattern.test(afterOpen)
      return visit(line, lineIndex, {
        codeFence: false,
        protectedBlock: true,
      })
    }

    return visit(line, lineIndex, {
      codeFence: false,
      protectedBlock: false,
    })
  })
}

function getDoubleQuoteFenceLength(line: string) {
  return line.match(doubleQuoteFencePattern)?.[1].length
}

function normalizeLineEndings(markdown: string) {
  return markdown.replace(/\r\n?/g, '\n')
}
