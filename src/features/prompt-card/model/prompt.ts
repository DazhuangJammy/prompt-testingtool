import type { PromptCard, PromptSection, WorkflowStep } from '@/shared/types'
import { createId } from '@/shared/utils/identity'
import { nowIso } from '@/shared/utils/time'
import {
  defaultWorkflowStepPrompt,
  promptSectionKeys,
  promptSectionRegistry,
  workflowSectionDefinition,
} from './sectionRegistry'

export interface MarkdownHeadingBlock {
  id: string
  depth: number
  title: string
  body: string
  raw: string
  startLine: number
  endLine: number
}

export interface MarkdownOutlineNode extends MarkdownHeadingBlock {
  ownBody: string
  children: MarkdownOutlineNode[]
}

export interface MarkdownOutline {
  preface: string
  nodes: MarkdownOutlineNode[]
}

export interface MarkdownEditResult {
  markdown: string
  cursorIndex: number
  nodeId?: string
}

const importableHeadingToKey = new Map<string, string>([
  ['角色', 'role'],
  ['规则', 'rules'],
  ['例子', 'examples'],
  ['工作流程', 'workflow'],
  ['输出格式', 'outputFormat'],
])

const outputFormatKey = 'outputFormat'
const starterKey = 'starter'
const starterPattern = /(?:^|\n)(现在[:：][\s\S]*)$/

export const defaultSections = (): PromptCard['sections'] =>
  Object.fromEntries(
    promptSectionRegistry.map((definition) => [
      definition.key,
      definition.createDefault(),
    ]),
  ) as PromptCard['sections']

export const normalizePromptCard = (card: PromptCard): PromptCard => {
  const sections = normalizePromptSections(card)

  return {
    ...card,
    sections,
    markdown: normalizeLineEndings(card.markdown ?? legacySectionsToMarkdown(sections)),
  }
}

export const compilePrompt = (card: PromptCard) =>
  normalizePromptCard(card).markdown?.trim() ?? ''

export const importMarkdownToPromptCard = (
  card: PromptCard,
  markdown: string,
): PromptCard => {
  const normalizedCard = normalizePromptCard(card)
  const normalizedMarkdown = normalizeLineEndings(markdown).trim()

  return {
    ...normalizedCard,
    markdown: normalizedMarkdown,
    sections: markdownToLegacySections(normalizedCard, normalizedMarkdown),
  }
}

export const updatePromptMarkdown = (
  card: PromptCard,
  markdown: string,
): PromptCard => importMarkdownToPromptCard(card, markdown)

export const parseMarkdownHeadingBlocks = (
  markdown: string,
  depth = 1,
): MarkdownHeadingBlock[] => {
  const normalizedMarkdown = normalizeLineEndings(markdown).trim()
  if (!normalizedMarkdown) return []

  const lines = normalizedMarkdown.split('\n')
  const headings = collectMarkdownHeadings(lines).filter(
    (heading) => heading.depth === depth,
  )

  return headings.map((heading, index) => {
    const nextHeading = headings[index + 1]
    const endLine = nextHeading ? nextHeading.lineIndex - 1 : lines.length - 1
    const raw = lines.slice(heading.lineIndex, endLine + 1).join('\n').trim()
    const body = lines.slice(heading.lineIndex + 1, endLine + 1).join('\n').trim()

    return {
      id: `${heading.lineIndex}-${heading.depth}-${heading.title}`,
      depth: heading.depth,
      title: heading.title,
      body,
      raw,
      startLine: heading.lineIndex,
      endLine,
    }
  })
}

export const parseMarkdownOutline = (markdown: string): MarkdownOutline => {
  const normalizedMarkdown = normalizeLineEndings(markdown).trim()
  if (!normalizedMarkdown) return { preface: '', nodes: [] }

  const lines = normalizedMarkdown.split('\n')
  const headings = collectMarkdownHeadings(lines)
  if (!headings.length) return { preface: normalizedMarkdown, nodes: [] }

  const nodes = headings.map<MarkdownOutlineNode>((heading, index) => {
    const nextPeerOrParent = headings
      .slice(index + 1)
      .find((candidate) => candidate.depth <= heading.depth)
    const endLine = nextPeerOrParent
      ? nextPeerOrParent.lineIndex - 1
      : lines.length - 1
    const firstChild = headings
      .slice(index + 1)
      .find(
        (candidate) =>
          candidate.depth > heading.depth && candidate.lineIndex <= endLine,
      )
    const ownBodyEndLine = firstChild ? firstChild.lineIndex - 1 : endLine
    const body = lines.slice(heading.lineIndex + 1, endLine + 1).join('\n').trim()
    const ownBody = lines
      .slice(heading.lineIndex + 1, ownBodyEndLine + 1)
      .join('\n')
      .trim()
    const raw = lines.slice(heading.lineIndex, endLine + 1).join('\n').trim()

    return {
      id: `${heading.lineIndex}-${heading.depth}-${heading.title}`,
      depth: heading.depth,
      title: heading.title,
      body,
      ownBody,
      raw,
      children: [],
      startLine: heading.lineIndex,
      endLine,
    }
  })

  const roots: MarkdownOutlineNode[] = []
  const stack: MarkdownOutlineNode[] = []

  nodes.forEach((node) => {
    while (stack.at(-1) && stack.at(-1)!.depth >= node.depth) stack.pop()

    const parent = stack.at(-1)
    if (parent) {
      parent.children.push(node)
    } else {
      roots.push(node)
    }

    stack.push(node)
  })

  return {
    preface: lines.slice(0, headings[0].lineIndex).join('\n').trim(),
    nodes: roots,
  }
}

