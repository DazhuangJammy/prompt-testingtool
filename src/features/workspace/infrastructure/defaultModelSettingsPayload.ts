import type { ExportPayload } from '@/shared/types'

export function getImportedDefaultModelSettings(payload: ExportPayload) {
  if (payload.defaultModelSettingsList?.length) return payload.defaultModelSettingsList
  return payload.defaultModelSettings ? [payload.defaultModelSettings] : []
}
