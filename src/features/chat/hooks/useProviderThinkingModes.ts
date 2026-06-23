import { useState } from 'react'
import { normalizeThinkingMode } from '@/shared/model/thinking'
import type { ProviderConfig, ThinkingMode } from '@/shared/types'

export function useProviderThinkingModes() {
  const [thinkingModesByProvider, setThinkingModesByProvider] = useState<
    Record<string, ThinkingMode>
  >({})

  const setThinkingModeForProvider = (
    targetProvider: ProviderConfig | undefined,
    mode: ThinkingMode,
  ) => {
    if (!targetProvider) return
    setThinkingModesByProvider((current) => ({
      ...current,
      [targetProvider.id]: normalizeThinkingMode(targetProvider, mode),
    }))
  }

  return { setThinkingModeForProvider, thinkingModesByProvider }
}