export const createPromptCard = (
  canvasId: string,
  index: number,
  position = { x: 80 + index * 40, y: 80 + index * 30 },
): PromptCard => {
  const at = nowIso()
  const sections = defaultSections()

  return {
    id: createId(),
    canvasId,
    title: `提示词 ${index + 1}`,
    position,
    sections,
    createdAt: at,
    updatedAt: at,
  }
}

function normalizePromptSections(card: PromptCard): PromptCard['sections'] {
  return (() => {
    const defaults = defaultSections()
    const sections = { ...defaults, ...card.sections }

    if (workflowSectionDefinition) {
      const key = workflowSectionDefinition.key
      const workflow = card.sections[key]
      const workflowSteps: WorkflowStep[] =
        workflow?.workflowSteps ?? defaults[key].workflowSteps ?? []
      const firstStep = workflowSteps[0]
      const shouldMoveDefault =
        !workflow?.markdown?.trim() &&
        firstStep?.markdown?.trim() === defaultWorkflowStepPrompt

      sections[key] = {
        ...defaults[key],
        ...workflow,
        markdown: shouldMoveDefault
          ? defaultWorkflowStepPrompt
          : (workflow?.markdown ?? defaults[key].markdown),
        workflowSteps: shouldMoveDefault
          ? [{ ...firstStep, markdown: '' }, ...workflowSteps.slice(1)]
          : workflowSteps,
      }
    }

    return sections
  })()
}

function legacySectionsToMarkdown(sections: Record<string, PromptSection>) {
  const blocks = promptSectionRegistry
    .map((definition) => {
      const body = definition.compile(sections[definition.key])
      if (!definition.heading) return body
      return `# ${definition.title}${body ? `\n\n${body}` : ''}`
    })

  return blocks.filter(Boolean).join('\n\n')
}

function markdownToLegacySections(card: PromptCard, markdown: string) {
  const parsedSections = parsePromptMarkdown(markdown)

  return Object.fromEntries(
    promptSectionKeys.map((key) => [
      key,
      {
        ...card.sections[key],
        markdown: parsedSections.get(key)?.trim() ?? '',
        ...(key === workflowSectionDefinition?.key ? { workflowSteps: [] } : {}),
      },
    ]),
  ) as PromptCard['sections']
}

function parsePromptMarkdown(markdown: string) {
  const sections = new Map<string, string>()
  const normalizedMarkdown = normalizeLineEndings(markdown).trim()
  if (!normalizedMarkdown) return sections

  const lines = normalizedMarkdown.split('\n')
  const headingMatches = collectMarkdownHeadings(lines).filter(
    (heading) => heading.depth === 1,
  )

  if (!headingMatches.length) {
    assignUnrecognizedBlock(sections, normalizedMarkdown)
    return sections
  }

  const preface = lines.slice(0, headingMatches[0].lineIndex).join('\n').trim()
  if (preface) assignUnrecognizedBlock(sections, preface)

  headingMatches.forEach((match, index) => {
    const heading = match.title
    const key = importableHeadingToKey.get(normalizeImportHeading(heading))
    const start = match.lineIndex + 1
    const end =
      index + 1 < headingMatches.length
        ? headingMatches[index + 1].lineIndex
        : lines.length
    const block = lines.slice(start, end).join('\n').trim()
    assignRecognizedBlock(
      sections,
      key ?? outputFormatKey,
      key ? block : [`# ${heading}`, block].filter(Boolean).join('\n\n'),
    )
  })

  return sections
}

function collectMarkdownHeadings(lines: string[]) {
  const headings: Array<{ lineIndex: number; depth: number; title: string }> = []
  let fenceMarker: string | undefined

  lines.forEach((line, lineIndex) => {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/)
    if (fenceMatch) {
      const marker = fenceMatch[1][0]
      if (!fenceMarker) {
        fenceMarker = marker
      } else if (fenceMarker === marker) {
        fenceMarker = undefined
      }
      return
    }

    if (fenceMarker) return

    const headingMatch = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/)
    if (!headingMatch) return

    headings.push({
      lineIndex,
      depth: headingMatch[1].length,
      title: headingMatch[2].trim(),
    })
  })

  return headings
}

function normalizeLineEndings(markdown: string) {
  return markdown.replace(/\r\n?/g, '\n')
}

function normalizeImportHeading(heading: string) {
  return heading
    .trim()
    .replace(/^【\s*/, '')
    .replace(/\s*】$/, '')
    .replace(/\s*[:：]\s*$/, '')
}

function assignRecognizedBlock(
  sections: Map<string, string>,
  key: string,
  block: string,
) {
  if (key === starterKey) {
    appendSection(sections, key, block)
    return
  }

  const starterMatch = block.match(starterPattern)
  if (!starterMatch?.[1]) {
    appendSection(sections, key, block)
    return
  }

  const body = block.slice(0, starterMatch.index).trim()
  appendSection(sections, key, body)
  appendSection(sections, starterKey, starterMatch[1].trim())
}

function assignUnrecognizedBlock(sections: Map<string, string>, block: string) {
  const starterMatch = block.match(starterPattern)
  if (!starterMatch?.[1]) {
    appendSection(sections, outputFormatKey, block)
    return
  }

  const body = block.slice(0, starterMatch.index).trim()
  appendSection(sections, outputFormatKey, body)
  appendSection(sections, starterKey, starterMatch[1].trim())
}

function appendSection(sections: Map<string, string>, key: string, block: string) {
  const trimmedBlock = block.trim()
  if (!trimmedBlock) return

  const current = sections.get(key)
  sections.set(key, current ? `${current}\n\n${trimmedBlock}` : trimmedBlock)
}
