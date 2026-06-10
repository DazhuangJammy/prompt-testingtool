import {
  type MarkdownEditResult,
  type MarkdownHeadingBlock,
  type MarkdownOutlineNode,
  parseMarkdownOutline,
} from './prompt'

const defaultNewSectionTitle = '新板块'
const defaultChildSectionTitle = '新标题'

export const addMarkdownHeading = (
  markdown: string,
  depth: number,
  title = depth === 1 ? defaultNewSectionTitle : defaultChildSectionTitle,
): string => insertMarkdownHeading(markdown, depth, title).markdown

export const insertMarkdownHeading = (
  markdown: string,
  depth: number,
  title = depth === 1 ? defaultNewSectionTitle : defaultChildSectionTitle,
): MarkdownEditResult => {
  const normalizedMarkdown = normalizeLineEndings(markdown).trim()
  const safeDepth = Math.max(1, Math.min(6, Math.floor(depth)))
  const heading = `${'#'.repeat(safeDepth)} ${title}`
  const prefix = normalizedMarkdown ? `${normalizedMarkdown}\n\n` : ''

  return {
    markdown: `${prefix}${heading}\n`,
    cursorIndex: prefix.length + heading.length,
  }
}

export const insertMarkdownOutlineHeading = (
  markdown: string,
  depth: number,
  title = depth === 1 ? defaultNewSectionTitle : defaultChildSectionTitle,
): MarkdownEditResult => {
  const result = insertMarkdownHeading(markdown, depth, title)
  const insertedNode = findOutlineNodeAtCursor(result.markdown, result.cursorIndex)

  return {
    ...result,
    nodeId: insertedNode?.id,
  }
}

export const addMarkdownChildHeading = (
  markdown: string,
  parent: MarkdownHeadingBlock,
): string => insertMarkdownChildHeading(markdown, parent).markdown

export const insertMarkdownChildHeading = (
  markdown: string,
  parent: MarkdownHeadingBlock,
): MarkdownEditResult => {
  const normalizedMarkdown = normalizeLineEndings(markdown).trim()
  const lines = normalizedMarkdown ? normalizedMarkdown.split('\n') : []
  const insertAt = parent.endLine + 1
  const childHeading = `${'#'.repeat(Math.min(parent.depth + 1, 6))} ${defaultChildSectionTitle}`
  const before = lines.slice(0, insertAt).join('\n').trimEnd()
  const after = lines.slice(insertAt).join('\n').trimStart()
  const prefix = before ? `${before}\n\n` : ''
  const suffix = after ? `\n\n${after}` : ''

  return {
    markdown: `${prefix}${childHeading}${suffix}\n`,
    cursorIndex: prefix.length + childHeading.length,
  }
}

export const updateMarkdownOutlineNode = (
  markdown: string,
  node: MarkdownOutlineNode,
  title: string,
  ownBody: string,
) => {
  const lines = normalizeLineEndings(markdown).trim().split('\n')
  const before = lines.slice(0, node.startLine)
  const afterStartLine = firstLineAfterNodeOwnBody(node)
  const after = lines.slice(afterStartLine)
  const heading = `${'#'.repeat(node.depth)} ${title.trim() || node.title}`
  const body = ownBody.trim()
  const replacement = body ? [heading, '', body] : [heading]
  const nextLines = [...before, ...replacement, ...(after.length ? ['', ...after] : [])]

  return normalizeLineEndings(nextLines.join('\n')).trim()
}

export const insertMarkdownChildOutlineNode = (
  markdown: string,
  parent: MarkdownOutlineNode,
): MarkdownEditResult => {
  const result = insertMarkdownChildHeading(markdown, parent)
  const insertedNode = findOutlineNodeAtCursor(result.markdown, result.cursorIndex)

  return {
    ...result,
    nodeId: insertedNode?.id,
  }
}

export const moveTopLevelMarkdownHeading = (
  markdown: string,
  activeId: string,
  overId: string,
) => {
  if (activeId === overId) return markdown

  const normalizedMarkdown = normalizeLineEndings(markdown).trim()
  const outline = parseMarkdownOutline(normalizedMarkdown)
  const activeIndex = outline.nodes.findIndex((node) => node.id === activeId)
  const overIndex = outline.nodes.findIndex((node) => node.id === overId)
  if (activeIndex < 0 || overIndex < 0) return markdown

  const orderedNodes = arrayMoveItems(outline.nodes, activeIndex, overIndex)
  const preface = outline.preface.trim()
  return [preface, ...orderedNodes.map((node) => node.raw.trim())]
    .filter(Boolean)
    .join('\n\n')
}

function firstLineAfterNodeOwnBody(node: MarkdownOutlineNode) {
  const firstChild = node.children[0]
  return firstChild ? firstChild.startLine : node.endLine + 1
}

function findOutlineNodeAtCursor(markdown: string, cursorIndex: number) {
  return findOutlineNodeAtLine(
    parseMarkdownOutline(markdown).nodes,
    lineIndexAtOffset(markdown, cursorIndex),
  )
}

function findOutlineNodeAtLine(
  nodes: MarkdownOutlineNode[],
  lineIndex: number,
): MarkdownOutlineNode | undefined {
  for (const node of nodes) {
    if (node.startLine === lineIndex) return node
    const child = findOutlineNodeAtLine(node.children, lineIndex)
    if (child) return child
  }

  return undefined
}

function lineIndexAtOffset(markdown: string, offset: number) {
  return normalizeLineEndings(markdown).slice(0, offset).split('\n').length - 1
}

function arrayMoveItems<T>(items: T[], oldIndex: number, newIndex: number) {
  const nextItems = [...items]
  const [item] = nextItems.splice(oldIndex, 1)
  nextItems.splice(newIndex, 0, item)
  return nextItems
}

function normalizeLineEndings(markdown: string) {
  return markdown.replace(/\r\n?/g, '\n')
}
