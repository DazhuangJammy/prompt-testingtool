import { Lightbulb, MessageSquareText, Save, Settings2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { DefaultModelSettings, ProviderConfig } from '@/shared/types'
import {
  THINKING_OPTIONS,
  getThinkingCapability,
  normalizeThinkingMode,
} from '@/shared/model/thinking'
import { IconButton } from '@/shared/ui/IconButton'
import {
  createDefaultModelSettings,
  createFlowchartModelSettings,
  deriveEnabledModelOptions,
  resolveDefaultModelProvider,
  resolveDefaultModelOption,
} from '../model/defaultModelSettings'

interface DefaultModelSettingsPanelProps {
  flowchartSettings?: DefaultModelSettings
  providers: ProviderConfig[]
  settings?: DefaultModelSettings
  onSave: (settings: DefaultModelSettings) => void
}

interface DefaultModelCardConfig {
  assistantTitle: string
  description: string
  editorTitle: string
  emptySettings: () => DefaultModelSettings
  icon: 'flowchart' | 'prompt'
  label: string
  placeholder: string
  settings?: DefaultModelSettings
}

export function DefaultModelSettingsPanel({
  flowchartSettings,
  providers,
  settings,
  onSave,
}: DefaultModelSettingsPanelProps) {
  const cards: DefaultModelCardConfig[] = [
    {
      assistantTitle: '提示词优化助手',
      description: '优化整张提示词卡片或选中文本时使用的模型',
      editorTitle: '提示词优化助手',
      emptySettings: createDefaultModelSettings,
      icon: 'prompt',
      label: '提示词优化模型',
      placeholder: '写下提示词优化时的系统提示词',
      settings,
    },
    {
      assistantTitle: '流程图生成助手',
      description: '根据需求生成步骤、判断、提示词节点和连线时使用的模型',
      editorTitle: '流程图生成助手',
      emptySettings: createFlowchartModelSettings,
      icon: 'flowchart',
      label: '流程图模型',
      placeholder: '写下流程图生成时的系统提示词',
      settings: flowchartSettings,
    },
  ]

  return (
    <section className="default-model-panel">
      {cards.map((card) => (
        <DefaultModelCard
          key={card.label}
          config={card}
          providers={providers}
          onSave={onSave}
        />
      ))}
    </section>
  )
}

function DefaultModelCard({
  config,
  providers,
  onSave,
}: {
  config: DefaultModelCardConfig
  providers: ProviderConfig[]
  onSave: (settings: DefaultModelSettings) => void
}) {
  const normalizedSettings = useMemo(
    () => config.settings ?? config.emptySettings(),
    [config],
  )
  const modelOptions = useMemo(
    () => deriveEnabledModelOptions(providers),
    [providers],
  )
  const selectedOption = resolveDefaultModelOption(
    normalizedSettings,
    modelOptions,
  )
  const displayedOption = selectedOption ?? modelOptions[0]
  const displayedSettings = applyDisplayedModel(normalizedSettings, displayedOption)
  const displayedProvider = resolveDefaultModelProvider(providers, displayedSettings)
  const [editorOpen, setEditorOpen] = useState(false)

  const selectModel = (optionId: string) => {
    const option = modelOptions.find((item) => item.id === optionId)
    const nextSettings = {
      ...normalizedSettings,
      providerId: option?.providerId,
      modelId: option?.modelId,
    }
    const nextProvider = resolveDefaultModelProvider(providers, nextSettings)
    onSave({
      ...nextSettings,
      thinkingMode: normalizeThinkingMode(
        nextProvider,
        nextSettings.thinkingMode ?? 'off',
      ),
    })
  }

  return (
    <>
      <div className="default-model-card">
        <div className="default-model-card-head">
          {config.icon === 'flowchart'
            ? <Lightbulb size={20} />
            : <MessageSquareText size={20} />}
          <div>
            <h2>{config.label}</h2>
            <span>{config.description}</span>
          </div>
        </div>

        <div className="default-model-picker-row">
          <label className="default-model-select">
            <select
              aria-label={config.label}
              value={displayedOption?.id ?? ''}
              onChange={(event) => selectModel(event.target.value)}
            >
              {!displayedOption && <option value="">没有模型</option>}
              {modelOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <IconButton
            icon={<Settings2 />}
            label={`设置${config.label}`}
            onClick={() => setEditorOpen(true)}
          />
        </div>

        <p>
          只显示“模型服务”里已经开启的服务和模型。关闭服务或模型后，这里会自动失效。
        </p>
      </div>

      {editorOpen && (
        <DefaultModelEditorDialog
          config={config}
          provider={displayedProvider}
          settings={displayedSettings}
          onClose={() => setEditorOpen(false)}
          onSave={(next) => {
            onSave(next)
            setEditorOpen(false)
          }}
        />
      )}
    </>
  )
}

function applyDisplayedModel(
  settings: DefaultModelSettings,
  option?: { providerId: string; modelId: string },
): DefaultModelSettings {
  if (settings.providerId && settings.modelId) return settings
  return {
    ...settings,
    providerId: option?.providerId,
    modelId: option?.modelId,
  }
}

interface DefaultModelEditorDialogProps {
  config: DefaultModelCardConfig
  provider?: ProviderConfig
  settings: DefaultModelSettings
  onClose: () => void
  onSave: (settings: DefaultModelSettings) => void
}

function DefaultModelEditorDialog({
  config,
  provider,
  settings,
  onClose,
  onSave,
}: DefaultModelEditorDialogProps) {
  const [draft, setDraft] = useState(settings)
  const thinkingCapability = getThinkingCapability(provider)
  const thinkingMode = normalizeThinkingMode(
    provider,
    draft.thinkingMode ?? thinkingCapability.defaultMode,
  )
  const thinkingOptions = THINKING_OPTIONS.filter(
    (option) => thinkingCapability.supportsDeepMode || option.mode !== 'deep',
  )

  return (
    <div className="nested-dialog-backdrop" onMouseDown={onClose}>
      <form
        className="default-model-editor"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault()
          onSave({
            ...draft,
            thinkingMode: normalizeThinkingMode(provider, draft.thinkingMode ?? 'off'),
          })
        }}
      >
        <div className="default-model-editor-head">
          <h2>{config.editorTitle}</h2>
          <IconButton icon={<X />} label="关闭" onClick={onClose} />
        </div>

        <div className="default-model-editor-body">
          <label className="settings-field">
            <span>名称</span>
            <input
              autoFocus
              value={draft.assistantName}
              placeholder={config.assistantTitle}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  assistantName: event.target.value,
                }))
              }
            />
          </label>

          <label className="settings-field default-model-prompt-field">
            <span>提示词</span>
            <textarea
              value={draft.prompt}
              placeholder={config.placeholder}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  prompt: event.target.value,
                }))
              }
            />
          </label>

          {thinkingCapability.supportsThinking && (
            <fieldset className="default-model-thinking">
              <legend>
                <Lightbulb size={16} />
                思考模式
              </legend>
              <div className="default-model-thinking-options">
                {thinkingOptions.map((option) => (
                  <button
                    key={option.mode}
                    type="button"
                    className={option.mode === thinkingMode ? 'is-active' : ''}
                    aria-pressed={option.mode === thinkingMode}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        thinkingMode: normalizeThinkingMode(provider, option.mode),
                      }))
                    }
                  >
                    <span>{option.label}</span>
                    <small>{option.description}</small>
                  </button>
                ))}
              </div>
            </fieldset>
          )}
        </div>

        <div className="default-model-editor-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="primary-button">
            <Save size={17} />
            保存
          </button>
        </div>
      </form>
    </div>
  )
}
