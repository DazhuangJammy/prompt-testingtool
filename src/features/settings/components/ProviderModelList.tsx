import {
  CheckCircle2,
  ChevronDown,
  Edit3,
  Minus,
  Plus,
  RefreshCw,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ProviderModelConfig } from '@/shared/types'
import {
  MODEL_CAPABILITY_LABELS,
  getModelCapabilities,
} from '@/shared/model/providerModelCapabilities'
import { IconButton } from '@/shared/ui/IconButton'
import { groupProviderModels } from '../model/providerModelGroups'

interface ProviderModelListProps {
  models: ProviderModelConfig[]
  syncing: boolean
  onAdd: () => void
  onEdit: (modelId: string) => void
  onRemove: (modelId: string) => void
  onSync: () => void
  onToggle: (modelId: string) => void
}

export function ProviderModelList({
  models,
  syncing,
  onAdd,
  onEdit,
  onRemove,
  onSync,
  onToggle,
}: ProviderModelListProps) {
  const [closedGroups, setClosedGroups] = useState<Set<string>>(new Set())
  const groups = useMemo(() => groupProviderModels(models), [models])

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

  return (
    <section className="provider-model-section">
      <div className="model-list-head">
        <div>
          <strong>模型</strong>
          <span className="model-list-count">{models.length}</span>
        </div>
        <div className="model-list-actions">
          <button
            type="button"
            className="model-sync-button"
            disabled={syncing}
            onClick={onSync}
          >
            <RefreshCw className={syncing ? 'is-spinning' : ''} />
            <span>获取模型列表</span>
          </button>
          <IconButton
            className="model-add-button"
            icon={<Plus />}
            label="添加模型"
            onClick={onAdd}
          />
        </div>
      </div>

      <div className="provider-model-list">
        {groups.length ? (
          groups.map((group) => {
            const open = !closedGroups.has(group.id)

            return (
              <div className="provider-model-group" key={group.id}>
                <button
                  type="button"
                  className="provider-model-group-head"
                  aria-expanded={open}
                  onClick={() => toggleGroup(group.id)}
                >
                  <ChevronDown aria-hidden className={open ? '' : 'is-closed'} />
                  <strong>{group.label}</strong>
                </button>
                {open && (
                  <div className="provider-model-group-body">
                    {group.models.map((model) => (
                      <ProviderModelRow
                        key={model.id}
                        model={model}
                        onEdit={onEdit}
                        onRemove={onRemove}
                        onToggle={onToggle}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <div className="provider-model-empty">暂无模型</div>
        )}
      </div>
    </section>
  )
}

function ProviderModelRow({
  model,
  onEdit,
  onRemove,
  onToggle,
}: {
  model: ProviderModelConfig
  onEdit: (modelId: string) => void
  onRemove: (modelId: string) => void
  onToggle: (modelId: string) => void
}) {
  const title = model.name || model.id

  return (
    <div className="provider-model-row">
      <label className="provider-model-enabled">
        <input
          type="checkbox"
          aria-label={`${title} 启用状态`}
          checked={model.enabled}
          onChange={() => onToggle(model.id)}
        />
        <CheckCircle2 aria-hidden size={18} />
      </label>
      <div className="provider-model-name">
        <strong title={title}>{title}</strong>
      </div>
      <ModelCapabilityTags model={model} />
      <div className="provider-model-actions">
        <IconButton
          icon={<Edit3 />}
          label="编辑模型"
          onClick={() => onEdit(model.id)}
        />
        <IconButton
          icon={<Minus />}
          label="移除模型"
          onClick={() => onRemove(model.id)}
        />
      </div>
    </div>
  )
}

function ModelCapabilityTags({ model }: { model: ProviderModelConfig }) {
  const capabilities = getModelCapabilities(model)

  if (!capabilities.length) return <span className="provider-model-tags" />

  return (
    <span className="provider-model-tags" aria-label="模型标签">
      {capabilities.map((capability) => (
        <span key={capability}>{MODEL_CAPABILITY_LABELS[capability]}</span>
      ))}
    </span>
  )
}
