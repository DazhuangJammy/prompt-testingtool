import { X } from 'lucide-react'
import { useState } from 'react'
import { testProvider } from '@/shared/api/ai'
import { nowIso } from '@/shared/utils/time'
import type { ProviderConfig } from '@/shared/types'
import { IconButton } from '@/shared/ui/IconButton'

interface SettingsDialogProps {
  open: boolean
  providers: ProviderConfig[]
  activeProviderId?: string
  onClose: () => void
  onSave: (provider: ProviderConfig) => void
  onDelete: (id: string) => void
  onSelect: (id: string) => void
}

const emptyProvider = (): ProviderConfig => {
  const at = nowIso()
  return {
    id: crypto.randomUUID(),
    name: '',
    baseUrl: 'https://api.openai.com',
    apiKey: '',
    model: 'gpt-4.1-mini',
    createdAt: at,
    updatedAt: at,
  }
}

function ProviderForm({
  initialProvider,
  onSave,
  onDelete,
}: {
  initialProvider: ProviderConfig
  onSave: (provider: ProviderConfig) => void
  onDelete: (id: string) => void
}) {
  const [draft, setDraft] = useState<ProviderConfig>(initialProvider)
  const [testState, setTestState] = useState<{
    status: 'idle' | 'busy' | 'ok' | 'error'
    message: string
  }>({ status: 'idle', message: '' })

  const runTest = async () => {
    setTestState({ status: 'busy', message: '测试中' })
    try {
      const message = await testProvider({
        ...draft,
        name: draft.name.trim() || draft.model,
      })
      setTestState({ status: 'ok', message })
    } catch (error) {
      setTestState({
        status: 'error',
        message: error instanceof Error ? error.message : '测试失败',
      })
    }
  }

  return (
    <form
      className="provider-form"
      onSubmit={(event) => {
        event.preventDefault()
        onSave({
          ...draft,
          name: draft.name.trim() || draft.model,
          updatedAt: nowIso(),
        })
      }}
    >
      <label>
        名称
        <input
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
        />
      </label>
      <label>
        Base URL
        <input
          value={draft.baseUrl}
          onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })}
        />
      </label>
      <label>
        API Key
        <input
          value={draft.apiKey}
          type="password"
          onChange={(event) => setDraft({ ...draft, apiKey: event.target.value })}
        />
      </label>
      <label>
        Model
        <input
          value={draft.model}
          onChange={(event) => setDraft({ ...draft, model: event.target.value })}
        />
      </label>

      <div className="form-actions">
        {testState.status !== 'idle' && (
          <div className={`test-result is-${testState.status}`}>
            {testState.message}
          </div>
        )}
        <button
          type="button"
          disabled={testState.status === 'busy'}
          onClick={runTest}
        >
          测试
        </button>
        <button type="button" onClick={() => onDelete(draft.id)}>
          删除
        </button>
        <button type="submit">保存</button>
      </div>
    </form>
  )
}

export function SettingsDialog({
  open,
  providers,
  activeProviderId,
  onClose,
  onSave,
  onDelete,
  onSelect,
}: SettingsDialogProps) {
  const [newDraftKey, setNewDraftKey] = useState(0)
  const [editingNew, setEditingNew] = useState(false)
  const active = providers.find((provider) => provider.id === activeProviderId)
  const formProvider = editingNew ? emptyProvider() : (active ?? emptyProvider())
  const formKey = editingNew ? `new-${newDraftKey}` : (active?.id ?? 'new-empty')

  if (!open) return null

  return (
    <div className="dialog-backdrop">
      <section className="settings-dialog">
        <div className="dialog-head">
          <span>设置</span>
          <IconButton icon={<X />} label="关闭" onClick={onClose} />
        </div>

        <div className="settings-grid">
          <div className="provider-list">
            {providers.map((provider) => (
              <button
                type="button"
                className={provider.id === activeProviderId ? 'is-active' : ''}
                key={provider.id}
                onClick={() => {
                  setEditingNew(false)
                  onSelect(provider.id)
                }}
              >
                {provider.name || provider.model}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setEditingNew(true)
                setNewDraftKey((key) => key + 1)
              }}
            >
              +
            </button>
          </div>

          <ProviderForm
            key={formKey}
            initialProvider={formProvider}
            onDelete={onDelete}
            onSave={(provider) => {
              setEditingNew(false)
              onSave(provider)
            }}
          />
        </div>
      </section>
    </div>
  )
}
