import { nowIso } from '@/shared/utils/time'
import type { ChatSession } from '@/shared/types'

export function createChatSession(promptCardId: string): ChatSession {
  const at = nowIso()
  return {
    id: crypto.randomUUID(),
    promptCardId,
    title: '测试',
    createdAt: at,
    updatedAt: at,
  }
}
