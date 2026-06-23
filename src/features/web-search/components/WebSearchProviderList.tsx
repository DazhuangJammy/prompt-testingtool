import { Globe, Search } from 'lucide-react'
import type { WebSearchProviderConfig, WebSearchProviderId } from '@/shared/types'
import {
  WEB_SEARCH_PROVIDER_PRESETS,
  getWebSearchProviderGroupLabel,
  getWebSearchProviderPreset,
} from '../model/webSearchProviders'
import type { WebSearchSettingsSelection } from './webSearchSettingsPanelTypes'

interface WebSearchProviderListProps {
  providers: WebSearchProviderConfig[]
  selectedItem: WebSearchSettingsSelection
  defaultProviderId?: WebSearchProviderId
  onSelect: (selection: WebSearchSettingsSelection) => void
}

export function WebSearchProviderList({
  providers,
  selectedItem,
  defaultProviderId,
  onSelect,
}: WebSearchProviderListProps) {
  const groupedProviders = WEB_SEARCH_PROVIDER_PRESETS.reduce<
    Record<'api' | 'local', WebSearchProviderConfig[]>
  >(
    (result, preset) => {
      const provider = providers.find((item) => item.id === preset.id)
      if (provider) result[preset.group].push(provider)
      return result
    },
    { api: [], local: [] },
  )

  return (
    <section className="settings-provider-list web-search-provider-list">
      <button
        type="button"
        className={`settings-search web-search-general-entry ${
          selectedItem === 'general' ? 'is-active' : ''
        }`}
        onClick={() => onSelect('general')}
      >
        <Search size={18} />
        <span>基础设置</span>
      </button>

      <div className="provider-items">
        {(['api', 'local'] as const).map((group) => (
          <div className="web-search-provider-group" key={group}>
            <span className="web-search-provider-group-label">
              {getWebSearchProviderGroupLabel(group)}
            </span>
            {groupedProviders[group].map((provider) => {
              const preset = getWebSearchProviderPreset(provider.id)
              return (
                <button
                  type="button"
                  key={provider.id}
                  className={provider.id === selectedItem ? 'is-active' : ''}
                  onClick={() => onSelect(provider.id)}
                >
                  <span className="provider-initial">
                    <Globe />
                  </span>
                  <span className="provider-row-main">
                    <strong>{provider.name}</strong>
                    <span>{preset?.description}</span>
                  </span>
                  {provider.id === defaultProviderId ? (
                    <span className="provider-state is-on">默认</span>
                  ) : (
                    <span className={`provider-state ${provider.enabled ? 'is-on' : ''}`}>
                      {provider.enabled ? 'ON' : 'OFF'}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </section>
  )
}
