import type { WebSearchProviderId } from '@/shared/types'

export type WebSearchSettingsCheckState = {
  status: 'idle' | 'busy' | 'ok' | 'error'
  message: string
}

export type WebSearchSettingsSelection = 'general' | WebSearchProviderId
