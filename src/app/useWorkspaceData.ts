import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { defaultModelSettingsRepository } from '@/features/settings/infrastructure/defaultModelSettingsRepository'
import { providerRepository } from '@/features/settings/infrastructure/providerRepository'
import {
  DEFAULT_MODEL_SETTINGS_ID,
  resolveDefaultModelProvider,
} from '@/features/settings/model/defaultModelSettings'
import { deriveSelectableProviders } from '@/features/settings/model/providerCatalog'
import { ensureSeedData } from '@/features/workspace/application/seedWorkspace'
import { workspaceRepository } from '@/features/workspace/infrastructure/workspaceRepository'
import { db } from '@/shared/storage/db'
import type {
  Canvas,
  DefaultModelSettings,
  PromptCard,
  ProviderConfig,
} from '@/shared/types'

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
  const defaultModelSettings = useLiveQuery<
    DefaultModelSettings | undefined,
    DefaultModelSettings | undefined
  >(
    () => db.defaultModelSettings.get(DEFAULT_MODEL_SETTINGS_ID),
    [],
    undefined,
  )

  useEffect(() => {
    void ensureSeedData().then(async () => {
      await providerRepository.ensureBuiltInProviders()
      await defaultModelSettingsRepository.ensure()
    })
  }, [])

  const effectiveSelectedCardId = promptCards?.some(
    (card) => card.id === selectedCardId,
  )
    ? selectedCardId
    : promptCards?.[0]?.id
  const selectableProviders = useMemo(
    () => deriveSelectableProviders(providers ?? []),
    [providers],
  )
  const defaultProvider = useMemo(
    () => resolveDefaultModelProvider(providers ?? [], defaultModelSettings),
    [defaultModelSettings, providers],
  )
  const effectiveProviderId = selectableProviders.some(
    (provider) => provider.id === activeProviderId,
  )
    ? activeProviderId
    : selectableProviders[0]?.id
  const effectiveProviderConfigId =
    selectableProviders.find((provider) => provider.id === effectiveProviderId)
      ?.sourceProviderId ?? providers?.[0]?.id

  return useMemo(
    () => ({
      activeCanvas: canvases?.find((canvas) => canvas.id === effectiveCanvasId),
      activeCard: promptCards?.find((card) => card.id === effectiveSelectedCardId),
      activeProvider: selectableProviders.find(
        (provider) => provider.id === effectiveProviderId,
      ) ?? defaultProvider,
      canvases: canvases ?? [],
      effectiveCanvasId,
      effectiveProviderConfigId,
      effectiveProviderId,
      effectiveSelectedCardId,
      defaultModelSettings,
      defaultProvider,
      promptCards: promptCards ?? [],
      providerConfigs: providers ?? [],
      providers: selectableProviders,
      setActiveCanvasId,
      setActiveProviderId,
      setSelectedCardId,
    }),
    [
      canvases,
      effectiveCanvasId,
      effectiveProviderConfigId,
      effectiveProviderId,
      effectiveSelectedCardId,
      defaultModelSettings,
      defaultProvider,
      promptCards,
      providers,
      selectableProviders,
    ],
  )
}
