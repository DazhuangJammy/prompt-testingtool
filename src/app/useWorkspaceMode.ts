import { useEffect, useState } from 'react'
import type { WorkspaceMode } from '@/shared/types'

const workspaceModeStorageKey = 'prompt-workspace-mode'

export function resolveStoredWorkspaceMode(value: string | null): WorkspaceMode {
  return value === 'skills' || value === 'prompt' ? value : 'prompt'
}

function readWorkspaceMode(): WorkspaceMode {
  try {
    return resolveStoredWorkspaceMode(localStorage.getItem(workspaceModeStorageKey))
  } catch {
    return 'prompt'
  }
}

function writeWorkspaceMode(mode: WorkspaceMode) {
  try {
    localStorage.setItem(workspaceModeStorageKey, mode)
  } catch {
    // Storage can be unavailable in restricted browser modes.
  }
}

export function useWorkspaceMode() {
  const [workspaceMode, setWorkspaceMode] =
    useState<WorkspaceMode>(readWorkspaceMode)

  useEffect(() => {
    writeWorkspaceMode(workspaceMode)
  }, [workspaceMode])

  return [workspaceMode, setWorkspaceMode] as const
}
