import { CreateSkillDialog } from '@/features/skills-lab/components/CreateSkillDialog'
import { SkillPathDialog } from '@/features/skills-lab/components/SkillPathDialog'
import { SettingsDialog } from '@/features/settings/SettingsDialog'
import { SelectionMagnifierOverlay } from '@/features/settings/components/SelectionMagnifierOverlay'
import { defaultModelSettingsRepository } from '@/features/settings/infrastructure/defaultModelSettingsRepository'
import { providerRepository } from '@/features/settings/infrastructure/providerRepository'
import { webSearchSettingsRepository } from '@/features/web-search/infrastructure/webSearchSettingsRepository'
import {
  buildSelectableProviderId,
  normalizeProviderConfig,
} from '@/features/settings/model/providerCatalog'
import { skillsLabRepository } from '@/features/skills-lab/infrastructure/skillsLabRepository'
import type { SkillsLabSettings, SkillTopic } from '@/shared/types'
import type { useAppFontSettings } from './useAppFontSettings'
import type { useCanvasToolShortcutSettings } from './useCanvasToolShortcutSettings'
import type { useSelectionMagnifierSettings } from './useSelectionMagnifierSettings'
import type { useWorkspaceData } from './useWorkspaceData'

interface AppOverlaysProps {
  appFont: ReturnType<typeof useAppFontSettings>
  canvasToolShortcuts: ReturnType<typeof useCanvasToolShortcutSettings>
  createSkillBusy: boolean
  createSkillTopic?: SkillTopic
  onBindSkillPath: (topicId: string, skillPath: string) => void
  onCloseCreateSkill: () => void
  onCloseSettings: () => void
  onCloseSkillPath: () => void
  onCreateSkill: (prompt: string) => void
  selectionMagnifier: ReturnType<typeof useSelectionMagnifierSettings>
  settingsOpen: boolean
  skillPathTopic?: SkillTopic
  skillsLabSettings?: SkillsLabSettings
  workspace: ReturnType<typeof useWorkspaceData>
}

export function AppOverlays({
  appFont,
  canvasToolShortcuts,
  createSkillBusy,
  createSkillTopic,
  onBindSkillPath,
  onCloseCreateSkill,
  onCloseSettings,
  onCloseSkillPath,
  onCreateSkill,
  selectionMagnifier,
  settingsOpen,
  skillPathTopic,
  skillsLabSettings,
  workspace,
}: AppOverlaysProps) {
  return (
    <>
      {selectionMagnifier.selectionMagnifierSettings.enabled && (
        <SelectionMagnifierOverlay
          settings={selectionMagnifier.selectionMagnifierSettings}
        />
      )}

      <SettingsDialog
        open={settingsOpen}
        appFontId={appFont.appFontId}
        defaultModelSettings={workspace.defaultModelSettings}
        flowchartModelSettings={workspace.flowchartModelSettings}
        canvasToolShortcuts={canvasToolShortcuts.shortcuts}
        selectionMagnifier={selectionMagnifier.selectionMagnifierSettings}
        skillsLabSettings={skillsLabSettings}
        webSearchSettings={workspace.webSearchSettings}
        quickPhraseGroups={workspace.quickPhraseGroups}
        quickPhrases={workspace.quickPhrases}
        providers={workspace.providerConfigs}
        activeProviderId={workspace.effectiveProviderConfigId}
        onClose={onCloseSettings}
        onAppFontChange={appFont.updateAppFontId}
        onSelectionMagnifierChange={selectionMagnifier.updateSelectionMagnifierSettings}
        onResetCanvasToolShortcuts={canvasToolShortcuts.resetShortcuts}
        onSelect={() => undefined}
        onSaveCanvasToolShortcut={canvasToolShortcuts.setShortcut}
        onSaveDefaultModelSettings={async (settings) => {
          await defaultModelSettingsRepository.save(settings)
        }}
        onSaveSkillsLabSettings={async (settings) => {
          await skillsLabRepository.saveSettings(settings)
        }}
        onSaveWebSearchSettings={async (settings) => {
          await webSearchSettingsRepository.save(settings)
        }}
        onReorderProviders={async (providers) => {
          await Promise.all(providers.map((provider) => providerRepository.save(provider)))
        }}
        onDelete={async (id) => {
          await providerRepository.delete(id)
          if (workspace.activeProvider?.sourceProviderId === id) {
            workspace.setActiveProviderId(undefined)
          }
        }}
        onSave={async (provider) => {
          const normalized = normalizeProviderConfig(provider)
          await providerRepository.save(normalized)
          if (normalized.enabled && normalized.model) {
            workspace.setActiveProviderId(
              buildSelectableProviderId(normalized.id, normalized.model),
            )
          }
        }}
      />

      <SkillPathDialog
        open={Boolean(skillPathTopic)}
        settings={skillsLabSettings}
        onClose={onCloseSkillPath}
        onSelect={(skillPath) => {
          if (skillPathTopic) onBindSkillPath(skillPathTopic.id, skillPath)
        }}
      />
      <CreateSkillDialog
        busy={createSkillBusy}
        open={Boolean(createSkillTopic)}
        onClose={onCloseCreateSkill}
        onCreate={onCreateSkill}
      />
    </>
  )
}
