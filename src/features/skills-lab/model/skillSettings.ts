import type { SkillsLabSettings } from '@/shared/types'
import { nowIso } from '@/shared/utils/time'

export const SKILLS_LAB_SETTINGS_ID = 'skills-lab'

export function createDefaultSkillsLabSettings(): SkillsLabSettings {
  const at = nowIso()

  return {
    id: SKILLS_LAB_SETTINGS_ID,
    defaultTool: 'codex',
    toolCommand: 'codex',
    defaultSkillsDirectory: '',
    autoRunChecks: false,
    requireChangeConfirmation: true,
    permissionMode: 'read-only',
    createdAt: at,
    updatedAt: at,
  }
}

export function normalizeSkillsLabSettings(
  settings?: Partial<SkillsLabSettings>,
): SkillsLabSettings {
  const fallback = createDefaultSkillsLabSettings()

  return {
    ...fallback,
    ...settings,
    id: SKILLS_LAB_SETTINGS_ID,
    defaultTool: settings?.defaultTool ?? fallback.defaultTool,
    toolCommand: settings?.toolCommand?.trim() || fallback.toolCommand,
    defaultSkillsDirectory: settings?.defaultSkillsDirectory?.trim() ?? '',
    autoRunChecks: Boolean(settings?.autoRunChecks),
    requireChangeConfirmation: settings?.requireChangeConfirmation ?? true,
    permissionMode: settings?.permissionMode ?? 'read-only',
    createdAt: settings?.createdAt ?? fallback.createdAt,
    updatedAt: settings?.updatedAt ?? fallback.updatedAt,
  }
}
