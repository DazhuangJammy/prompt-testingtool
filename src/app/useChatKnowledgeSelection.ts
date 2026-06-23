import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import {
  getChatKnowledgeSelection,
  saveChatKnowledgeSelection,
} from '@/features/knowledge/application/knowledgeService'

export function useChatKnowledgeSelection(activeSessionId?: string) {
  const [draftBaseIds, setDraftBaseIds] = useState<string[]>([])
  const storedSelection = useLiveQuery(
    () => getChatKnowledgeSelection(activeSessionId),
    [activeSessionId],
    undefined,
  )
  const selectedBaseIds = activeSessionId
    ? storedSelection?.baseIds ?? draftBaseIds
    : draftBaseIds

  useEffect(() => {
    if (!activeSessionId || !draftBaseIds.length) return
    const savedBaseIds = draftBaseIds
    void saveChatKnowledgeSelection(activeSessionId, savedBaseIds).then(() => {
      setDraftBaseIds((current) => current === savedBaseIds ? [] : current)
    })
  }, [activeSessionId, draftBaseIds])

  const setSelectedBaseIds = (baseIds: string[]) => {
    if (!activeSessionId) {
      setDraftBaseIds(baseIds)
      return
    }
    void saveChatKnowledgeSelection(activeSessionId, baseIds)
  }

  return {
    selectedBaseIds,
    setSelectedBaseIds,
  }
}
