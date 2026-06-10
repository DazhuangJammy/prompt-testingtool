import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ensureSeedData } from '@/features/workspace/application/seedWorkspace'
import { workspaceRepository } from '@/features/workspace/infrastructure/workspaceRepository'
import type { Canvas, PromptCard, ProviderConfig } from '@/shared/types'

export function useWorkspaceData() {
  const [activeCanvasId, setActiveCanvasId] = useState<string>()
  const [selectedCardId, setSelectedCardId] = useState<string>()
  const [activeProviderId, setActiveProviderId] = useState<string>()

  const canvases = useLiveQuery<Canvas[], Canvas[]>(
    () => workspaceRepository.listCanvasesByUpdatedAt(),
    [],
    [],
  )
  const effectiveCanvasId = canvases?.some((canvas) => canvas.id === activeCanvasId)
    ? activeCanvasId
    : canvases?.[0]?.id

  const promptCards = useLiveQuery<PromptCard[], PromptCard[]>(
    () =>
      effectiveCanvasId
        ? workspaceRepository.listPromptCardsByCanvas(effectiveCanvasId)
        : Promise.resolve([] as PromptCard[]),
    [effectiveCanvasId],
    [],
  )
  const providers = useLiveQuery<ProviderConfig[], ProviderConfig[]>(
    () => workspaceRepository.listProvidersByUpdatedAt(),
    [],
    [],
  )

  useEffect(() => {
    void ensureSeedData()
  }, [])

  const effectiveSelectedCardId = promptCards?.some(
    (card) => card.id === selectedCardId,
  )
    ? selectedCardId
    : promptCards?.[0]?.id
  const effectiveProviderId = providers?.some(
    (provider) => provider.id === activeProviderId,
  )
    ? activeProviderId
    : providers?.[0]?.id

  return useMemo(
    () => ({
      activeCanvas: canvases?.find((canvas) => canvas.id === effectiveCanvasId),
      activeCard: promptCards?.find((card) => card.id === effectiveSelectedCardId),
      activeProvider: providers?.find(
        (provider) => provider.id === effectiveProviderId,
      ),
      canvases: canvases ?? [],
      effectiveCanvasId,
      effectiveProviderId,
      effectiveSelectedCardId,
      promptCards: promptCards ?? [],
      providers: providers ?? [],
      setActiveCanvasId,
      setActiveProviderId,
      setSelectedCardId,
    }),
    [
      canvases,
      effectiveCanvasId,
      effectiveProviderId,
      effectiveSelectedCardId,
      promptCards,
      providers,
    ],
  )
}
