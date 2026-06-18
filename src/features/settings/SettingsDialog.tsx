import { Box, Server, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { DefaultModelSettings, ProviderConfig } from '@/shared/types'
import { IconButton } from '@/shared/ui/IconButton'
import { AddProviderDialog } from './components/AddProviderDialog'
import { DefaultModelSettingsPanel } from './components/DefaultModelSettingsPanel'
import { ProviderDetailPanel } from './components/ProviderDetailPanel'
import { ProviderListPanel } from './components/ProviderListPanel'
import { normalizeProviderConfig } from './model/providerCatalog'

interface SettingsDialogProps {
  open: boolean
  defaultModelSettings?: DefaultModelSettings
  providers: ProviderConfig[]
  activeProviderId?: string
  onClose: () => void
  onSaveDefaultModelSettings: (settings: DefaultModelSettings) => void
  onReorderProviders: (providers: ProviderConfig[]) => void
  onSave: (provider: ProviderConfig) => void
  onDelete: (id: string) => void
  onSelect: (id: string) => void
}

const SETTING_CATEGORIES = [
  { id: 'models', label: '模型服务', icon: Server },
  { id: 'default-model', label: '默认模型', icon: Box },
] as const

type SettingCategoryId = (typeof SETTING_CATEGORIES)[number]['id']

export function SettingsDialog({
  open,
  defaultModelSettings,
  providers,
  activeProviderId,
  onClose,
  onSaveDefaultModelSettings,
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
          ) : (
            <main className="settings-main-panel">
              <DefaultModelSettingsPanel
                providers={normalizedProviders}
                settings={defaultModelSettings}
                onSave={onSaveDefaultModelSettings}
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
