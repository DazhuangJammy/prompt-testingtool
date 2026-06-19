import { nowIso } from '@/shared/utils/time'
import type { ChatSession } from '@/shared/types'

interface CreateChatSessionOptions {
  comparePaneIndex?: number
  hidden?: boolean
  parentSessionId?: string
}

export function createChatSession(
  canvasId: string,
  title = '测试',
  promptCardId?: string,
  options: CreateChatSessionOptions = {},
): ChatSession {
  const at = nowIso()
  return {
    id: crypto.randomUUID(),
    canvasId,
    comparePaneIndex: options.comparePaneIndex,
    hidden: options.hidden,
    parentSessionId: options.parentSessionId,
    promptCardId,
    title,
    createdAt: at,
    updatedAt: at,
  }
}
