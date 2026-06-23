import {
  CheckCircle2,
  ChevronDown,
  Edit3,
  Eye,
  EyeOff,
  Minus,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { testProvider } from '@/shared/api/ai'
import type { ProviderConfig, ProviderModelConfig } from '@/shared/types'
import {
  MODEL_CAPABILITY_LABELS,
  getModelCapabilities,
} from '@/shared/model/providerModelCapabilities'
import { IconButton } from '@/shared/ui/IconButton'
import { nowIso } from '@/shared/utils/time'
import {
  normalizeProviderConfig,
  PROVIDER_TYPE_LABELS,
} from '../model/providerCatalog'
import { ModelFormDialog, type ModelFormValue } from './ModelFormDialog'

type AsyncState = 'idle' | 'busy' | 'ok' | 'error'

interface ProviderDetailPanelProps {
  provider?: ProviderConfig
  onDelete: (id: string) => void
  onSave: (provider: ProviderConfig) => void
}

export function ProviderDetailPanel({
  provider,
  onDelete,
  onSave,
}: ProviderDetailPanelProps) {
  const [draft, setDraft] = useState<ProviderConfig | undefined>(
    provider ? normalizeProviderConfig(provider) : undefined,
  )
  const [addModelOpen, setAddModelOpen] = useState(false)
  const [editingModelId, setEditingModelId] = useState<string>()
  const [keyVisible, setKeyVisible] = useState(false)
  const [selectedTestModelId, setSelectedTestModelId] = useState('')
  const [testDialogOpen, setTestDialogOpen] = useState(false)
  const [testState, setTestState] = useState<{
    status: AsyncState
    message: string
  }>({ status: 'idle', message: '' })

  const normalized = useMemo(
    () => (draft ? normalizeProviderConfig(draft) : undefined),
    [draft],
  )
  const previewUrl = normalized ? buildPreviewUrl(normalized.baseUrl) : ''

  if (!normalized) {
    return (
      <section className="provider-detail-empty">
        <span>选择一个模型服务</span>
      </section>
    )
  }

  const saveDraft = (nextDraft = normalized) => {
    const next = normalizeProviderConfig({
      ...nextDraft,
      updatedAt: nowIso(),
    })
    setDraft(next)
    onSave(next)
  }

  const updateDraft = (updates: Partial<ProviderConfig>) => {
    setDraft((current) =>
      current
        ? normalizeProviderConfig({
            ...current,
            ...updates,
          })
        : current,
    )
  }

  const updateModels = (models: ProviderModelConfig[]) => {
    updateDraft({ models })
  }

  const addModel = (model: ModelFormValue) => {
    const id = model.id.trim()
    if (!id) return
    const models = mergeModels(normalized.models ?? [], [
      {
        capabilities: model.capabilities,
        group: model.group?.trim() || undefined,
        id,
        name: model.name?.trim() || undefined,
        enabled: true,
      },
    ])
    saveDraft({ ...normalized, models })
  }

  const updateModel = (previousModelId: string, model: ModelFormValue) => {
    const id = model.id.trim()
    if (!id) return
    const models = (normalized.models ?? []).map((item) =>
      item.id === previousModelId
        ? {
            ...item,
            capabilities: model.capabilities,
            group: model.group?.trim() || undefined,
            id,
            name: model.name?.trim() || undefined,
          }
        : item,
    )
    saveDraft({
      ...normalized,
      model: normalized.model === previousModelId ? id : normalized.model,
      models,
    })
  }

  const toggleModel = (modelId: string) => {
    updateModels(
      (normalized.models ?? []).map((model) =>
        model.id === modelId ? { ...model, enabled: !model.enabled } : model,
      ),
    )
  }

  const removeModel = (modelId: string) => {
    updateModels((normalized.models ?? []).filter((model) => model.id !== modelId))
  }

  const runTest = async (modelId = normalized.model) => {
    setTestDialogOpen(false)
    setTestState({ status: 'busy', message: '检测中' })
    try {
      const message = await testProvider({ ...normalized, model: modelId })
      setTestState({ status: 'ok', message })
    } catch (error) {
      setTestState({
        status: 'error',
        message: error instanceof Error ? error.message : '检测失败',
      })
    }
  }

  const editingModel = normalized.models?.find(
    (model) => model.id === editingModelId,
  )

  return (
    <section className="provider-detail-panel">
      <div className="provider-detail-head">
        <div>
          <h2>{normalized.name}</h2>
          <span>{PROVIDER_TYPE_LABELS[normalized.type ?? 'custom']}</span>
        </div>
        <label className={`settings-switch ${normalized.enabled ? 'is-on' : ''}`}>
          <input
            type="checkbox"
            checked={normalized.enabled}
            onChange={(event) => {
              const next = { ...normalized, enabled: event.target.checked }
              setDraft(next)
              saveDraft(next)
            }}
          />
          <span />
        </label>
      </div>

      <div className="settings-field-grid">
        <label className="settings-field">
          <span>提供商名称</span>
          <input
            value={normalized.name}
            onChange={(event) => updateDraft({ name: event.target.value })}
          />
        </label>
        <label className="settings-field">
          <span>API 密钥</span>
          <div className="settings-input-action">
            <input
              value={normalized.apiKey}
              type={keyVisible ? 'text' : 'password'}
              onChange={(event) => updateDraft({ apiKey: event.target.value })}
            />
            <IconButton
              className="settings-key-toggle"
              icon={keyVisible ? <EyeOff /> : <Eye />}
              label={keyVisible ? '隐藏密钥' : '显示密钥'}
              onClick={() => setKeyVisible((value) => !value)}
            />
            <button
              type="button"
              className="settings-test-button"
              disabled={testState.status === 'busy'}
              onClick={() => {
                const modelId =
                  normalized.models?.find((model) => model.enabled)?.id ??
                  normalized.models?.[0]?.id ??
                  normalized.model
                setSelectedTestModelId(modelId)
                setTestDialogOpen(true)
              }}
            >
              检测
            </button>
          </div>
        </label>
        <label className="settings-field">
          <span>API 地址</span>
          <input
            value={normalized.baseUrl}
            onChange={(event) => updateDraft({ baseUrl: event.target.value })}
          />
          <small>预览：{previewUrl}</small>
        </label>
      </div>

      {testState.status !== 'idle' && (
        <div className="settings-status-row">
          <span className={`settings-status is-${testState.status}`}>
            {testState.message}
          </span>
        </div>
      )}

      <div className="model-list-head">
        <div>
          <strong>模型</strong>
          <span>{normalized.models?.length ?? 0}</span>
        </div>
        <IconButton
          className="model-add-button"
          icon={<Plus />}
          label="添加模型"
          onClick={() => setAddModelOpen(true)}
        />
      </div>

      <div className="provider-model-list">
        {(normalized.models ?? []).map((model) => (
          <div className="provider-model-row" key={model.id}>
            <label>
              <input
                type="checkbox"
                checked={model.enabled}
                onChange={() => toggleModel(model.id)}
              />
              <CheckCircle2 size={18} />
            </label>
            <div className="provider-model-main">
              <strong>{model.name || model.id}</strong>
              <div className="provider-model-meta">
                {model.group && <small>{model.group}</small>}
                <ModelCapabilityTags model={model} />
              </div>
            </div>
            <div className="provider-model-actions">
              <IconButton
                icon={<Edit3 />}
                label="编辑模型"
                onClick={() => setEditingModelId(model.id)}
              />
              <IconButton
                icon={<Minus />}
                label="移除模型"
                onClick={() => removeModel(model.id)}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="provider-detail-actions">
        <button type="button" className="danger-button" onClick={() => onDelete(normalized.id)}>
          <Trash2 size={17} />
          删除
        </button>
        <button type="button" className="primary-button" onClick={() => saveDraft()}>
          <Save size={17} />
          保存配置
        </button>
      </div>

      {addModelOpen && (
        <ModelFormDialog
          existingModelIds={(normalized.models ?? []).map((model) => model.id)}
          mode="add"
          onClose={() => setAddModelOpen(false)}
          onSubmit={(model) => {
            addModel(model)
            setAddModelOpen(false)
          }}
        />
      )}
      {editingModel && (
        <ModelFormDialog
          existingModelIds={(normalized.models ?? []).map((model) => model.id)}
          initialModel={editingModel}
          mode="edit"
          onClose={() => setEditingModelId(undefined)}
          onSubmit={(model) => {
            updateModel(editingModel.id, model)
            setEditingModelId(undefined)
          }}
        />
      )}
      <TestModelDialog
        open={testDialogOpen}
        provider={normalized}
        selectedModelId={selectedTestModelId}
        testing={testState.status === 'busy'}
        onCancel={() => setTestDialogOpen(false)}
        onChange={setSelectedTestModelId}
        onConfirm={() => void runTest(selectedTestModelId)}
      />
    </section>
  )
}

interface TestModelDialogProps {
  open: boolean
  provider: ProviderConfig
  selectedModelId: string
  testing: boolean
  onCancel: () => void
  onChange: (modelId: string) => void
  onConfirm: () => void
}

function TestModelDialog({
  open,
  provider,
  selectedModelId,
  testing,
  onCancel,
  onChange,
  onConfirm,
}: TestModelDialogProps) {
  const models = provider.models ?? []
  const fallbackModels = models.length
    ? models
    : provider.model
      ? [{ id: provider.model, enabled: true }]
      : []
  const selectedModel = fallbackModels.find((model) => model.id === selectedModelId)

  if (!open) return null

  return (
    <div className="nested-dialog-backdrop" onMouseDown={onCancel}>
      <div
        className="model-dialog test-model-dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="model-dialog-head">
          <h2>请选择要检测的模型</h2>
          <IconButton icon={<X />} label="关闭" onClick={onCancel} />
        </div>
        <label className="test-model-select">
          <select
            value={selectedModelId}
            onChange={(event) => onChange(event.target.value)}
          >
            {fallbackModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.id} | {provider.name}
              </option>
            ))}
          </select>
          <span className="test-model-preview">
            <span className="provider-initial">
              {(provider.name || selectedModel?.id || 'P').slice(0, 1).toUpperCase()}
            </span>
            <strong>{selectedModel?.id || '未选择模型'}</strong>
            <small>| {provider.name}</small>
            <ChevronDown size={20} />
          </span>
        </label>
        <div className="model-dialog-actions">
          <button type="button" onClick={onCancel}>
            取消
          </button>
          <button
            type="button"
            className="confirm-button"
            disabled={testing || !selectedModelId}
            onClick={onConfirm}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  )
}

function mergeModels(
  current: ProviderModelConfig[],
  incoming: ProviderModelConfig[],
) {
  const map = new Map(current.map((model) => [model.id, model]))
  for (const model of incoming) {
    const id = model.id.trim()
    if (!id || map.has(id)) continue
    map.set(id, {
      id,
      capabilities: model.capabilities,
      name: model.name?.trim() || undefined,
      group: model.group?.trim() || undefined,
      enabled: model.enabled !== false,
    })
  }
  return Array.from(map.values())
}

function ModelCapabilityTags({ model }: { model: ProviderModelConfig }) {
  const capabilities = getModelCapabilities(model)

  if (!capabilities.length) return null

  return (
    <span className="provider-model-tags">
      {capabilities.map((capability) => (
        <span key={capability}>{MODEL_CAPABILITY_LABELS[capability]}</span>
      ))}
    </span>
  )
}

function buildPreviewUrl(baseUrl: string) {
  const clean = baseUrl.trim().replace(/\/$/, '')
  if (!clean) return '/v1/chat/completions'
  if (clean.endsWith('/chat/completions')) return clean
  if (clean.endsWith('/v1')) return `${clean}/chat/completions`
  return `${clean}/v1/chat/completions`
}
