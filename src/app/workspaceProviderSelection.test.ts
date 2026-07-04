import { beforeEach, describe, expect, it } from 'vitest'
import type { ProviderConfig } from '@/shared/types'
import {
  getActiveProviderStorageKey,
  readStoredActiveProviderId,
  resolveActiveSelectableProviderId,
  writeStoredActiveProviderId,
} from './workspaceProviderSelection'

const provider = (id: string) => ({ id } as ProviderConfig)

describe('workspace provider selection', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('restores the selected chat model provider after refresh', () => {
    writeStoredActiveProviderId(' provider::claude-sonnet-4-6 ')

    expect(
      window.localStorage.getItem(getActiveProviderStorageKey()),
    ).toBe('provider::claude-sonnet-4-6')
    expect(readStoredActiveProviderId()).toBe('provider::claude-sonnet-4-6')
  })

  it('falls back to the first available provider when the stored model is stale', () => {
    expect(
      resolveActiveSelectableProviderId(
        [provider('first::model-a'), provider('second::model-b')],
        'deleted::model-c',
      ),
    ).toBe('first::model-a')
  })

  it('uses the stored provider id when that model is still available', () => {
    expect(
      resolveActiveSelectableProviderId(
        [provider('first::model-a'), provider('second::model-b')],
        'second::model-b',
      ),
    ).toBe('second::model-b')
  })

  it('removes the stored provider id when selection is cleared', () => {
    writeStoredActiveProviderId('provider::model')
    writeStoredActiveProviderId(undefined)

    expect(window.localStorage.getItem(getActiveProviderStorageKey())).toBeNull()
    expect(readStoredActiveProviderId()).toBeUndefined()
  })
})
