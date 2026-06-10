import { useEffect, useState } from 'react'
import type { ThemeMode } from '@/shared/types'

const themeStorageKey = 'prompt-theme'

function readTheme(): ThemeMode {
  return (localStorage.getItem(themeStorageKey) as ThemeMode | null) ?? 'dark'
}

export function useThemeMode() {
  const [theme, setTheme] = useState<ThemeMode>(readTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(themeStorageKey, theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((value) => (value === 'dark' ? 'light' : 'dark'))
  }

  return { theme, toggleTheme }
}
