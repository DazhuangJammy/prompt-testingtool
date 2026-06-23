import { useEffect, useState } from 'react'
import {
  getAppFontOption,
  normalizeAppFontId,
  type AppFontId,
} from '@/shared/model/appFont'

const appFontStorageKey = 'prompt-app-font-id'

function readAppFontId(): AppFontId {
  try {
    return normalizeAppFontId(localStorage.getItem(appFontStorageKey))
  } catch {
    return normalizeAppFontId(undefined)
  }
}

export function useAppFontSettings() {
  const [appFontId, setAppFontId] = useState(readAppFontId)

  useEffect(() => {
    const font = getAppFontOption(appFontId)
    document.documentElement.style.setProperty('--font', font.fontFamily)
    document.documentElement.style.setProperty('--serif', font.fontFamily)
    document.documentElement.dataset.font = appFontId

    try {
      localStorage.setItem(appFontStorageKey, appFontId)
    } catch {
      // Storage can be unavailable in restricted browser modes.
    }
  }, [appFontId])

  const updateAppFontId = (nextFontId: AppFontId) => {
    setAppFontId(normalizeAppFontId(nextFontId))
  }

  return {
    appFontId,
    updateAppFontId,
  }
}
