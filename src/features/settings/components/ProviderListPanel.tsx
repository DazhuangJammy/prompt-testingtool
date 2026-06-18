import { Filter, Plus, Search } from 'lucide-react'
import type { ProviderConfig } from '@/shared/types'
import { PROVIDER_TYPE_LABELS } from '../model/providerCatalog'

interface ProviderListPanelProps {
  activeProviderId?: string
  providers: ProviderConfig[]
  search: string
  onAdd: () => void
  onReorder: (providers: ProviderConfig[]) => void
  onSearchChange: (value: string) => void
  onSelect: (id: string) => void
}

export function ProviderListPanel({
  activeProviderId,
  providers,
  search,
  onAdd,
  onReorder,
  onSearchChange,
  onSelect,
}: ProviderListPanelProps) {
  const query = search.trim().toLowerCase()
  const orderedProviders = sortProviders(providers)
  const visibleProviders = orderedProviders.filter((provider) => {
    if (!query) return true
    return `${provider.name} ${provider.type ?? ''} ${provider.baseUrl}`
      .toLowerCase()
      .includes(query)
  })

  const reorderProvider = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return
    const currentIndex = orderedProviders.findIndex(
      (provider) => provider.id === draggedId,
    )
    const targetIndex = orderedProviders.findIndex(
      (provider) => provider.id === targetId,
    )
    if (currentIndex === -1 || targetIndex === -1) return

    const next = [...orderedProviders]
    const [dragged] = next.splice(currentIndex, 1)
    next.splice(targetIndex, 0, dragged)
    onReorder(next.map((provider, index) => ({ ...provider, order: index })))
  }

  return (
    <section className="settings-provider-list">
      <label className="settings-search">
        <Search size={18} />
        <input
          value={search}
          placeholder="搜索模型平台..."
          onChange={(event) => onSearchChange(event.target.value)}
        />
        <Filter size={18} />
      </label>

      <div className="provider-items">
        {visibleProviders.map((provider) => (
          <button
            type="button"
            key={provider.id}
            className={provider.id === activeProviderId ? 'is-active' : ''}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = 'move'
              event.dataTransfer.setData('text/provider-id', provider.id)
            }}
            onDragOver={(event) => {
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
            }}
            onDrop={(event) => {
              event.preventDefault()
              reorderProvider(
                event.dataTransfer.getData('text/provider-id'),
                provider.id,
              )
            }}
            onClick={() => onSelect(provider.id)}
          >
            <span className="provider-initial">
              {(provider.name || 'P').slice(0, 1).toUpperCase()}
            </span>
            <span className="provider-row-main">
              <strong>{provider.name || provider.model}</strong>
              <span>
                {PROVIDER_TYPE_LABELS[provider.type ?? 'custom'] ??
                  PROVIDER_TYPE_LABELS.custom}
              </span>
            </span>
            <span className={`provider-state ${provider.enabled ? 'is-on' : ''}`}>
              {provider.enabled ? 'ON' : 'OFF'}
            </span>
          </button>
        ))}
      </div>

      <button type="button" className="add-provider-button" onClick={onAdd}>
        <Plus size={18} />
        添加
      </button>
    </section>
  )
}

function sortProviders(providers: ProviderConfig[]) {
  return [...providers].sort((left, right) => {
    const enabledDiff = Number(Boolean(right.enabled)) - Number(Boolean(left.enabled))
    if (enabledDiff) return enabledDiff
    const leftOrder = left.order ?? Number.MAX_SAFE_INTEGER
    const rightOrder = right.order ?? Number.MAX_SAFE_INTEGER
    return leftOrder - rightOrder || right.updatedAt.localeCompare(left.updatedAt)
  })
}
