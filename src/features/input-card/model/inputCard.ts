import {
  moveTopLevelMarkdownHeading,
} from '@/features/prompt-card/model/markdownEditing'
import {
  parseMarkdownHeadingBlocks,
  parseMarkdownOutline,
  remapCollapsedMarkdownHeadingIds,
  type MarkdownOutline,
} from '@/features/prompt-card/model/prompt'
import type { CanvasEdge, CanvasPoint, InputCard, PromptCard } from '@/shared/types'
import { createId } from '@/shared/utils/identity'
import { nowIso } from '@/shared/utils/time'

export interface InputSegment {
  id: string
  title: string
  content: string
  order: number
}

export interface PromptInputSource {
  edge: CanvasEdge
  inputCard: InputCard
  segments: InputSegment[]
}

export const defaultInputCardMarkdown = [
  '# 输入一',
  '',
  '在这里写第一轮要发送给模型的正文。',
  '',
  '# 输入二',
  '',
  '在这里写第二轮要发送给模型的正文。',
].join('\n')

export function createInputCard(
  canvasId: string,
  index: number,
  position: CanvasPoint = { x: 100 + index * 40, y: 120 + index * 30 },
  topicSessionId?: string,
): InputCard {
  const at = nowIso()

  return {
    id: createId(),
    canvasId,
    topicSessionId,
    title: `输入卡片 ${index + 1}`,
    markdown: defaultInputCardMarkdown,
    position,
    createdAt: at,
    updatedAt: at,
  }
}

export function normalizeInputCard(card: InputCard): InputCard {
  return {
    ...card,
    markdown: normalizeLineEndings(card.markdown ?? '').trim(),
    collapsedMarkdownHeadingIds: getInputCardCollapsedMarkdownHeadingIds(card),
  }
}

export function parseInputSegments(markdown: string): InputSegment[] {
  return parseMarkdownHeadingBlocks(markdown, 1).map((block, index) => ({
    id: block.id,
    title: block.title,
    content: block.body,
    order: index,
  }))
}

export function parseInputCardOutline(card: InputCard): MarkdownOutline {
  return parseMarkdownOutline(normalizeInputCard(card).markdown)
}

export function updateInputCardMarkdown(
  card: InputCard,
  markdown: string,
): InputCard {
  const previousOutline = parseInputCardOutline(card)
  const nextMarkdown = normalizeLineEndings(markdown).trim()
  const nextOutline = parseMarkdownOutline(nextMarkdown)
  const nextCollapsedHeadingIds = remapCollapsedMarkdownHeadingIds(
    previousOutline,
    nextOutline,
    new Set(getInputCardCollapsedMarkdownHeadingIds(card)),
  )

  return {
    ...card,
    collapsedMarkdownHeadingIds:
      normalizeInputCollapsedMarkdownHeadingIds(nextCollapsedHeadingIds),
    markdown: nextMarkdown,
  }
}

export function moveInputSegment(
  card: InputCard,
  activeId: string,
  overId: string,
): InputCard {
  return updateInputCardMarkdown(
    card,
    moveTopLevelMarkdownHeading(card.markdown, activeId, overId),
  )
}

export const hasInputCardCollapsedMarkdownHeadingState = (card: InputCard) =>
  Array.isArray(card.collapsedMarkdownHeadingIds)

export const getInputCardCollapsedMarkdownHeadingIds = (card: InputCard) =>
  normalizeInputCollapsedMarkdownHeadingIds(card.collapsedMarkdownHeadingIds)

export const updateInputCollapsedMarkdownHeadingIds = (
  card: InputCard,
  headingIds: Iterable<string>,
): InputCard => ({
  ...card,
  collapsedMarkdownHeadingIds:
    normalizeInputCollapsedMarkdownHeadingIds(headingIds),
})

export function findPromptInputSources({
  edges,
  inputCards,
  promptCard,
}: {
  edges: CanvasEdge[]
  inputCards: InputCard[]
  promptCard?: PromptCard
}): PromptInputSource[] {
  if (!promptCard) return []

  const inputCardById = new Map(inputCards.map((card) => [card.id, card]))

  return edges.flatMap((edge) => {
    if (
      edge.targetId !== promptCard.id ||
      edge.targetHandle !== 'left' ||
      edge.sourceHandle !== 'right'
    ) {
      return []
    }

    const inputCard = inputCardById.get(edge.sourceId)
    if (!inputCard) return []

    return {
      edge,
      inputCard,
      segments: parseInputSegments(inputCard.markdown),
    }
  })
}

export function resolvePromptInputSource(
  sources: PromptInputSource[],
  preferredInputCardId?: string,
) {
  if (!sources.length) return undefined
  return sources.find((source) => source.inputCard.id === preferredInputCardId) ?? sources[0]
}

function normalizeLineEndings(markdown: string) {
  return markdown.replace(/\r\n?/g, '\n')
}

function normalizeInputCollapsedMarkdownHeadingIds(value: unknown): string[] {
  if (!value || typeof value === 'string') return []
  const values = Array.from(value as Iterable<unknown>)
  return values.filter((id): id is string => typeof id === 'string')
}
