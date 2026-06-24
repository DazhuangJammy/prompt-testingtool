import type { InputSegment } from '@/features/input-card/model/inputCard'
import type { ChatKnowledgeReference, WebSearchReference } from '@/shared/types'

export interface PreparedInputSegmentContexts {
  knowledge: {
    context: string
    references: ChatKnowledgeReference[]
  }
  webSearch: {
    context: string
    references: WebSearchReference[]
  }
}

export interface InputSegmentSendResult {
  completed: boolean
  sessionId?: string
}

export function resolveRunnableInputSegments(
  segments: InputSegment[],
  startSegmentId?: string,
) {
  const startIndex = Math.max(
    0,
    segments.findIndex((segment) => segment.id === startSegmentId),
  )
  return segments.slice(startIndex).filter((segment) => segment.content.trim())
}

export async function runInputSegmentSequence({
  segments,
  prepareContexts,
  sendSegment,
  onSessionChange,
}: {
  segments: InputSegment[]
  prepareContexts: (
    text: string,
  ) => Promise<PreparedInputSegmentContexts | undefined>
  sendSegment: (
    segment: InputSegment,
    prepared: PreparedInputSegmentContexts,
  ) => Promise<InputSegmentSendResult>
  onSessionChange?: (sessionId: string) => Promise<void> | void
}) {
  for (const segment of segments) {
    const prepared = await prepareContexts(segment.content)
    if (!prepared) break
    const result = await sendSegment(segment, prepared)
    if (result.sessionId) await onSessionChange?.(result.sessionId)
    if (!result.completed) break
  }
}
