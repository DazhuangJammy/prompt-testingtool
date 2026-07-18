import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { createKnowledgeService } from '../application/knowledgeService'
import { knowledgeRepository } from '../infrastructure/knowledgeRepository'
import type { KnowledgeBase, KnowledgeItem, ProviderConfig } from '@/shared/types'

export function useKnowledgeData(providerConfigs: ProviderConfig[]) {
  const [activeBaseId, setActiveBaseId] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
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

  useEffect(() => {
    if (!effectiveBaseId || activeBase?.providerType !== 'bailian') return
    let active = true
    void (async () => {
      await Promise.resolve()
      if (!active) return
      setBusy(true)
      setError(undefined)
      try {
        await service.refreshBase(effectiveBaseId)
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : '同步百炼知识库失败')
      } finally {
        if (active) setBusy(false)
      }
    })()
    return () => {
      active = false
    }
  }, [activeBase?.providerType, effectiveBaseId, service])

  const runBusy = async <T>(task: () => Promise<T>) => {
    setBusy(true)
    setError(undefined)
    try {
      return await task()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '知识库操作失败')
      throw reason
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
    clearError: () => setError(undefined),
    error,
    items,
    service,
    runBusy,
    setActiveBaseId,
  }
}
