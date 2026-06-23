import { X } from 'lucide-react'
import { useState } from 'react'
import type { ProviderModelCapability, ProviderModelConfig } from '@/shared/types'
import {
  MODEL_CAPABILITY_LABELS,
  MODEL_CAPABILITY_OPTIONS,
  getModelCapabilities,
} from '@/shared/model/providerModelCapabilities'
import { IconButton } from '@/shared/ui/IconButton'

export interface ModelFormValue {
  capabilities?: ProviderModelCapability[]
  group?: string
  id: string
  name?: string
}

interface ModelFormDialogProps {
  existingModelIds: string[]
  initialModel?: ProviderModelConfig
  mode: 'add' | 'edit'
  onClose: () => void
  onSubmit: (model: ModelFormValue) => void
}

export function ModelFormDialog({
  existingModelIds,
  initialModel,
  mode,
  onClose,
  onSubmit,
}: ModelFormDialogProps) {
  const [group, setGroup] = useState(initialModel?.group ?? '')
  const [id, setId] = useState(initialModel?.id ?? '')
  const [name, setName] = useState(initialModel?.name ?? '')
  const [capabilities, setCapabilities] = useState<ProviderModelCapability[]>(
    initialModel ? getModelCapabilities(initialModel) : ['chat'],
  )
  const trimmedId = id.trim()
  const duplicateId =
    trimmedId !== '' &&
    trimmedId !== initialModel?.id &&
    existingModelIds.includes(trimmedId)
  const title = mode === 'edit' ? '编辑模型' : '添加模型'
  const actionLabel = mode === 'edit' ? '保存修改' : '添加模型'
  const toggleCapability = (capability: ProviderModelCapability) => {
    setCapabilities((current) =>
      current.includes(capability)
        ? current.filter((item) => item !== capability)
        : [...current, capability],
    )
  }

  return (
    <div className="nested-dialog-backdrop" onMouseDown={onClose}>
      <form
        className="model-dialog model-add-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault()
          if (!trimmedId || duplicateId) return
          onSubmit({ capabilities, group, id, name })
        }}
      >
        <div className="model-dialog-head">
          <h2>{title}</h2>
          <IconButton icon={<X />} label="关闭" onClick={onClose} />
        </div>
        <label className="model-dialog-field is-required">
          <span>模型 ID</span>
          <input
            autoFocus
            value={id}
            placeholder="必填 例如 gpt-3.5-turbo"
            onChange={(event) => setId(event.target.value)}
          />
        </label>
        <label className="model-dialog-field">
          <span>模型名称</span>
          <input
            value={name}
            placeholder="例如 GPT-4"
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="model-dialog-field">
          <span>分组名称</span>
          <input
            value={group}
            placeholder="例如 ChatGPT"
            onChange={(event) => setGroup(event.target.value)}
          />
        </label>
        <fieldset className="model-dialog-capabilities">
          <legend>模型标签</legend>
          <div>
            {MODEL_CAPABILITY_OPTIONS.map((capability) => (
              <label key={capability}>
                <input
                  type="checkbox"
                  checked={capabilities.includes(capability)}
                  onChange={() => toggleCapability(capability)}
                />
                <span>{MODEL_CAPABILITY_LABELS[capability]}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {duplicateId && <small className="model-dialog-error">模型 ID 已存在</small>}
        <div className="model-dialog-actions">
          <button type="submit" disabled={!trimmedId || duplicateId}>
            {actionLabel}
          </button>
        </div>
      </form>
    </div>
  )
}
