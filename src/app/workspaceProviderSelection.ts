import type { ProviderConfig } from '@/shared/types'

const activeProviderStorageKey = 'prompt-active-provider-id'

export function getActiveProviderStorageKey() {
  return activeProviderStorageKey
}

export function normalizeStoredProviderId(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export function readStoredActiveProviderId() {
  try {
    return normalizeStoredProviderId(localStorage.getItem(activeProviderStorageKey))
  } catch {
    return undefined
  }
}

export function writeStoredActiveProviderId(providerId: string | undefined) {
  try {
    const normalizedProviderId = normalizeStoredProviderId(providerId)
    if (normalizedProviderId) {
      localStorage.setItem(activeProviderStorageKey, normalizedProviderId)
    } else {
      localStorage.removeItem(activeProviderStorageKey)
    }
  } catch {
    // Storage can be unavailable in restricted browser modes.
  }
}

export function resolveActiveSelectableProviderId(
  providers: ProviderConfig[],
  activeProviderId?: string,
) {
  const normalizedProviderId = normalizeStoredProviderId(activeProviderId)
  return normalizedProviderId &&
    providers.some((provider) => provider.id === normalizedProviderId)
    ? normalizedProviderId
    : providers[0]?.id
}
