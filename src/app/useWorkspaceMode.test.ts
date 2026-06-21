import { beforeEach, describe, expect, it } from 'vitest'
import { resolveStoredWorkspaceMode } from './useWorkspaceMode'

describe('workspace mode persistence', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('restores the skills lab mode after refresh', () => {
    window.localStorage.setItem('prompt-workspace-mode', 'skills')

    expect(resolveStoredWorkspaceMode(window.localStorage.getItem('prompt-workspace-mode'))).toBe(
      'skills',
    )
  })

  it('falls back to the prompt workspace for stale stored values', () => {
    expect(resolveStoredWorkspaceMode('deleted-mode')).toBe('prompt')
  })
})
