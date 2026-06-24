import { Bot, Box, Keyboard, MoreHorizontal, Search, Server, X, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { QuickPhraseSettingsPanel } from '@/features/quick-phrases/components/QuickPhraseSettingsPanel'
import type {
  DefaultModelSettings,
  ProviderConfig,
  QuickPhrase,
  QuickPhraseGroup,
  SkillsLabSettings,
  WebSearchSettings,
} from '@/shared/types'
import type {
  CanvasTool,
  CanvasToolShortcuts,
} from '@/shared/model/canvasToolShortcuts'
import type { AppFontId } from '@/shared/model/appFont'
import type { SelectionMagnifierSettings } from '@/shared/model/selectionMagnifier'
import { IconButton } from '@/shared/ui/IconButton'
import { AddProviderDialog } from './components/AddProviderDialog'
import { DefaultModelSettingsPanel } from './components/DefaultModelSettingsPanel'
import { OtherSettingsPanel } from './components/OtherSettingsPanel'
import { ProviderDetailPanel } from './components/ProviderDetailPanel'
import { ProviderListPanel } from './components/ProviderListPanel'
import { SkillsLabSettingsPanel } from './components/SkillsLabSettingsPanel'
import { ShortcutSettingsPanel } from './components/ShortcutSettingsPanel'
import { normalizeProviderConfig } from './model/providerCatalog'
import { WebSearchSettingsPanel } from '@/features/web-search/components/WebSearchSettingsPanel'

interface SettingsDialogProps {
  open: boolean
  defaultModelSettings?: DefaultModelSettings
  flowchartModelSettings?: DefaultModelSettings
  canvasToolShortcuts: CanvasToolShortcuts
  appFontId: AppFontId
  selectionMagnifier: SelectionMagnifierSettings
  skillsLabSettings?: SkillsLabSettings
  webSearchSettings?: WebSearchSettings
  quickPhraseGroups: QuickPhraseGroup[]
  quickPhrases: QuickPhrase[]
  providers: ProviderConfig[]
  activeProviderId?: string
  onClose: () => void
  onAppFontChange: (fontId: AppFontId) => void
  onSelectionMagnifierChange: (settings: Partial<SelectionMagnifierSettings>) => void
  onResetCanvasToolShortcuts: () => void
  onSaveCanvasToolShortcut: (tool: CanvasTool, key: string) => void
  onSaveDefaultModelSettings: (settings: DefaultModelSettings) => void
  onSaveSkillsLabSettings: (settings: SkillsLabSettings) => void
  onSaveWebSearchSettings: (settings: WebSearchSettings) => void
  onReorderProviders: (providers: ProviderConfig[]) => void
  onSave: (provider: ProviderConfig) => void
  onDelete: (id: string) => void
  onSelect: (id: string) => void
}

const SETTING_CATEGORIES = [
  { id: 'models', label: '模型服务', icon: Server },
  { id: 'web-search', label: '网络搜索', icon: Search },
  { id: 'default-model', label: '默认模型', icon: Box },
  { id: 'skills-lab', label: 'Skills 设置', icon: Bot },
  { id: 'shortcuts', label: '快捷键设置', icon: Keyboard },
  { id: 'quick-phrases', label: '快捷短语', icon: Zap },
  { id: 'other', label: '其他设置', icon: MoreHorizontal },
] as const

type SettingCategoryId = (typeof SETTING_CATEGORIES)[number]['id']

export function SettingsDialog({
  open,
  defaultModelSettings,
  flowchartModelSettings,
  canvasToolShortcuts,
  appFontId,
  selectionMagnifier,
  skillsLabSettings,
  webSearchSettings,
  quickPhraseGroups,
  quickPhrases,
  providers,
  activeProviderId,
  onClose,
  onAppFontChange,
  onSelectionMagnifierChange,
  onResetCanvasToolShortcuts,
  onSaveCanvasToolShortcut,
  onSaveDefaultModelSettings,
  onSaveSkillsLabSettings,
  onSaveWebSearchSettings,
  onReorderProviders,
  onSave,
  onDelete,
  onSelect,
}: SettingsDialogProps) {
  const normalizedProviders = useMemo(
    () => providers.map(normalizeProviderConfig),
    [providers],
  )
  const [selectedProviderId, setSelectedProviderId] = useState<string>()
  const [activeCategory, setActiveCategory] = useState<SettingCategoryId>('models')
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const effectiveSelectedProviderId =
    normalizedProviders.find((provider) => provider.id === selectedProviderId)?.id ??
    normalizedProviders.find((provider) => provider.id === activeProviderId)?.id ??
    normalizedProviders[0]?.id
  const selectedProvider = normalizedProviders.find(
    (provider) => provider.id === effectiveSelectedProviderId,
  )

  if (!open) return null

  return (
    <div className="dialog-backdrop">
      <section className="settings-dialog">
        <div className="dialog-head">
          <span>设置</span>
          <IconButton icon={<X />} label="关闭" onClick={onClose} />
        </div>

        <div className="settings-layout">
          <nav className="settings-category-list" aria-label="设置分类">
            {SETTING_CATEGORIES.map((category) => {
              const Icon = category.icon
              return (
                <button
                  type="button"
                  key={category.id}
                  className={category.id === activeCategory ? 'is-active' : ''}
                  onClick={() => setActiveCategory(category.id)}
                >
                  <Icon size={19} />
                  <span>{category.label}</span>
                </button>
              )
            })}
          </nav>

          {activeCategory === 'models' ? (
            <>
              <ProviderListPanel
                activeProviderId={effectiveSelectedProviderId}
                providers={normalizedProviders}
                search={search}
                onAdd={() => setAddOpen(true)}
                onReorder={(nextProviders) => {
                  onReorderProviders(nextProviders)
                }}
                onSearchChange={setSearch}
                onSelect={(id) => {
                  setSelectedProviderId(id)
                  onSelect(id)
                }}
              />

              <ProviderDetailPanel
                key={selectedProvider?.id ?? 'empty-provider'}
                provider={selectedProvider}
                onDelete={(id) => {
                  const next = normalizedProviders.find(
                    (provider) => provider.id !== id,
                  )
                  onDelete(id)
                  setSelectedProviderId(next?.id)
                }}
                onSave={(provider) => {
                  onSave(provider)
                  setSelectedProviderId(provider.id)
                }}
              />
            </>
          ) : activeCategory === 'default-model' ? (
            <main className="settings-main-panel">
              <DefaultModelSettingsPanel
                flowchartSettings={flowchartModelSettings}
                providers={normalizedProviders}
                settings={defaultModelSettings}
                onSave={onSaveDefaultModelSettings}
              />
            </main>
          ) : activeCategory === 'web-search' ? (
            <WebSearchSettingsPanel
              settings={webSearchSettings}
              onSave={onSaveWebSearchSettings}
            />
          ) : activeCategory === 'skills-lab' ? (
            <main className="settings-main-panel skills-settings-page">
              <SkillsLabSettingsPanel
                settings={skillsLabSettings}
                onSave={onSaveSkillsLabSettings}
              />
            </main>
          ) : activeCategory === 'shortcuts' ? (
            <main className="settings-main-panel shortcut-settings-page">
              <ShortcutSettingsPanel
                shortcuts={canvasToolShortcuts}
                onReset={onResetCanvasToolShortcuts}
                onSaveShortcut={onSaveCanvasToolShortcut}
              />
            </main>
          ) : activeCategory === 'quick-phrases' ? (
            <main className="settings-main-panel quick-phrase-settings-page">
              <QuickPhraseSettingsPanel
                groups={quickPhraseGroups}
                phrases={quickPhrases}
              />
            </main>
          ) : (
            <main className="settings-main-panel other-settings-page">
              <OtherSettingsPanel
                appFontId={appFontId}
                selectionMagnifier={selectionMagnifier}
                onAppFontChange={onAppFontChange}
                onSelectionMagnifierChange={onSelectionMagnifierChange}
              />
            </main>
          )}
        </div>
      </section>

      <AddProviderDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreate={(provider) => {
          onSave(provider)
          setSelectedProviderId(provider.id)
          setAddOpen(false)
        }}
      />
    </div>
  )
}
