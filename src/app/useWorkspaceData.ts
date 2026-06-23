import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { defaultModelSettingsRepository } from '@/features/settings/infrastructure/defaultModelSettingsRepository'
import { providerRepository } from '@/features/settings/infrastructure/providerRepository'
import { webSearchSettingsRepository } from '@/features/web-search/infrastructure/webSearchSettingsRepository'
import {
  DEFAULT_MODEL_SETTINGS_ID,
  FLOWCHART_MODEL_SETTINGS_ID,
  resolveDefaultModelProvider,
} from '@/features/settings/model/defaultModelSettings'
import { deriveSelectableProviders } from '@/features/settings/model/providerCatalog'
import { ensureSeedData } from '@/features/workspace/application/seedWorkspace'
import { repairLegacyWorkspaceTopicScopes } from '@/features/workspace/application/workspaceService'
import { workspaceRepository } from '@/features/workspace/infrastructure/workspaceRepository'
import type {
  Canvas,
  DefaultModelSettings,
  InputCard,
  PromptCard,
  ProviderConfig,
  WebSearchSettings,
} from '@/shared/types'

export function useWorkspaceData() {
  const [activeCanvasId, setActiveCanvasId] = useState<string | undefined>(() =>
    readStoredId('prompt-active-canvas-id'),
  )
  const [selectedCardId, setSelectedCardId] = useState<string | undefined>(() =>
    readStoredId('prompt-selected-card-id'),
  )
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
  const inputCards = useLiveQuery<InputCard[], InputCard[]>(
    () =>
      effectiveCanvasId
        ? workspaceRepository.listInputCardsByCanvas(effectiveCanvasId)
        : Promise.resolve([] as InputCard[]),
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
    () => defaultModelSettingsRepository.get(DEFAULT_MODEL_SETTINGS_ID),
    [],
    undefined,
  )
  const flowchartModelSettings = useLiveQuery<
    DefaultModelSettings | undefined,
    DefaultModelSettings | undefined
  >(
    () => defaultModelSettingsRepository.get(FLOWCHART_MODEL_SETTINGS_ID),
    [],
    undefined,
  )
  const webSearchSettings = useLiveQuery<
    WebSearchSettings | undefined,
    WebSearchSettings | undefined
  >(
    () => webSearchSettingsRepository.get(),
    [],
    undefined,
  )

  useEffect(() => {
    void ensureSeedData()
      .then(async () => {
        await providerRepository.ensureBuiltInProviders()
        await defaultModelSettingsRepository.ensure()
        await defaultModelSettingsRepository.ensureFlowchart()
        await webSearchSettingsRepository.ensure()
        await repairLegacyWorkspaceTopicScopes()
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    writeStoredId('prompt-active-canvas-id', activeCanvasId)
  }, [activeCanvasId])

  useEffect(() => {
    writeStoredId('prompt-selected-card-id', selectedCardId)
  }, [selectedCardId])

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
  const flowchartProvider = useMemo(
    () => resolveDefaultModelProvider(providers ?? [], flowchartModelSettings),
    [flowchartModelSettings, providers],
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
      flowchartModelSettings,
      flowchartProvider,
      inputCards: inputCards ?? [],
      promptCards: promptCards ?? [],
      providerConfigs: providers ?? [],
      providers: selectableProviders,
      setActiveCanvasId,
      setActiveProviderId,
      setSelectedCardId,
      webSearchSettings,
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
      inputCards,
      flowchartModelSettings,
      flowchartProvider,
      providers,
      selectableProviders,
      webSearchSettings,
    ],
  )
}

function readStoredId(key: string) {
  try {
    return localStorage.getItem(key) ?? undefined
  } catch {
    return undefined
  }
}

function writeStoredId(key: string, value: string | undefined) {
  try {
    if (value) localStorage.setItem(key, value)
    else localStorage.removeItem(key)
  } catch {
    // Storage can be unavailable in restricted browser modes.
  }
}
