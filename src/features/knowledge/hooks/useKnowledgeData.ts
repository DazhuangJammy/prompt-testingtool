import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { createKnowledgeService } from '../application/knowledgeService'
import { knowledgeRepository } from '../infrastructure/knowledgeRepository'
import type { KnowledgeBase, KnowledgeItem, ProviderConfig } from '@/shared/types'

export function useKnowledgeData(providerConfigs: ProviderConfig[]) {
  const [activeBaseId, setActiveBaseId] = useState<string>()
  const [busy, setBusy] = useState(false)
  const bases = useLiveQuery<KnowledgeBase[], KnowledgeBase[]>(
    () => knowledgeRepository.listBases(),
    [],
    [],
  )
  const effectiveBaseId = bases.some((base) => base.id === activeBaseId)
    ? activeBaseId
    : bases[0]?.id
  const items = useLiveQuery(
    () =>
      effectiveBaseId
        ? knowledgeRepository.listItems(effectiveBaseId)
        : Promise.resolve([]),
    [effectiveBaseId],
    [],
  )
  const allItems = useLiveQuery<KnowledgeItem[], KnowledgeItem[]>(
    () => knowledgeRepository.listAllItems(),
    [],
    [],
  )
  const service = useMemo(
    () => createKnowledgeService(async () => providerConfigs),
    [providerConfigs],
  )
  const activeBase = bases.find((base) => base.id === effectiveBaseId)

  const runBusy = async <T>(task: () => Promise<T>) => {
    setBusy(true)
    try {
      return await task()
    } finally {
      setBusy(false)
    }
  }

  return {
    activeBase,
    activeBaseId: effectiveBaseId,
    allItems,
    bases,
    busy,
    items,
    service,
    runBusy,
    setActiveBaseId,
  }
}
