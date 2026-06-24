import {
  Check,
  ChevronDown,
  Plus,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ProviderModelCapability, ProviderModelConfig } from '@/shared/types'
import { MODEL_CAPABILITY_LABELS, getModelCapabilities } from '@/shared/model/providerModelCapabilities'
import { IconButton } from '@/shared/ui/IconButton'
import {
  getProviderModelFamilyLabel,
  groupProviderModels,
} from '../model/providerModelGroups'
import { ProviderModelCapabilityIcons } from './ProviderModelCapabilityIcons'

type PickerStatus = 'idle' | 'busy' | 'ok' | 'error'
type CapabilityFilter = 'all' | ProviderModelCapability

interface ProviderModelPickerDialogProps {
  existingModelIds: string[]
  models: ProviderModelConfig[]
  providerName: string
  status: {
    status: PickerStatus
    message: string
  }
  onAddModels: (models: ProviderModelConfig[]) => void
  onClose: () => void
  onRefresh: () => void
}

const PICKER_FILTERS: Array<{
  id: CapabilityFilter
  label: string
}> = [
  { id: 'all', label: '全部' },
  { id: 'reasoning', label: MODEL_CAPABILITY_LABELS.reasoning },
  { id: 'vision', label: MODEL_CAPABILITY_LABELS.vision },
  { id: 'embedding', label: MODEL_CAPABILITY_LABELS.embedding },
  { id: 'rerank', label: MODEL_CAPABILITY_LABELS.rerank },
  { id: 'function-call', label: MODEL_CAPABILITY_LABELS['function-call'] },
]

export function ProviderModelPickerDialog({
  existingModelIds,
  models,
  providerName,
  status,
  onAddModels,
  onClose,
  onRefresh,
}: ProviderModelPickerDialogProps) {
  const [closedGroups, setClosedGroups] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<CapabilityFilter>('all')
  const existingIds = useMemo(() => new Set(existingModelIds), [existingModelIds])
  const filteredModels = useMemo(
    () => filterModels(models, query, selectedFilter),
    [models, query, selectedFilter],
  )
  const groups = useMemo(
    () => groupProviderModels(filteredModels, 'family'),
    [filteredModels],
  )

  const toggleGroup = (groupId: string) => {
    setClosedGroups((current) => {
      const next = new Set(current)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  const addModel = (model: ProviderModelConfig) => {
    if (existingIds.has(model.id)) return
    onAddModels([withPickerGroup(model)])
  }

  const addGroupModels = (modelsToAdd: ProviderModelConfig[]) => {
    const nextModels = modelsToAdd
      .filter((model) => !existingIds.has(model.id))
      .map(withPickerGroup)
    onAddModels(nextModels)
  }

  return createPortal(
    <div className="nested-dialog-backdrop" onMouseDown={onClose}>
      <section
        className="model-dialog provider-model-picker-dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="model-dialog-head provider-model-picker-head">
          <div>
            <h2>{providerName} 模型</h2>
            <span>选择要加入当前模型服务的模型</span>
          </div>
          <IconButton icon={<X />} label="关闭" onClick={onClose} />
        </div>

        <div className="provider-model-picker-toolbar">
          <label className="provider-model-picker-search">
            <Search aria-hidden />
            <input
              autoFocus
              value={query}
              placeholder="搜索模型 ID 或名称"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <IconButton
            className="provider-model-picker-tool"
            disabled={status.status === 'busy'}
            icon={<RefreshCw className={status.status === 'busy' ? 'is-spinning' : ''} />}
            label="刷新模型列表"
            onClick={onRefresh}
          />
        </div>

        <div className="provider-model-picker-tabs" role="tablist" aria-label="模型能力筛选">
          {PICKER_FILTERS.map((filter) => (
            <button
              type="button"
              key={filter.id}
              className={selectedFilter === filter.id ? 'is-active' : ''}
              role="tab"
              aria-selected={selectedFilter === filter.id}
              onClick={() => setSelectedFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {status.status !== 'idle' && (
          <div className="provider-model-picker-status">
            <span className={`settings-status is-${status.status}`}>
              {status.message}
            </span>
          </div>
        )}

        <div className="provider-model-picker-list">
          {groups.length ? (
            groups.map((group) => {
              const open = !closedGroups.has(group.id)
              const addableModels = group.models.filter(
                (model) => !existingIds.has(model.id),
              )

              return (
                <div className="provider-model-picker-group" key={group.id}>
                  <div className="provider-model-picker-group-head">
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => toggleGroup(group.id)}
                    >
                      <ChevronDown
                        aria-hidden
                        className={open ? '' : 'is-closed'}
                      />
                      <strong>{group.label}</strong>
                      <span>{group.models.length}</span>
                    </button>
                    <IconButton
                      icon={<Plus />}
                      label="添加该分组模型"
                      disabled={!addableModels.length}
                      onClick={() => addGroupModels(group.models)}
                    />
                  </div>
                  {open && (
                    <div className="provider-model-picker-group-body">
                      {group.models.map((model) => (
                        <ProviderModelPickerRow
                          key={model.id}
                          added={existingIds.has(model.id)}
                          model={model}
                          onAdd={() => addModel(model)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <div className="provider-model-picker-empty">
              {status.status === 'busy' ? '正在获取模型...' : '没有匹配的模型'}
            </div>
          )}
        </div>
      </section>
    </div>,
    document.body,
  )
}

function ProviderModelPickerRow({
  added,
  model,
  onAdd,
}: {
  added: boolean
  model: ProviderModelConfig
  onAdd: () => void
}) {
  const title = model.name || model.id

  return (
    <div className="provider-model-picker-row">
      <span className="provider-model-picker-avatar" aria-hidden>
        {(title || 'M').slice(0, 1).toUpperCase()}
      </span>
      <div className="provider-model-picker-name">
        <strong title={title}>{title}</strong>
        {model.name && model.name !== model.id && <small>{model.id}</small>}
      </div>
      <ProviderModelCapabilityIcons model={model} />
      <IconButton
        icon={added ? <Check /> : <Plus />}
        label={added ? '已添加' : '添加模型'}
        disabled={added}
        onClick={onAdd}
      />
    </div>
  )
}

function filterModels(
  models: ProviderModelConfig[],
  query: string,
  selectedFilter: CapabilityFilter,
) {
  const normalizedQuery = query.trim().toLowerCase()

  return models.filter((model) => {
    const capabilities = getModelCapabilities(model)
    if (selectedFilter !== 'all' && !capabilities.includes(selectedFilter)) {
      return false
    }
    if (!normalizedQuery) return true

    const target = `${model.id} ${model.name ?? ''} ${
      model.group ?? ''
    }`.toLowerCase()
    return target.includes(normalizedQuery)
  })
}

function withPickerGroup(model: ProviderModelConfig): ProviderModelConfig {
  return {
    ...model,
    group: model.group ?? getProviderModelFamilyLabel(model),
    enabled: true,
  }
}
