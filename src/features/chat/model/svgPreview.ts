export interface SvgPreviewBlock {
  kind: 'svg'
  id: string
  svg: string
  dataUrl: string
  filename: string
  status: 'complete' | 'streaming'
}

export interface MarkdownPreviewBlock {
  kind: 'markdown'
  id: string
  markdown: string
}

export type MessagePreviewBlock = SvgPreviewBlock | MarkdownPreviewBlock

interface SvgMatch {
  start: number
  end: number
  svg: string
  status: SvgPreviewBlock['status']
}

const FENCED_BLOCK_PATTERN = /```[^\n]*\n([\s\S]*?)```/g
const SVG_START_PATTERN =
  /<svg\s+xmlns=(["'])http:\/\/www\.w3\.org\/2000\/svg\1/i
const GLOBAL_SVG_START_PATTERN =
  /<svg\s+xmlns=(["'])http:\/\/www\.w3\.org\/2000\/svg\1/gi
const RAW_SVG_PATTERN =
  /<svg\s+xmlns=(["'])http:\/\/www\.w3\.org\/2000\/svg\1[\s\S]*?<\/svg>/gi
const SVG_DOCUMENT_PATTERN =
  /^<svg\s+xmlns=(["'])http:\/\/www\.w3\.org\/2000\/svg\1[\s\S]*<\/svg>\s*$/i

export function splitSvgPreviewBlocks(content: string): MessagePreviewBlock[] {
  if (!content.trim()) return []

  const matches = collectSvgMatches(content)
  if (!matches.length) {
    return [{ kind: 'markdown', id: 'markdown-0', markdown: content }]
  }

  const blocks: MessagePreviewBlock[] = []
  let cursor = 0
  let svgIndex = 0
  let markdownIndex = 0

  for (const match of matches) {
    const before = content.slice(cursor, match.start)
    if (before.trim()) {
      blocks.push({
        kind: 'markdown',
        id: `markdown-${markdownIndex}`,
        markdown: before,
      })
      markdownIndex += 1
    }

    svgIndex += 1
    blocks.push({
      kind: 'svg',
      id: `svg-${svgIndex}`,
      svg: match.svg,
      dataUrl: svgToDataUrl(match.svg),
      filename: `svg-preview-${svgIndex}.svg`,
      status: match.status,
    })
    cursor = match.end
  }

  const after = content.slice(cursor)
  if (after.trim()) {
    blocks.push({
      kind: 'markdown',
      id: `markdown-${markdownIndex}`,
      markdown: after,
    })
  }

  return blocks
}

export function isSvgDocument(value: string) {
  return SVG_DOCUMENT_PATTERN.test(value.trim())
}

export function repairStreamingSvg(value: string) {
  const startMatch = value.match(SVG_START_PATTERN)
  if (!startMatch?.index && startMatch?.index !== 0) return ''

  const candidate = value.slice(startMatch.index).trim()
  if (isSvgDocument(candidate)) return candidate

  const lastTagEnd = candidate.lastIndexOf('>')
  if (lastTagEnd === -1) return ''

  const stableXml = candidate.slice(0, lastTagEnd + 1)
  if (!SVG_START_PATTERN.test(stableXml)) return ''

  const openTags = collectOpenSvgTags(stableXml)
  if (!openTags.length) return stableXml

  return `${stableXml}${openTags
    .reverse()
    .map((tagName) => `</${tagName}>`)
    .join('')}`
}

export function svgToDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function collectSvgMatches(content: string) {
  const matches: SvgMatch[] = []

  for (const match of content.matchAll(FENCED_BLOCK_PATTERN)) {
    const fencedContent = match[1]?.trim() ?? ''
    if (!isSvgDocument(fencedContent) || match.index === undefined) continue
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      svg: fencedContent,
      status: 'complete',
    })
  }

  for (const match of content.matchAll(RAW_SVG_PATTERN)) {
    const svg = match[0].trim()
    if (
      match.index === undefined ||
      !isSvgDocument(svg) ||
      matches.some((item) => spansOverlap(match.index, match.index + match[0].length, item))
    ) {
      continue
    }
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      svg,
      status: 'complete',
    })
  }

  const streamingMatch = collectStreamingSvgMatch(content, matches)
  if (streamingMatch) matches.push(streamingMatch)

  return matches.sort((left, right) => left.start - right.start)
}

function spansOverlap(start: number, end: number, match: SvgMatch) {
  return start < match.end && end > match.start
}

function collectStreamingSvgMatch(
  content: string,
  completeMatches: SvgMatch[],
): SvgMatch | undefined {
  const starts = [...content.matchAll(GLOBAL_SVG_START_PATTERN)]
  for (const startMatch of starts.reverse()) {
    if (startMatch.index === undefined) continue
    const svgStart = startMatch.index
    if (
      completeMatches.some((match) =>
        spansOverlap(svgStart, svgStart + startMatch[0].length, match),
      )
    ) {
      continue
    }

    const rawFragment = content.slice(svgStart)
    if (/<\/svg>/i.test(rawFragment)) continue
    const repairedSvg = repairStreamingSvg(rawFragment)
    if (!repairedSvg) continue

    return {
      start: findFencedSvgStart(content, svgStart),
      end: content.length,
      svg: repairedSvg,
      status: 'streaming',
    }
  }

  return undefined
}

function findFencedSvgStart(content: string, svgStart: number) {
  const fenceStart = content.lastIndexOf('```', svgStart)
  if (fenceStart === -1) return svgStart

  const fencePrefix = content.slice(fenceStart, svgStart)
  if (!/^```[^\n]*\n\s*$/.test(fencePrefix)) return svgStart
  if (content.slice(fenceStart + 3, svgStart).includes('```')) return svgStart
  return fenceStart
}

function collectOpenSvgTags(svg: string) {
  const openTags: string[] = []
  const tagPattern = /<\/?([a-zA-Z][\w:-]*)(?:\s[^<>]*)?>/g

  for (const match of svg.matchAll(tagPattern)) {
    const tag = match[0]
    const tagName = match[1].toLowerCase()
    if (tag.startsWith('</')) {
      const matchingIndex = openTags.lastIndexOf(tagName)
      if (matchingIndex !== -1) openTags.splice(matchingIndex, 1)
      continue
    }
    if (tag.endsWith('/>')) continue
    openTags.push(tagName)
  }

  return openTags
}
