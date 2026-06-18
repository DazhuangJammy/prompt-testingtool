import { X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ProviderConfig, ProviderType } from '@/shared/types'
import { IconButton } from '@/shared/ui/IconButton'
import {
  createProviderFromType,
  PROVIDER_TYPE_LABELS,
  PROVIDER_TYPE_OPTIONS,
} from '../model/providerCatalog'

interface AddProviderDialogProps {
  open: boolean
  onClose: () => void
  onCreate: (provider: ProviderConfig) => void
}

export function AddProviderDialog({
  open,
  onClose,
  onCreate,
}: AddProviderDialogProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<ProviderType>('openai')
  const defaultName = PROVIDER_TYPE_LABELS[type]
  const canCreate = Boolean((name.trim() || defaultName).trim())
  const initial = useMemo(() => name.trim() || defaultName, [defaultName, name])

  if (!open) return null

  return (
    <div className="nested-dialog-backdrop" onMouseDown={onClose}>
      <form
        className="add-provider-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault()
          if (!canCreate) return
          onCreate(createProviderFromType(type, initial))
          setName('')
          setType('openai')
        }}
      >
        <div className="add-provider-head">
          <h2>添加提供商</h2>
          <IconButton icon={<X />} label="关闭" onClick={onClose} />
        </div>
        <div className="provider-avatar" aria-hidden="true">
          {(initial || 'P').slice(0, 1).toUpperCase()}
        </div>
        <label className="settings-field">
          <span>提供商名称</span>
          <input
            autoFocus
            value={name}
            placeholder={`例如 ${defaultName}`}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="settings-field">
          <span>提供商类型</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as ProviderType)}
          >
            {PROVIDER_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {PROVIDER_TYPE_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
        <div className="add-provider-actions">
          <button type="button" onClick={onClose}>
            取消
          </button>
          <button type="submit" disabled={!canCreate}>
            确定
          </button>
        </div>
      </form>
    </div>
  )
}
