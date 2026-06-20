import { useEffect, useState } from 'react'
import {
  defaultSelectionMagnifierSettings,
  normalizeSelectionMagnifierSettings,
  type SelectionMagnifierSettings,
} from '@/shared/model/selectionMagnifier'

const selectionMagnifierStorageKey = 'prompt-selection-magnifier-settings'

function readSelectionMagnifierSettings(): SelectionMagnifierSettings {
  try {
    return normalizeSelectionMagnifierSettings(
      JSON.parse(localStorage.getItem(selectionMagnifierStorageKey) ?? '{}'),
    )
  } catch {
    return defaultSelectionMagnifierSettings
  }
}

export function useSelectionMagnifierSettings() {
  const [settings, setSettings] = useState(readSelectionMagnifierSettings)

  useEffect(() => {
    try {
      localStorage.setItem(selectionMagnifierStorageKey, JSON.stringify(settings))
    } catch {
      // Storage can be unavailable in restricted browser modes.
    }
  }, [settings])

  const updateSettings = (updates: Partial<SelectionMagnifierSettings>) => {
    setSettings((current) =>
      normalizeSelectionMagnifierSettings({ ...current, ...updates }),
    )
  }

  return {
    selectionMagnifierSettings: settings,
    updateSelectionMagnifierSettings: updateSettings,
  }
}
