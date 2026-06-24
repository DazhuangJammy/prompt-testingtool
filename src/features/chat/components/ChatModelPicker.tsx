import {
  Brain,
  Check,
  ChevronDown,
  Database,
  Eye,
  ListFilter,
  MessageCircle,
  Search,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type {
  ProviderConfig,
  ProviderModelCapability,
  ProviderModelConfig,
} from '@/shared/types'
import {
  MODEL_CAPABILITY_LABELS,
  getModelCapabilities,
} from '@/shared/model/providerModelCapabilities'

interface ChatModelPickerProps {
  activeProviderId?: string
  providers: ProviderConfig[]
  onSelectProvider: (id: string) => void
}

interface ModelPickerItem {
  capabilities: ProviderModelCapability[]
  groupId: string
  groupLabel: string
  modelId: string
  modelName: string
  providerId: string
  searchText: string
}

interface ModelPickerGroup {
  id: string
  label: string
  items: ModelPickerItem[]
}

const FILTER_CAPABILITIES: ProviderModelCapability[] = [
  'vision',
  'reasoning',
  'function-call',
]

const CAPABILITY_ICONS: Record<ProviderModelCapability, LucideIcon> = {
  chat: MessageCircle,
  reasoning: Brain,
  embedding: Database,
  rerank: ListFilter,
  vision: Eye,
  'function-call': Wrench,
}

export function ChatModelPicker({
  activeProviderId,
  providers,
  onSelectProvider,
}: ChatModelPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedCapabilities, setSelectedCapabilities] = useState<
    ProviderModelCapability[]
  >([])
  const searchRef = useRef<HTMLInputElement>(null)
  const items = useMemo(() => createModelPickerItems(providers), [providers])
  const activeItem = useMemo(
    () => items.find((item) => item.providerId === activeProviderId),
    [activeProviderId, items],
  )
  const visibleGroups = useMemo(
    () => groupPickerItems(filterPickerItems(items, query, selectedCapabilities)),
    [items, query, selectedCapabilities],
  )
  const availableCapabilities = useMemo(
    () =>
      FILTER_CAPABILITIES.filter((capability) =>
        items.some((item) => item.capabilities.includes(capability)),
      ),
    [items],
  )
  const closePicker = useCallback(() => {
    setOpen(false)
    setQuery('')
    setSelectedCapabilities([])
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return undefined

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePicker()
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [closePicker, open])

  const toggleCapability = (capability: ProviderModelCapability) => {
    setSelectedCapabilities((current) =>
      current.includes(capability)
        ? current.filter((item) => item !== capability)
        : [...current, capability],
    )
  }

  const selectModel = (item: ModelPickerItem) => {
    onSelectProvider(item.providerId)
    closePicker()
  }

  return (
    <div className="chat-model-picker">
      <button
        type="button"
        className="chat-model-trigger"
        aria-label="选择模型"
        aria-expanded={open}
        disabled={!items.length}
        onClick={() => {
          if (open) closePicker()
          else setOpen(true)
        }}
      >
        <span className="chat-model-trigger-text">
          {activeItem ? (
            <>
              <span>{activeItem.groupLabel}</span>
              <span aria-hidden>·</span>
              <strong>{activeItem.modelName}</strong>
            </>
          ) : (
            <strong>{items.length ? '选择模型' : '暂无模型'}</strong>
          )}
        </span>
        <ChevronDown aria-hidden className={open ? 'is-open' : ''} />
      </button>

      {open &&
        createPortal(
          <div className="chat-model-modal-backdrop" onMouseDown={closePicker}>
            <section
              className="chat-model-popover"
              role="dialog"
              aria-modal="true"
              aria-label="选择模型"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <label className="chat-model-search">
                <Search aria-hidden />
                <input
                  ref={searchRef}
                  value={query}
                  spellCheck={false}
                  placeholder="搜索模型..."
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>

              {availableCapabilities.length > 0 && (
                <div className="chat-model-filter" aria-label="按标签筛选">
                  <span>按标签筛选</span>
                  {availableCapabilities.map((capability) => (
                    <CapabilityChip
                      key={capability}
                      capability={capability}
                      active={selectedCapabilities.includes(capability)}
                      onClick={() => toggleCapability(capability)}
                    />
                  ))}
                </div>
              )}

              <div className="chat-model-list" role="listbox" aria-label="模型列表">
                {visibleGroups.length ? (
                  visibleGroups.map((group) => (
                    <div className="chat-model-group" key={group.id}>
                      <div className="chat-model-group-label">{group.label}</div>
                      {group.items.map((item) => (
                        <button
                          type="button"
                          key={item.providerId}
                          className={`chat-model-row ${
                            item.providerId === activeProviderId ? 'is-selected' : ''
                          }`}
                          role="option"
                          aria-selected={item.providerId === activeProviderId}
                          aria-label={`选择模型 ${item.groupLabel} ${item.modelName}`}
                          onClick={() => selectModel(item)}
                        >
                          <span className="chat-model-avatar" aria-hidden>
                            {getProviderInitial(item.groupLabel)}
                          </span>
                          <span className="chat-model-row-main">
                            <strong title={item.modelName}>{item.modelName}</strong>
                            {item.modelName !== item.modelId && (
                              <small title={item.modelId}>{item.modelId}</small>
                            )}
                          </span>
                          <CapabilityBadges capabilities={item.capabilities} />
                          {item.providerId === activeProviderId && <Check aria-hidden />}
                        </button>
                      ))}
                    </div>
                  ))
                ) : (
                  <div className="chat-model-empty">没有匹配的模型</div>
                )}
              </div>
            </section>
          </div>,
          document.body,
        )}
    </div>
  )
}

function CapabilityChip({
  active,
  capability,
  onClick,
}: {
  active: boolean
  capability: ProviderModelCapability
  onClick: () => void
}) {
  const Icon = CAPABILITY_ICONS[capability]
  return (
    <button
      type="button"
      className={`chat-model-chip ${active ? 'is-active' : ''}`}
      aria-pressed={active}
      onClick={onClick}
    >
      <Icon aria-hidden />
      <span>{MODEL_CAPABILITY_LABELS[capability]}</span>
    </button>
  )
}

function CapabilityBadges({
  capabilities,
}: {
  capabilities: ProviderModelCapability[]
}) {
  const visibleCapabilities = capabilities.filter((capability) => capability !== 'chat')
  if (!visibleCapabilities.length) return null

  return (
    <span className="chat-model-badges" aria-label="模型标签">
      {visibleCapabilities.map((capability) => {
        const Icon = CAPABILITY_ICONS[capability]
        return (
          <span key={capability} title={MODEL_CAPABILITY_LABELS[capability]}>
            <Icon aria-hidden />
          </span>
        )
      })}
    </span>
  )
}

function createModelPickerItems(providers: ProviderConfig[]): ModelPickerItem[] {
  return providers.flatMap((provider) => {
    const model = getProviderModel(provider)
    const modelId = model.id
    const modelName = model.name || modelId
    const groupLabel = getProviderGroupLabel(provider, modelName, modelId)
    const capabilities = getModelCapabilities(model)
    if (!capabilities.includes('chat')) return []

    return [{
      capabilities,
      groupId: provider.sourceProviderId ?? provider.id,
      groupLabel,
      modelId,
      modelName,
      providerId: provider.id,
      searchText: `${groupLabel} ${provider.name} ${modelName} ${modelId}`.toLowerCase(),
    }]
  })
}

function filterPickerItems(
  items: ModelPickerItem[],
  query: string,
  selectedCapabilities: ProviderModelCapability[],
) {
  const normalizedQuery = query.trim().toLowerCase()
  return items.filter((item) => {
    const matchesQuery = !normalizedQuery || item.searchText.includes(normalizedQuery)
    const matchesCapabilities = selectedCapabilities.every((capability) =>
      item.capabilities.includes(capability),
    )
    return matchesQuery && matchesCapabilities
  })
}

function groupPickerItems(items: ModelPickerItem[]): ModelPickerGroup[] {
  const groups = new Map<string, ModelPickerGroup>()
  for (const item of items) {
    const existing = groups.get(item.groupId)
    if (existing) {
      existing.items.push(item)
    } else {
      groups.set(item.groupId, {
        id: item.groupId,
        label: item.groupLabel,
        items: [item],
      })
    }
  }
  return Array.from(groups.values())
}

function getProviderModel(provider: ProviderConfig): ProviderModelConfig {
  return (
    provider.models?.find((model) => model.id === provider.model) ??
    provider.models?.[0] ?? {
      id: provider.model,
      enabled: true,
    }
  )
}

function getProviderGroupLabel(
  provider: ProviderConfig,
  modelName: string,
  modelId: string,
) {
  if (!provider.sourceProviderId) return provider.name || '模型服务'

  for (const suffix of [` · ${modelName}`, ` · ${modelId}`]) {
    if (provider.name.endsWith(suffix)) {
      return provider.name.slice(0, -suffix.length) || provider.name
    }
  }

  return provider.name.split(' · ')[0] || provider.name || '模型服务'
}

function getProviderInitial(label: string) {
  return (label.trim().slice(0, 1) || 'M').toUpperCase()
}
