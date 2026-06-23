import { useMemo, useState } from 'react'
import { checkWebSearchProvider } from '@/shared/api/webSearch'
import type {
  WebSearchProviderConfig,
  WebSearchSettings,
} from '@/shared/types'
import {
  getWebSearchProviderPreset,
  isWebSearchProviderSupported,
} from '../model/webSearchProviders'
import { normalizeWebSearchSettings } from '../model/webSearchSettings'
import { WebSearchGeneralSettings } from './WebSearchGeneralSettings'
import { WebSearchProviderList } from './WebSearchProviderList'
import { WebSearchProviderSettings } from './WebSearchProviderSettings'
import type {
  WebSearchSettingsCheckState,
  WebSearchSettingsSelection,
} from './webSearchSettingsPanelTypes'

interface WebSearchSettingsPanelProps {
  settings?: WebSearchSettings
  onSave: (settings: WebSearchSettings) => void
}

export function WebSearchSettingsPanel({
  settings,
  onSave,
}: WebSearchSettingsPanelProps) {
  const normalized = useMemo(
    () => normalizeWebSearchSettings(settings),
    [settings],
  )
  const [draft, setDraft] = useState(normalized)
  const [lastSettings, setLastSettings] = useState(settings)
  const [selectedItem, setSelectedItem] =
    useState<WebSearchSettingsSelection>('general')
  const [keyVisible, setKeyVisible] = useState(false)
  const [checkState, setCheckState] = useState<WebSearchSettingsCheckState>({
    status: 'idle',
    message: '',
  })

  if (settings !== lastSettings) {
    const next = normalizeWebSearchSettings(settings)
    setLastSettings(settings)
    setDraft(next)
    setSelectedItem('general')
  }

  const selectedProvider =
    selectedItem === 'general'
      ? undefined
      : draft.providers.find((provider) => provider.id === selectedItem)

  const saveDraft = (nextDraft = draft) => {
    const next = normalizeWebSearchSettings(nextDraft)
    setDraft(next)
    onSave(next)
  }

  const updateDraft = (updates: Partial<WebSearchSettings>) => {
    setDraft((current) => normalizeWebSearchSettings({ ...current, ...updates }))
  }

  const updateProvider = (
    updates: Partial<WebSearchProviderConfig>,
    provider = selectedProvider,
  ) => {
    if (!provider) return
    setDraft((current) =>
      normalizeWebSearchSettings({
        ...current,
        providers: current.providers.map((item) =>
          item.id === provider.id ? { ...item, ...updates } : item,
        ),
      }),
    )
  }

  const runProviderCheck = async () => {
    if (!selectedProvider) return
    setCheckState({ status: 'busy', message: '检测中' })
    try {
      const message = await checkWebSearchProvider(selectedProvider, draft)
      setCheckState({ status: 'ok', message })
    } catch (error) {
      setCheckState({
        status: 'error',
        message: error instanceof Error ? error.message : '检测失败',
      })
    }
  }

  return (
    <>
      <WebSearchProviderList
        providers={draft.providers}
        selectedItem={selectedItem}
        defaultProviderId={draft.defaultProviderId}
        onSelect={(selection) => {
          setSelectedItem(selection)
          setCheckState({ status: 'idle', message: '' })
        }}
      />

      <section className="web-search-detail-panel">
        {selectedItem === 'general' ? (
          <WebSearchGeneralSettings
            draft={draft}
            onSave={saveDraft}
            onUpdate={updateDraft}
          />
        ) : selectedProvider ? (
          <>
            <div className="provider-detail-head">
              <div>
                <h2>{selectedProvider.name}</h2>
                <span>{getProviderDescription(selectedProvider)}</span>
              </div>
              <label className={`settings-switch ${selectedProvider.enabled ? 'is-on' : ''}`}>
                <input
                  type="checkbox"
                  checked={selectedProvider.enabled}
                  disabled={!isWebSearchProviderSupported(selectedProvider.id)}
                  onChange={(event) =>
                    updateProvider({ enabled: event.target.checked })
                  }
                />
                <span />
              </label>
            </div>

            <WebSearchProviderSettings
              checkState={checkState}
              defaultProviderId={draft.defaultProviderId}
              keyVisible={keyVisible}
              provider={selectedProvider}
              onCheck={() => void runProviderCheck()}
              onSave={() => saveDraft()}
              onSetDefault={() => {
                updateDraft({ defaultProviderId: selectedProvider.id })
                saveDraft({ ...draft, defaultProviderId: selectedProvider.id })
              }}
              onToggleKeyVisible={() => setKeyVisible((value) => !value)}
              onUpdateProvider={(updates) => updateProvider(updates)}
            />
          </>
        ) : (
          <div className="provider-detail-empty">请选择一个搜索服务商</div>
        )}
      </section>
    </>
  )
}

function getProviderDescription(provider: WebSearchProviderConfig) {
  const preset = getWebSearchProviderPreset(provider.id)
  return preset?.description ?? provider.type
}
