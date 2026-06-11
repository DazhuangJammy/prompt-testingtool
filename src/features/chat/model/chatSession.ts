import { nowIso } from '@/shared/utils/time'
import type { ChatSession } from '@/shared/types'

export function createChatSession(
  canvasId: string,
  title = '测试',
  promptCardId?: string,
): ChatSession {
  const at = nowIso()
  return {
    id: crypto.randomUUID(),
    canvasId,
    promptCardId,
    title,
    createdAt: at,
    updatedAt: at,
  }
}
